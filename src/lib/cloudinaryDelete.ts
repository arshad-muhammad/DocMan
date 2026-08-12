import cloudinary from './cloudinary';

export async function deleteFromCloudinary(publicId: string, resourceType: 'image' | 'raw' = 'image') {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error(`Failed to delete from Cloudinary (${publicId}):`, error);
    throw error;
  }
}
