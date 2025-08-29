// utils/fileService.js
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const bucket = require("../config/firebase");
const uploadFile = async (file) => {
    if (!file) return "";

    console.log(`[UPLOAD] Processing file: ${file.originalname}, type: ${file.mimetype}, size: ${file.size} bytes`);

    // Dynamically adjust quality based on file size:
    // - <100KB → 90% quality
    // - 100KB-500KB → 70%
    // - 500KB-2MB → 50%
    // - >2MB → 30%
    let compressQuality;
    if (file.size < 100 * 1024) compressQuality = 90;
    else if (file.size < 500 * 1024) compressQuality = 70;
    else if (file.size < 2 * 1024 * 1024) compressQuality = 50;
    else compressQuality = 30;

    const sanitizedOriginalname = file.originalname.replace(/[^a-zA-Z0-9.]/g, "-");
    const filename = `${Date.now()}-${sanitizedOriginalname}.webp`;
    const token = uuidv4();

    try {
        const webpBuffer = await sharp(file.buffer)
            .resize({ withoutEnlargement: true }) // maintain aspect ratio, no upscaling
            .webp({ quality: compressQuality })
            .toBuffer();

        await bucket.file(filename).save(webpBuffer, {
            contentType: "image/webp",
            metadata: { metadata: { firebaseStorageDownloadTokens: token } },
        });

        const fileUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${token}`;
        console.log(`[UPLOAD SUCCESS] Quality=${compressQuality} → ${fileUrl}`);
        return fileUrl;
    } catch (err) {
        console.error(`[UPLOAD ERROR] ${filename}: ${err.message}`);
        throw err;
    }
};

const deleteFile = async (url, fileType = "file") => {
    if (!url) {
        console.log(`[INFO] No ${fileType} to delete.`);
        return;
    }

    try {
        const filename = decodeURIComponent(url.split("/o/")[1].split("?")[0]);
        console.log(`[DELETE] Removing ${fileType} from Firebase: ${filename}`);
        await bucket.file(filename).delete();
        console.log(`[DELETE SUCCESS] ${fileType} (${filename})`);
    } catch (error) {
        console.error(`[DELETE ERROR] Failed to remove ${fileType}: ${error.message}`);
    }
};

module.exports = { uploadFile, deleteFile };
