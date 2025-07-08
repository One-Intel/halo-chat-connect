
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

export type BucketType = 'avatars' | 'chat_attachments' | 'documents' | 'status';

interface UploadOptions {
  bucket: BucketType;
  file: File;
  userId: string;
  folder?: string;
}

interface UploadResult {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
}

export const uploadFile = async ({ bucket, file, userId, folder }: UploadOptions): Promise<UploadResult> => {
  try {
    console.log('Starting file upload:', { fileName: file.name, size: file.size, type: file.type, bucket });
    
    // Validate file size (50MB limit for videos, 10MB for others)
    const maxSize = bucket === 'status' && file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
    }

    // Validate file type based on bucket
    const allowedTypes = {
      avatars: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      status: [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm', 'video/mov', 'video/avi', 'video/mkv',
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac'
      ],
      chat_attachments: [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm', 'video/mov', 'video/avi',
        'audio/mpeg', 'audio/wav', 'audio/ogg',
        'application/pdf', 'text/plain',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      documents: [
        'application/pdf', 'text/plain',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
    };
    
    if (!allowedTypes[bucket].includes(file.type)) {
      throw new Error(`File type ${file.type} is not supported for ${bucket} uploads. Allowed types: ${allowedTypes[bucket].join(', ')}`);
    }

    // Generate unique file name
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = folder ? `${userId}/${folder}/${fileName}` : `${userId}/${fileName}`;

    console.log('Uploading to path:', filePath);

    // Upload file with retry logic
    let uploadError: any = null;
    let uploadSuccess = false;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { error } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
            cacheControl: '3600'
          });

        if (error) {
          uploadError = error;
          console.error(`Upload attempt ${attempt} failed:`, error);
          
          if (attempt < 3) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
        } else {
          uploadSuccess = true;
          break;
        }
      } catch (error) {
        uploadError = error;
        console.error(`Upload attempt ${attempt} exception:`, error);
        
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
      }
    }

    if (!uploadSuccess || uploadError) {
      console.error('All upload attempts failed:', uploadError);
      throw new Error(`Upload failed after 3 attempts: ${uploadError?.message || 'Unknown error'}`);
    }

    // Get public URL
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    if (!data.publicUrl) {
      throw new Error('Failed to get public URL for uploaded file');
    }

    console.log('Upload successful:', data.publicUrl);

    // Verify the upload by checking if file exists
    try {
      const { data: fileData, error: fileError } = await supabase.storage
        .from(bucket)
        .list(filePath.substring(0, filePath.lastIndexOf('/')), {
          search: fileName
        });

      if (fileError || !fileData?.length) {
        console.warn('File verification failed, but upload reported success');
      }
    } catch (verifyError) {
      console.warn('Could not verify file upload:', verifyError);
    }

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
    console.log('Deleting file:', { bucket, path });
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    console.log('File deleted successfully');
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

// Helper function to update user profile with new avatar
export const updateUserAvatar = async (userId: string, avatarUrl: string) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile avatar:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    console.log('Profile avatar updated successfully');
    return { success: true };
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

// Batch upload function for multiple files
export const uploadMultipleFiles = async (
  files: File[], 
  bucket: BucketType, 
  userId: string, 
  folder?: string
): Promise<UploadResult[]> => {
  console.log(`Starting batch upload of ${files.length} files`);
  
  const uploadPromises = files.map(file => 
    uploadFile({ bucket, file, userId, folder })
  );

  try {
    const results = await Promise.all(uploadPromises);
    console.log('Batch upload completed successfully');
    return results;
  } catch (error) {
    console.error('Batch upload failed:', error);
    throw error;
  }
};
