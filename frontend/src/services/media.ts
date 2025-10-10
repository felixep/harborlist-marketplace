/**
 * @fileoverview Media upload service for HarborList frontend.
 * 
 * Provides comprehensive media upload functionality with support for both
 * local development (LocalStack) and AWS production environments.
 * Handles presigned URL generation, direct S3 uploads, and progress tracking.
 * 
 * @author HarborList Development Team
 * @version 1.0.0
 */

import { config } from '../config/env';

export interface MediaUploadResponse {
  uploadId: string;
  uploadUrl: string;
  url: string;
  thumbnail?: string;
  metadata: {
    size: number;
    dimensions: { width: number; height: number };
    format: string;
  };
}

export interface UploadProgress {
  uploadId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

/**
 * Get presigned upload URL from the media service
 */
export async function getPresignedUploadUrl(
  fileName: string,
  contentType: string,
  fileSize: number
): Promise<MediaUploadResponse> {
  const token = localStorage.getItem('authToken');
  
  console.log(`Getting presigned URL for: ${fileName} (${contentType}, ${fileSize} bytes)`);
  
  const formData = new FormData();
  formData.append('fileName', fileName);
  formData.append('contentType', contentType);
  formData.append('fileSize', fileSize.toString());

  const response = await fetch(`${config.apiUrl}/media`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
    console.error('Failed to get presigned URL:', errorData);
    throw new Error(errorData.error?.message || errorData.error || `HTTP ${response.status}`);
  }

  const result = await response.json();
  console.log('Got presigned URL:', { uploadId: result.uploadId, url: result.url });
  return result;
}

/**
 * Upload file directly to S3 using presigned URL
 */
export async function uploadFileToS3(
  file: File,
  presignedUrl: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Uploading ${file.name} to S3...`);
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          console.log(`Upload progress for ${file.name}: ${progress.toFixed(1)}%`);
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        console.log(`Successfully uploaded ${file.name}`);
        resolve();
      } else {
        console.error(`Upload failed for ${file.name} with status ${xhr.status}:`, xhr.responseText);
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
      }
    });

    xhr.addEventListener('error', (e) => {
      console.error(`Network error uploading ${file.name}:`, e);
      reject(new Error('Upload failed due to network error'));
    });

    xhr.addEventListener('abort', () => {
      console.error(`Upload aborted for ${file.name}`);
      reject(new Error('Upload was aborted'));
    });

    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

/**
 * Complete media upload workflow: get presigned URL + upload file
 */
export async function uploadMedia(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<MediaUploadResponse> {
  try {
    // Step 1: Get presigned upload URL
    onProgress?.({
      uploadId: '',
      progress: 0,
      status: 'uploading',
    });

    const uploadData = await getPresignedUploadUrl(
      file.name,
      file.type,
      file.size
    );

    // Step 2: Upload file to S3
    onProgress?.({
      uploadId: uploadData.uploadId,
      progress: 10,
      status: 'uploading',
    });

    await uploadFileToS3(file, uploadData.uploadUrl, (progress) => {
      onProgress?.({
        uploadId: uploadData.uploadId,
        progress: 10 + (progress * 0.8), // 10% to 90%
        status: 'uploading',
      });
    });

    // Step 3: Processing complete
    onProgress?.({
      uploadId: uploadData.uploadId,
      progress: 100,
      status: 'completed',
    });

    return {
      ...uploadData,
      metadata: {
        ...uploadData.metadata,
        size: file.size,
      },
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    
    onProgress?.({
      uploadId: '',
      progress: 0,
      status: 'error',
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Upload multiple files with progress tracking
 */
export async function uploadMultipleMedia(
  files: File[],
  onProgress?: (overallProgress: number, fileProgresses: UploadProgress[]) => void
): Promise<MediaUploadResponse[]> {
  const results: MediaUploadResponse[] = [];
  const progresses: UploadProgress[] = files.map(() => ({
    uploadId: '',
    progress: 0,
    status: 'uploading' as const,
  }));

  const updateOverallProgress = () => {
    const totalProgress = progresses.reduce((sum, p) => sum + p.progress, 0) / files.length;
    onProgress?.(totalProgress, [...progresses]);
  };

  // Upload files sequentially to avoid overwhelming the server
  for (let i = 0; i < files.length; i++) {
    try {
      const result = await uploadMedia(files[i], (progress) => {
        progresses[i] = progress;
        updateOverallProgress();
      });
      results.push(result);
    } catch (error) {
      progresses[i] = {
        uploadId: '',
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed',
      };
      updateOverallProgress();
      throw error;
    }
  }

  return results;
}

/**
 * Validate file before upload
 */
export function validateMediaFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    return { valid: false, error: 'File must be an image or video' };
  }

  // Check file size (50MB limit)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 50MB' };
  }

  // Check image types
  if (file.type.startsWith('image/')) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Image must be JPEG, PNG, or WebP format' };
    }
  }

  // Check video types
  if (file.type.startsWith('video/')) {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Video must be MP4, WebM, or OGG format' };
    }
  }

  return { valid: true };
}