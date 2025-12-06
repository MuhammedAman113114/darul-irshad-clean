// Cloudinary integration for image uploads
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload a file to Cloudinary
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} folder - Folder path (e.g., 'students/123')
 * @param {string} publicId - File name without extension
 * @returns {Promise<string>} - Public URL of uploaded file
 */
export async function uploadFile(fileBuffer, folder, publicId) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        public_id: publicId,
        resource_type: 'auto',
        overwrite: true,
        transformation: [
          { width: 800, height: 800, crop: 'limit' }, // Limit max size
          { quality: 'auto:good' }, // Auto optimize quality
          { fetch_format: 'auto' } // Auto format (WebP when supported)
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Full public ID (e.g., 'students/123/photo')
 */
export async function deleteFile(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
}

/**
 * Upload student photo
 * @param {number} studentId - Student ID
 * @param {Buffer} photoBuffer - Photo buffer
 * @param {string} contentType - Image MIME type (not used, Cloudinary auto-detects)
 * @returns {Promise<string>} - Public URL
 */
export async function uploadStudentPhoto(studentId, photoBuffer, contentType) {
  const folder = `students/${studentId}`;
  const publicId = 'photo';
  return uploadFile(photoBuffer, folder, publicId);
}

/**
 * Delete student photo
 * @param {number} studentId - Student ID
 */
export async function deleteStudentPhoto(studentId) {
  const publicId = `students/${studentId}/photo`;
  return deleteFile(publicId);
}

/**
 * Get optimized image URL with transformations
 * @param {string} publicId - Cloudinary public ID
 * @param {object} options - Transformation options
 * @returns {string} - Transformed image URL
 */
export function getOptimizedImageUrl(publicId, options = {}) {
  const {
    width = 400,
    height = 400,
    crop = 'fill',
    quality = 'auto:good',
    format = 'auto'
  } = options;

  return cloudinary.url(publicId, {
    transformation: [
      { width, height, crop },
      { quality },
      { fetch_format: format }
    ],
    secure: true
  });
}

export default cloudinary;
