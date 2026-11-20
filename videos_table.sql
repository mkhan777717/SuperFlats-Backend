-- Videos table for property / flat video tours.
-- Sequelize creates this automatically on server start (sequelize.sync in app.js),
-- this file is for reference / manual creation on the DB.

CREATE TABLE IF NOT EXISTS `videos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `videoable_id` int NOT NULL,
  `videoable_type` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `storage_path` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `video_url` text COLLATE utf8mb4_general_ci DEFAULT NULL,
  `thumbnail_url` text COLLATE utf8mb4_general_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `mime_type` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `size_bytes` bigint DEFAULT NULL,
  `duration_sec` int DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `status` enum('processing','ready','failed') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'processing',
  `error_message` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_videoable` (`videoable_id`,`videoable_type`),
  KEY `idx_video_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
