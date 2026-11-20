const { DataTypes } = require('sequelize');

// Stores property / flat videos.
// Same polymorphic pattern as the `photos` table:
// (videoable_type, videoable_id) points to the owning record, e.g. ('Property', 5) or ('Flat', 12).
//
// Lifecycle (see utils/videoProcessor.js):
//   processing -> uploaded file is being compressed / converted to MP4
//   ready      -> MP4 + thumbnail are in Firebase, video_url is set
//   failed     -> conversion or upload failed, reason in error_message
module.exports = (sequelize) => {
    const Video = sequelize.define('Video', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        videoable_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        videoable_type: {
            type: DataTypes.STRING,
            allowNull: false, // 'Property' | 'Flat'
        },
        storage_path: {
            type: DataTypes.STRING,
            allowNull: false, // path of the MP4 inside the Firebase bucket, used to delete the file
        },
        video_url: {
            type: DataTypes.TEXT,
            allowNull: true, // set once processing is done
        },
        thumbnail_url: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: true, // e.g. "Living room tour"
        },
        original_filename: {
            type: DataTypes.STRING,
            allowNull: true, // file name as uploaded by the user, e.g. IMG_1234.MOV
        },
        mime_type: {
            type: DataTypes.STRING,
            allowNull: true, // always video/mp4 after conversion
        },
        size_bytes: {
            type: DataTypes.BIGINT,
            allowNull: true, // size of the compressed MP4
        },
        duration_sec: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        is_primary: {
            type: DataTypes.BOOLEAN,
            defaultValue: false, // main video shown first
        },
        status: {
            type: DataTypes.ENUM('processing', 'ready', 'failed'),
            allowNull: false,
            defaultValue: 'processing',
        },
        error_message: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
    }, {
        tableName: 'videos',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                name: 'idx_videoable',
                fields: ['videoable_id', 'videoable_type'],
            },
            {
                name: 'idx_video_status',
                fields: ['status'],
            },
        ],
    });

    return Video;
};
