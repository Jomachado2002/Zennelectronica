// backend/services/firebase.js
// Servicio para subir archivos a Firebase Storage usando firebase-admin

let admin;
try {
    admin = require('firebase-admin');
} catch (e) {
    admin = null;
}

let initialized = false;

function initFirebase() {
    if (initialized) return;
    if (!admin) {
        throw new Error('firebase-admin no está instalado. Instala con: npm i firebase-admin');
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

    if (!projectId || !clientEmail || !privateKey || !storageBucket) {
        throw new Error('Config de Firebase incompleta. Define FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_STORAGE_BUCKET');
    }

    // Reemplazar \n por saltos reales
    privateKey = privateKey.replace(/\\n/g, '\n');

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey
            }),
            storageBucket
        });
    }

    initialized = true;
}

async function uploadBufferToFirebase(folder, filename, buffer, contentType) {
    initFirebase();
    const bucket = admin.storage().bucket();
    const destination = `${folder}/${Date.now()}_${filename}`;
    const file = bucket.file(destination);

    await file.save(buffer, {
        metadata: { contentType },
        resumable: false,
        validation: false
    });

    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
    return { url: publicUrl, path: destination };
}

module.exports = {
    uploadBufferToFirebase
};


