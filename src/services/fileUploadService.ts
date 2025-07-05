
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

export type BucketType = 'avatars' | 'chat_attachments' | 'documents' | 'status';

interface UploadOptions {
  bucket: BucketType;
  file: File;
  userId: string;
  folder?: string;
}

export const uploadFile = async ({ bucket, file, userId, folder }: UploadOptions) => {
  try {
    console.log('Starting file upload:', { fileName: file.name, size: file.size, type: file.type });
    
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of 10MB`);
    }

    // Validate file type for status bucket
    if (bucket === 'status') {
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm', 'video/mov', 'video/avi',
        'audio/mpeg', 'audio/wav', 'audio/ogg'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} is not supported for status uploads`);
      }
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = folder ? `${userId}/${folder}/${fileName}` : `${userId}/${fileName}`;

    console.log('Uploading to path:', filePath);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    console.log('Upload successful:', data.publicUrl);

    return {
      url: data.publicUrl,
      path: filePath,
      name: file.name,
      size: file.size,
      type: file.type
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

export const deleteFile = async (bucket: BucketType, path: string) => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
};

export const getFileUrl = (bucket: BucketType, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
};
