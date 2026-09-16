'use strict';

const { initializeApp, getApps } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } = require('firebase/storage');
const {
  isR2Configured,
  uploadBufferToR2,
  deleteObjectFromR2,
  isR2PublicUrl,
  r2KeyFromPublicUrl
} = require('./r2StorageService');

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'eccomerce-bluetec-saopaulo',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

let firebaseStorage;

function getFirebaseStorage() {
  if (firebaseStorage) return firebaseStorage;
  if (!firebaseConfig.apiKey && !firebaseConfig.storageBucket) {
    throw new Error('Firebase no configurado para subir logos');
  }
  const existing = getApps();
  const app = existing.length ? existing[0] : initializeApp(firebaseConfig);
  firebaseStorage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
  return firebaseStorage;
}

function isFirebaseUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return (
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('firebasestorage.app') ||
    url.includes('storage.googleapis.com')
  );
}

async function uploadViaFirebaseClient(buffer, key, contentType) {
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, key);
  await uploadBytes(storageRef, buffer, { contentType });
  const url = await getDownloadURL(storageRef);
  return { url, key, storage: 'firebase' };
}

async function uploadViaFirebaseAdmin(buffer, key, contentType) {
  const { uploadBufferToFirebase } = require('./firebase');
  const parts = String(key).split('/');
  const filename = parts.pop();
  const folder = parts.join('/') || 'brands/logos';
  const result = await uploadBufferToFirebase(folder, filename, buffer, contentType);
  return { url: result.url, key: result.path, storage: 'firebase-admin' };
}

async function uploadLogoBuffer(buffer, key, contentType = 'image/png') {
  if (isR2Configured()) {
    const url = await uploadBufferToR2(buffer, key, {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable'
    });
    return { url, key, storage: 'r2' };
  }

  try {
    return await uploadViaFirebaseClient(buffer, key, contentType);
  } catch (clientErr) {
    try {
      return await uploadViaFirebaseAdmin(buffer, key, contentType);
    } catch {
      const err = new Error(
        clientErr.message || 'No se pudo guardar el logo. Falta R2/CDN o Firebase en el servidor.'
      );
      err.status = 503;
      throw err;
    }
  }
}

async function deleteLogoObject({ logoUrl, logoKey } = {}) {
  if (logoUrl && isR2PublicUrl(logoUrl) && isR2Configured()) {
    const key = r2KeyFromPublicUrl(logoUrl) || logoKey;
    if (key) await deleteObjectFromR2(key);
    return;
  }
  if (logoKey && isR2Configured() && !isFirebaseUrl(logoUrl)) {
    try {
      await deleteObjectFromR2(logoKey);
      return;
    } catch {
      /* try firebase below */
    }
  }
  if (!logoKey && !logoUrl) return;
  const storage = getFirebaseStorage();
  const path = logoKey || '';
  if (!path) return;
  await deleteObject(ref(storage, path));
}

module.exports = {
  uploadLogoBuffer,
  deleteLogoObject,
  isFirebaseUrl
};
