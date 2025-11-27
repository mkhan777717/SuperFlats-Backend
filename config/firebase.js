const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // Path to your key


if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'super-flats.firebasestorage.app' 
    });
}

module.exports = admin;