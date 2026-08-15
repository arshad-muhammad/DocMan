import { supabase } from './supabase';

export async function deleteFromSupabase(publicId: string) {
  const bucketName = 'documents';
  
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([publicId]);
      
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error(`Failed to delete from Supabase (${publicId}):`, error);
    throw error;
  }
}
