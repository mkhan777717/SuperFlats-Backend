const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');
const BUCKET_NAME = 'super-flats.firebasestorage.app';

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: BUCKET_NAME
    });
}

const bucket = admin.storage().bucket();
module.exports = {
    admin,
    bucket,
};