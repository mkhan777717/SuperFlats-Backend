// controllers/video.controller.js

const { Op } = require('sequelize');
const db = require('../models');
const logger = require('../utils/logger');
const videoProcessor = require('../utils/videoProcessor');

const Video = db.Video;
const ENTITY_MODELS = { Property: db.Property, Flat: db.Flat };

const isSameCompany = (user, entity) =>
    Boolean(user && user.employee && entity && entity.company_id === user.employee.company_id);

/** Public shape of a video in API responses. */
const serialize = (video) => ({
    id: video.id,
    videoable_type: video.videoable_type,
    videoable_id: video.videoable_id,
    title: video.title,
    status: video.status,
    video_url: video.video_url,
    thumbnail_url: video.thumbnail_url,
    duration_sec: video.duration_sec,
    size_bytes: video.size_bytes != null ? Number(video.size_bytes) : null,
    is_primary: video.is_primary,
    original_filename: video.original_filename,
    error_message: video.error_message,
    created_at: video.created_at,
    updated_at: video.updated_at,
});

/**
 * POST /properties/:id/videos  and  POST /flats/:id/videos
 * multipart/form-data: video (file, any format), title (optional text)
 *
 * Validates the file, creates a `videos` row with status 'processing' and queues
 * compression/conversion. Responds 202 right away; poll GET /videos/:videoId for the result.
 */
exports.uploadVideo = (type) => async (req, res) => {
    const tempPath = req.file && req.file.path;
    let handedOff = false; // once queued, the processor owns (and deletes) the temp file

    try {
        if (!req.file) {
            return res.status(400).json({ message: 'A video file is required in the "video" field.' });
        }

        const entityId = parseInt(req.params.id, 10);
        const entity = Number.isInteger(entityId)
            ? await ENTITY_MODELS[type].findByPk(entityId, { attributes: ['id', 'company_id'] })
            : null;
        if (!entity) {
            return res.status(404).json({ message: `${type} not found.` });
        }
        if (!isSameCompany(req.user, entity)) {
            return res.status(403).json({ message: `You are not authorized to add videos to this ${type.toLowerCase()}.` });
        }

        const activeCount = await Video.count({
            where: { videoable_type: type, videoable_id: entityId, status: { [Op.in]: ['processing', 'ready'] } },
        });
        if (activeCount >= videoProcessor.config.maxPerEntity) {
            return res.status(400).json({
                message: `Maximum of ${videoProcessor.config.maxPerEntity} videos allowed per ${type.toLowerCase()}.`,
            });
        }

        // Make sure it really is a video (not a renamed file) and check its length.
        let info;
        try {
            info = await videoProcessor.probe(tempPath);
        } catch (err) {
            logger.warn(`[VIDEO] ffprobe rejected upload ${req.file.originalname}: ${err.message}`);
            return res.status(400).json({ message: 'The uploaded file is not a valid or supported video.' });
        }
        if (!info.hasVideo) {
            return res.status(400).json({ message: 'The uploaded file does not contain a video stream.' });
        }
        if (info.durationSec != null && info.durationSec > videoProcessor.config.maxDurationSec + 0.5) {
            return res.status(400).json({
                message: `Video is too long (${Math.round(info.durationSec)}s). Maximum allowed length is ${videoProcessor.config.maxDurationSec}s.`,
            });
        }

        const video = await Video.create({
            videoable_type: type,
            videoable_id: entityId,
            storage_path: videoProcessor.newStoragePath(type, entityId),
            title: req.body && req.body.title ? String(req.body.title).slice(0, 255) : null,
            original_filename: (req.file.originalname || '').slice(0, 255) || null,
            duration_sec: info.durationSec != null ? Math.round(info.durationSec) : null,
            is_primary: activeCount === 0,
            status: 'processing',
        });

        videoProcessor.enqueue(video.id, tempPath, info);
        handedOff = true;

        logger.info(`[VIDEO] Upload accepted: video ${video.id} for ${type} ${entityId} by user ${req.user.id}`);
        return res.status(202).json({
            message: 'Video uploaded. It is being compressed and converted to MP4.',
            video: serialize(video),
        });
    } catch (error) {
        logger.error(`[VIDEO] Error uploading video for ${type} ${req.params.id}:`, error);
        return res.status(500).json({ error: 'Internal server error.' });
    } finally {
        if (!handedOff) await videoProcessor.safeUnlink(tempPath);
    }
};

/**
 * GET /properties/:id/videos  and  GET /flats/:id/videos
 * Everyone logged in sees 'ready' videos. Members of the owning company also see
 * 'processing' and 'failed' ones so the admin app can show progress / errors.
 */
exports.listVideos = (type) => async (req, res) => {
    try {
        const entityId = parseInt(req.params.id, 10);
        const entity = Number.isInteger(entityId)
            ? await ENTITY_MODELS[type].findByPk(entityId, { attributes: ['id', 'company_id'] })
            : null;
        if (!entity) {
            return res.status(404).json({ message: `${type} not found.` });
        }

        const where = { videoable_type: type, videoable_id: entityId };
        if (!isSameCompany(req.user, entity)) where.status = 'ready';

        const videos = await Video.findAll({
            where,
            order: [['is_primary', 'DESC'], ['id', 'ASC']],
        });
        return res.status(200).json({ videos: videos.map(serialize) });
    } catch (error) {
        logger.error(`[VIDEO] Error listing videos for ${type} ${req.params.id}:`, error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

/** Loads a video and its owner entity; returns null if either is missing. */
const loadVideoWithOwner = async (videoId) => {
    const video = await Video.findByPk(videoId);
    if (!video) return null;
    const Model = ENTITY_MODELS[video.videoable_type];
    const owner = Model ? await Model.findByPk(video.videoable_id, { attributes: ['id', 'company_id'] }) : null;
    return { video, owner };
};

/**
 * GET /videos/:videoId
 * Used by the app to poll status after upload (processing -> ready / failed).
 */
exports.getVideo = async (req, res) => {
    try {
        const found = await loadVideoWithOwner(req.params.videoId);
        if (!found) return res.status(404).json({ message: 'Video not found.' });

        const { video, owner } = found;
        if (video.status !== 'ready' && !isSameCompany(req.user, owner)) {
            return res.status(404).json({ message: 'Video not found.' });
        }
        return res.status(200).json({ video: serialize(video) });
    } catch (error) {
        logger.error(`[VIDEO] Error fetching video ${req.params.videoId}:`, error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * DELETE /videos/:videoId
 * Removes the MP4 + thumbnail from Firebase and the row from the DB.
 * Works in any status; if it is still processing, the processor notices and cleans up.
 */
exports.deleteVideo = async (req, res) => {
    try {
        const found = await loadVideoWithOwner(req.params.videoId);
        if (!found) return res.status(404).json({ message: 'Video not found.' });

        const { video, owner } = found;
        if (!isSameCompany(req.user, owner)) {
            return res.status(403).json({ message: 'You are not authorized to delete this video.' });
        }

        const wasPrimary = video.is_primary;
        await videoProcessor.deleteVideoFiles(video);
        await video.destroy();

        if (wasPrimary) {
            const next = await Video.findOne({
                where: {
                    videoable_type: video.videoable_type,
                    videoable_id: video.videoable_id,
                    status: { [Op.in]: ['ready', 'processing'] },
                },
                order: [['id', 'ASC']],
            });
            if (next) await next.update({ is_primary: true });
        }

        logger.info(`[VIDEO] Video ${video.id} deleted by user ${req.user.id}`);
        return res.status(200).json({ message: 'Video deleted successfully.' });
    } catch (error) {
        logger.error(`[VIDEO] Error deleting video ${req.params.videoId}:`, error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};
