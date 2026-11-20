// middlewares/videoUpload.js
//
// Multer config for videos. Unlike photos (memoryStorage), videos are written to a temp
// folder on disk so a large upload never sits in RAM.

const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { config, TEMP_DIR } = require('../utils/videoProcessor');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, TEMP_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^a-z0-9.]/g, '').slice(0, 10);
        cb(null, `upload-${crypto.randomUUID()}${ext}`);
    },
});

// Some Android pickers send video files as application/octet-stream.
// The real check happens with ffprobe in the controller, this is only a first filter.
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream') {
        return cb(null, true);
    }
    const err = new Error(`Only video files are allowed (got ${file.mimetype}).`);
    err.code = 'INVALID_FILE_TYPE';
    return cb(err);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: config.maxUploadBytes, files: 1 },
});

/**
 * Accepts a single file in the `video` form field and turns multer errors into proper 4xx responses.
 */
const uploadVideo = (req, res, next) => {
    upload.single('video')(req, res, (err) => {
        if (!err) return next();

        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                message: `Video is too large. Maximum allowed size is ${Math.round(config.maxUploadBytes / (1024 * 1024))}MB.`,
            });
        }
        if (err.code === 'INVALID_FILE_TYPE') {
            return res.status(400).json({ message: err.message });
        }
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `Upload error: ${err.message}. Send the file in the "video" field.` });
        }
        return next(err);
    });
};

module.exports = uploadVideo;
