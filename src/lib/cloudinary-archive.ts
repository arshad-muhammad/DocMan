/*
// ==========================================
// LEGACY CLOUDINARY UPLOAD & DELETE CODE
// ==========================================

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

// --- cloudinaryUpload.ts ---
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  folder: string,
  filename: string,
  mimetype: string
): Promise<{ url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const resourceType = mimetype === 'application/pdf' ? 'image' : 'raw';
    const publicId = filename.replace(/\.[^/.]+$/, "");

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        public_id: publicId,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );
    uploadStream.end(fileBuffer);
  });
}

// --- cloudinaryDelete.ts ---
export async function deleteFromCloudinary(publicId: string, resourceType: 'image' | 'raw' = 'image') {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error(`Failed to delete from Cloudinary (${publicId}):`, error);
    throw error;
  }
}
*/
