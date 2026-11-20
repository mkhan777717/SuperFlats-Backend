// utils/videoProcessor.js
//
// Takes an uploaded video in any format, compresses + converts it to MP4 (H.264/AAC),
// creates a thumbnail, uploads both to Firebase Storage and updates the `videos` row.
//
// Conversion is CPU heavy, so jobs run through a small in-process queue (one at a time
// by default). The upload API only validates and enqueues; it never waits for ffmpeg.

const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const db = require('../models');
const { bucket } = require('../config/firebase');
const logger = require('./logger');

// -------------------- Config --------------------
const MB = 1024 * 1024;
const config = {
    maxUploadBytes: Number(process.env.VIDEO_MAX_UPLOAD_MB || 500) * MB,
    maxDurationSec: Number(process.env.VIDEO_MAX_DURATION_SEC || 180),
    maxPerEntity: Number(process.env.VIDEO_MAX_PER_ENTITY || 5),
    maxShortSide: Number(process.env.VIDEO_MAX_SHORT_SIDE || 720), // 720p
    maxFps: Number(process.env.VIDEO_MAX_FPS || 30),
    crf: Number(process.env.VIDEO_CRF || 26), // 23 = better quality / bigger, 28 = smaller
    preset: process.env.VIDEO_PRESET || 'veryfast',
    audioBitrate: process.env.VIDEO_AUDIO_BITRATE || '128k',
    concurrency: Number(process.env.VIDEO_CONCURRENCY || 1),
    ffmpegTimeoutMs: Number(process.env.VIDEO_FFMPEG_TIMEOUT_MIN || 20) * 60 * 1000,
};

// Where multer stores raw uploads and where ffmpeg writes its output.
const TEMP_DIR = path.join(os.tmpdir(), 'superflats-videos');
fs.mkdirSync(TEMP_DIR, { recursive: true });

// -------------------- ffmpeg / ffprobe binaries --------------------
// Prefer an explicit path (Docker sets these to the system ffmpeg), then the npm static
// binaries, then whatever is on PATH.
const resolveBinary = (envVar, staticPathFn, fallback) => {
    if (process.env[envVar]) return process.env[envVar];
    try {
        const p = staticPathFn();
        if (p && fs.existsSync(p)) return p;
    } catch (_) { /* package not installed */ }
    return fallback;
};

const FFMPEG = resolveBinary('FFMPEG_PATH', () => require('ffmpeg-static'), 'ffmpeg');
const FFPROBE = resolveBinary('FFPROBE_PATH', () => require('ffprobe-static').path, 'ffprobe');

/**
 * Runs a binary and resolves with stdout. Rejects with the last part of stderr on failure.
 */
const run = (bin, args, { timeoutMs = config.ffmpegTimeoutMs } = {}) => new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => {
        stderr += d;
        if (stderr.length > 20000) stderr = stderr.slice(-10000); // ffmpeg is chatty, keep the tail
    });

    const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`${path.basename(bin)} timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);

    child.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(`Could not start ${path.basename(bin)}: ${err.message}`));
    });
    child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) return resolve(stdout);
        const tail = stderr.trim().split('\n').slice(-5).join(' | ');
        reject(new Error(`${path.basename(bin)} exited with code ${code}: ${tail}`));
    });
});

// -------------------- Probe --------------------
/**
 * Reads stream info from a file. Used to reject non-videos before we accept the upload.
 * @returns {{ hasVideo: boolean, hasAudio: boolean, durationSec: number|null, width: number|null,
 *             height: number|null, videoCodec: string|null, audioCodec: string|null, formatName: string }}
 */
const probe = async (filePath) => {
    const out = await run(FFPROBE, [
        '-v', 'error',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath,
    ], { timeoutMs: 60 * 1000 });

    const info = JSON.parse(out || '{}');
    const streams = info.streams || [];
    // Cover art in audio files shows up as a 1-frame "video" stream; ignore it.
    const video = streams.find((s) => s.codec_type === 'video' && !(s.disposition && s.disposition.attached_pic));
    const audio = streams.find((s) => s.codec_type === 'audio');

    const duration = parseFloat((info.format && info.format.duration) || (video && video.duration));

    return {
        hasVideo: Boolean(video),
        hasAudio: Boolean(audio),
        durationSec: Number.isFinite(duration) ? duration : null,
        width: video ? video.width : null,
        height: video ? video.height : null,
        videoCodec: video ? video.codec_name : null,
        audioCodec: audio ? audio.codec_name : null,
        formatName: (info.format && info.format.format_name) || '',
    };
};

// -------------------- Compress + convert --------------------
// Scale so the SHORT side is at most maxShortSide (works for landscape and portrait),
// never upscale, keep even dimensions (required by H.264).
const scaleFilter = () => {
    const s = config.maxShortSide;
    return `scale='if(gt(iw,ih),-2,min(${s},iw))':'if(gt(iw,ih),min(${s},ih),-2)'`;
};

/**
 * Compresses any input video into a web-friendly MP4.
 * ffmpeg auto-applies phone rotation metadata, so portrait videos stay upright.
 */
const transcodeToMp4 = (input, output) => run(FFMPEG, [
    '-hide_banner', '-y',
    '-i', input,
    '-t', String(config.maxDurationSec + 1), // safety cap if the duration was unknown
    '-map', '0:v:0', '-map', '0:a:0?', // first video + first audio (if any)
    '-vf', scaleFilter(),
    '-fpsmax', String(config.maxFps), // 60fps -> 30fps, lower fps left alone
    '-c:v', 'libx264', '-preset', config.preset, '-crf', String(config.crf),
    '-profile:v', 'high', '-pix_fmt', 'yuv420p', // plays on every phone / browser
    '-c:a', 'aac', '-b:a', config.audioBitrate, '-ac', '2',
    '-map_metadata', '-1', // strip metadata (e.g. GPS location from phones)
    '-movflags', '+faststart', // playback can start before the whole file downloads
    output,
]);

/**
 * Re-wraps an already web-compatible MP4 without re-encoding (fast, no quality loss),
 * just to add faststart and strip metadata.
 */
const remuxMp4 = (input, output) => run(FFMPEG, [
    '-hide_banner', '-y',
    '-i', input,
    '-map', '0:v:0', '-map', '0:a:0?',
    '-c', 'copy',
    '-map_metadata', '-1',
    '-movflags', '+faststart',
    output,
]);

const createThumbnail = (input, output, atSec) => run(FFMPEG, [
    '-hide_banner', '-y',
    '-ss', String(atSec),
    '-i', input,
    '-frames:v', '1',
    '-vf', scaleFilter(),
    '-q:v', '3',
    output,
], { timeoutMs: 60 * 1000 });

const isWebCompatibleMp4 = (p) =>
    p.formatName.includes('mp4') &&
    p.videoCodec === 'h264' &&
    (!p.hasAudio || p.audioCodec === 'aac');

// -------------------- Firebase helpers --------------------
const buildDownloadUrl = (storagePath, token) =>
    `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;

const uploadToBucket = async (localPath, storagePath, contentType) => {
    const token = crypto.randomUUID();
    await bucket.upload(localPath, {
        destination: storagePath,
        resumable: true, // safer for big files
        metadata: {
            contentType,
            cacheControl: 'public, max-age=31536000',
            metadata: { firebaseStorageDownloadTokens: token },
        },
    });
    return buildDownloadUrl(storagePath, token);
};

const thumbnailPathFor = (storagePath) => storagePath.replace(/\.mp4$/, '.jpg');

const deleteFromBucket = async (storagePath) => {
    try {
        await bucket.file(storagePath).delete({ ignoreNotFound: true });
    } catch (err) {
        logger.warn(`[VIDEO] Failed to delete ${storagePath} from storage: ${err.message}`);
    }
};

/** Deletes the MP4 and thumbnail of a video from Firebase. Never throws. */
const deleteVideoFiles = async (video) => {
    if (!video || !video.storage_path) return;
    await Promise.all([
        deleteFromBucket(video.storage_path),
        deleteFromBucket(thumbnailPathFor(video.storage_path)),
    ]);
};

/**
 * Removes all videos (files + rows) that belong to an entity. Used when a property or flat is deleted.
 * @param {'Property'|'Flat'} type
 * @param {number|number[]} ids
 */
const deleteVideosFor = async (type, ids, transaction) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    if (idList.length === 0) return;
    const where = { videoable_type: type, videoable_id: idList };
    const videos = await db.Video.findAll({ where, transaction });
    await Promise.allSettled(videos.map(deleteVideoFiles));
    await db.Video.destroy({ where, transaction });
};

const newStoragePath = (type, id) => `videos/${type}/${id}/${crypto.randomUUID()}.mp4`;

const safeUnlink = async (p) => {
    if (!p) return;
    try { await fsp.unlink(p); } catch (_) { /* already gone */ }
};

// -------------------- Job --------------------
/**
 * Full pipeline for one uploaded video.
 * @param {number} videoId - id of the `videos` row (status = processing)
 * @param {string} inputPath - raw uploaded file on disk (deleted when done)
 * @param {object} probeInfo - result of probe() on the raw file
 */
const processVideo = async (videoId, inputPath, probeInfo) => {
    const base = path.join(TEMP_DIR, `${videoId}-${crypto.randomUUID()}`);
    const outputPath = `${base}.mp4`;
    const remuxPath = `${base}-copy.mp4`;
    const thumbPath = `${base}.jpg`;
    let uploadedPath = null;
    const started = Date.now();

    try {
        const video = await db.Video.findByPk(videoId);
        if (!video) {
            logger.info(`[VIDEO] Video ${videoId} was deleted before processing started, skipping.`);
            return;
        }

        // 1. Compress + convert
        await transcodeToMp4(inputPath, outputPath);
        let finalPath = outputPath;

        // 2. If our output is bigger than an input that was already a web-ready MP4 within limits,
        //    keep the original stream (just remuxed) instead.
        const [inStat, outStat] = await Promise.all([fsp.stat(inputPath), fsp.stat(outputPath)]);
        const withinLimits = Math.min(probeInfo.width || 0, probeInfo.height || 0) <= config.maxShortSide
            && (probeInfo.durationSec || Infinity) <= config.maxDurationSec;
        if (outStat.size >= inStat.size && isWebCompatibleMp4(probeInfo) && withinLimits) {
            try {
                await remuxMp4(inputPath, remuxPath);
                finalPath = remuxPath;
                logger.info(`[VIDEO] ${videoId}: original was smaller and already MP4/H.264, kept original stream.`);
            } catch (err) {
                logger.warn(`[VIDEO] ${videoId}: remux failed, using transcoded file: ${err.message}`);
            }
        }

        // 3. Read final duration/size, make thumbnail
        const finalInfo = await probe(finalPath);
        const finalStat = await fsp.stat(finalPath);
        const thumbAt = finalInfo.durationSec ? Math.min(1, finalInfo.durationSec / 2) : 0;
        let hasThumb = true;
        try {
            await createThumbnail(finalPath, thumbPath, thumbAt);
        } catch (err) {
            hasThumb = false;
            logger.warn(`[VIDEO] ${videoId}: thumbnail failed: ${err.message}`);
        }

        // 4. Upload to Firebase
        uploadedPath = video.storage_path;
        const videoUrl = await uploadToBucket(finalPath, video.storage_path, 'video/mp4');
        const thumbnailUrl = hasThumb
            ? await uploadToBucket(thumbPath, thumbnailPathFor(video.storage_path), 'image/jpeg')
            : null;

        // 5. Mark ready (the row may have been deleted while we were working)
        const [updated] = await db.Video.update({
            status: 'ready',
            video_url: videoUrl,
            thumbnail_url: thumbnailUrl,
            mime_type: 'video/mp4',
            size_bytes: finalStat.size,
            duration_sec: finalInfo.durationSec != null ? Math.round(finalInfo.durationSec) : null,
            error_message: null,
        }, { where: { id: videoId } });

        if (!updated) {
            logger.info(`[VIDEO] Video ${videoId} was deleted during processing, removing uploaded files.`);
            await deleteVideoFiles({ storage_path: uploadedPath });
            return;
        }

        const ratio = ((1 - finalStat.size / inStat.size) * 100).toFixed(0);
        logger.info(`[VIDEO] ${videoId} ready in ${((Date.now() - started) / 1000).toFixed(1)}s: `
            + `${(inStat.size / MB).toFixed(1)}MB -> ${(finalStat.size / MB).toFixed(1)}MB (${ratio}% smaller)`);
    } catch (err) {
        logger.error(`[VIDEO] Processing failed for video ${videoId}: ${err.message}`);
        if (uploadedPath) await deleteVideoFiles({ storage_path: uploadedPath });
        await db.Video.update(
            { status: 'failed', error_message: String(err.message).slice(0, 500) },
            { where: { id: videoId } },
        ).catch((e) => logger.error(`[VIDEO] Could not mark video ${videoId} as failed: ${e.message}`));
    } finally {
        await Promise.all([inputPath, outputPath, remuxPath, thumbPath].map(safeUnlink));
    }
};

// -------------------- Queue --------------------
const queue = [];
let running = 0;

const pump = () => {
    while (running < config.concurrency && queue.length > 0) {
        const job = queue.shift();
        running += 1;
        processVideo(job.videoId, job.inputPath, job.probeInfo)
            .finally(() => {
                running -= 1;
                pump();
            });
    }
};

/** Adds a video to the processing queue and returns immediately. */
const enqueue = (videoId, inputPath, probeInfo) => {
    queue.push({ videoId, inputPath, probeInfo });
    logger.info(`[VIDEO] Queued video ${videoId} (queue length: ${queue.length}, running: ${running})`);
    pump();
};

/**
 * On server start: any row still 'processing' lost its job when the server stopped,
 * so mark it failed and clear leftover temp files.
 */
const recoverStuckVideos = async () => {
    try {
        const [count] = await db.Video.update(
            { status: 'failed', error_message: 'Server restarted while the video was processing. Please upload again.' },
            { where: { status: 'processing' } },
        );
        if (count) logger.warn(`[VIDEO] Marked ${count} interrupted video(s) as failed.`);

        const leftovers = await fsp.readdir(TEMP_DIR);
        await Promise.all(leftovers.map((f) => safeUnlink(path.join(TEMP_DIR, f))));
    } catch (err) {
        logger.error(`[VIDEO] Startup recovery failed: ${err.message}`);
    }
};

module.exports = {
    config,
    TEMP_DIR,
    probe,
    enqueue,
    newStoragePath,
    deleteVideoFiles,
    deleteVideosFor,
    recoverStuckVideos,
    safeUnlink,
    // exported for testing
    transcodeToMp4,
    createThumbnail,
};
