import { supabase } from './supabase';

export async function uploadToSupabase(
  fileBuffer: Buffer,
  folder: string,
  filename: string,
  mimetype: string
): Promise<{ url: string; public_id: string }> {
  // Define bucket name
  const bucketName = 'documents';
  // Clean up path
  const filePath = `${folder}/${filename}`.replace(/\/+/g, '/');

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, fileBuffer, {
      contentType: mimetype,
      upsert: true
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw error;
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return {
    url: publicUrlData.publicUrl,
    public_id: filePath,
  };
}
