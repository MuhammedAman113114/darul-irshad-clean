// Firebase Admin SDK for server-side operations
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

let firebaseApp;

export function getFirebaseAdmin() {
  if (getApps().length === 0) {
    // Initialize Firebase Admin
    firebaseApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }
  return firebaseApp || getApps()[0];
}

export function getFirebaseStorage() {
  const app = getFirebaseAdmin();
  return getStorage(app);
}

/**
 * Upload a file to Firebase Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} filePath - Path in storage (e.g., 'students/123/photo.jpg')
 * @param {string} contentType - MIME type (e.g., 'image/jpeg')
 * @returns {Promise<string>} - Public URL of uploaded file
 */
export async function uploadFile(fileBuffer, filePath, contentType) {
  const storage = getFirebaseStorage();
  const bucket = storage.bucket();
  const file = bucket.file(filePath);

  await file.save(fileBuffer, {
    metadata: {
      contentType,
    },
    public: true, // Make file publicly accessible
  });

  // Get public URL
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
  return publicUrl;
}

/**
 * Delete a file from Firebase Storage
 * @param {string} filePath - Path in storage
 */
export async function deleteFile(filePath) {
  const storage = getFirebaseStorage();
  const bucket = storage.bucket();
  const file = bucket.file(filePath);
  
  await file.delete();
}

/**
 * Upload student photo
 * @param {number} studentId - Student ID
 * @param {Buffer} photoBuffer - Photo buffer
 * @param {string} contentType - Image MIME type
 * @returns {Promise<string>} - Public URL
 */
export async function uploadStudentPhoto(studentId, photoBuffer, contentType) {
  const filePath = `students/${studentId}/photo.jpg`;
  return uploadFile(photoBuffer, filePath, contentType);
}

/**
 * Delete student photo
 * @param {number} studentId - Student ID
 */
export async function deleteStudentPhoto(studentId) {
  const filePath = `students/${studentId}/photo.jpg`;
  return deleteFile(filePath);
}
