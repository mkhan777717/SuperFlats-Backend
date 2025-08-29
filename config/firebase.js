// firebase.js
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // Make sure this file is not public

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'super-flats.firebasestorage.app' // Replace with your bucket URL
});

const bucket = admin.storage().bucket();
module.exports = bucket;