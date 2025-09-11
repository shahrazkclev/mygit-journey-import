// Cloudflare R2 Upload Utility
// This is a template for implementing Cloudflare R2 uploads
// You'll need to set up your R2 bucket and configure the necessary credentials

interface R2UploadConfig {
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  region: string;
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

class R2Uploader {
  private config: R2UploadConfig;

  constructor(config: R2UploadConfig) {
    this.config = config;
  }

  /**
   * Upload a file to Cloudflare R2
   * @param file - The file to upload
   * @param key - The key/path for the file in R2
   * @param contentType - MIME type of the file
   * @returns Promise with upload result
   */
  async uploadFile(
    file: File, 
    key: string, 
    contentType?: string
  ): Promise<UploadResult> {
    try {
      // Create form data for multipart upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('key', key);
      
      if (contentType) {
        formData.append('Content-Type', contentType);
      }

      // For now, we'll use a placeholder endpoint
      // You'll need to implement the actual R2 upload logic
      // This could be done via:
      // 1. Direct R2 API calls (requires CORS setup)
      // 2. A backend endpoint that handles R2 uploads
      // 3. Using AWS SDK with R2-compatible endpoints

      const response = await fetch('/api/upload-to-r2', {
        method: 'POST',
        body: formData,
        headers: {
          // Add any necessary headers for authentication
          'X-R2-Access-Key': this.config.accessKeyId,
          'X-R2-Secret-Key': this.config.secretAccessKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        url: result.url,
      };
    } catch (error) {
      console.error('R2 upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate a unique key for the file
   * @param file - The file to generate a key for
   * @param prefix - Optional prefix for the key
   * @returns Unique key string
   */
  generateKey(file: File, prefix?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
    const baseName = file.name.split('.').slice(0, -1).join('.');
    
    const key = `${prefix || 'uploads'}/${timestamp}-${random}-${baseName}.${extension}`;
    return key;
  }

  /**
   * Get the public URL for a file
   * @param key - The key of the file in R2
   * @returns Public URL
   */
  getPublicUrl(key: string): string {
    // Replace with your actual R2 public URL pattern
    return `https://your-bucket.your-domain.com/${key}`;
  }
}

// Example configuration (replace with your actual values)
const r2Config: R2UploadConfig = {
  bucketName: 'your-bucket-name',
  accessKeyId: 'your-access-key-id',
  secretAccessKey: 'your-secret-access-key',
  endpoint: 'https://your-account-id.r2.cloudflarestorage.com',
  region: 'auto', // R2 uses 'auto' as the region
};

// Create a singleton instance
export const r2Uploader = new R2Uploader(r2Config);

// Helper function for easy uploads
export async function uploadToR2(
  file: File, 
  type: 'media' | 'avatar' = 'media'
): Promise<string> {
  const key = r2Uploader.generateKey(file, type);
  const result = await r2Uploader.uploadFile(file, key, file.type);
  
  if (!result.success || !result.url) {
    throw new Error(result.error || 'Upload failed');
  }
  
  return result.url;
}

// Example usage in your components:
/*
import { uploadToR2 } from '@/lib/r2-upload';

// In your upload function:
try {
  const url = await uploadToR2(file, 'media');
  console.log('File uploaded to:', url);
} catch (error) {
  console.error('Upload failed:', error);
}
*/

export default R2Uploader;
