const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const BUCKET_NAME = 'superflats-c5acd.firebasestorage.app';

// The service account key is a secret and is not in git, so it is looked up in several places:
//   1. FIREBASE_SERVICE_ACCOUNT_PATH  - explicit path (any host)
//   2. /etc/secrets/serviceAccountKey.json - where Render puts "Secret Files"
//   3. <project root>/serviceAccountKey.json - local machine / main server (unchanged behaviour)
const candidates = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    '/etc/secrets/serviceAccountKey.json',
    path.join(__dirname, '..', 'serviceAccountKey.json'),
].filter(Boolean);

const keyPath = candidates.find((p) => fs.existsSync(p));
if (!keyPath) {
    throw new Error(
        'Firebase service account key not found. Looked in: ' + candidates.join(', ') +
        '. Add serviceAccountKey.json (on Render: Environment > Secret Files).'
    );
}
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

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
