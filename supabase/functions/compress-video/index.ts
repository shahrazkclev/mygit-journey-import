import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CompressVideoRequest {
  reviewId: string;
  targetResolution: string; // e.g., "1280x720", "1920x1080"
  maxFileSizeMB: number;
  quality: number; // 0.1 to 1.0
  compressionPreset?: string; // e.g., "ultra", "aggressive", "balanced", "light"
}

interface DirectUploadRequest {
  reviewId: string;
  compressedBlob: string; // base64 encoded compressed video
  originalSize: number;
  compressedSize: number;
  compressionSettings: {
    targetResolution: string;
    maxFileSizeMB: number;
    quality: number;
    compressionPreset: string;
  };
}

interface VideoCompressionSettings {
  width: number;
  height: number;
  maxFileSizeBytes: number;
  quality: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getEnv(k: string): string {
  const val = Deno.env.get(k);
  if (!val) throw new Error(`Missing environment variable: ${k}`);
  return val;
}

function createSupabase(): SupabaseClient {
  return createClient(
    getEnv('SUPABASE_URL'),
    getEnv('SUPABASE_SERVICE_ROLE_KEY')
  );
}

function parseResolution(resolution: string): { width: number; height: number } {
  const [width, height] = resolution.split('x').map(Number);
  return { width, height };
}

function getFFmpegSettings(settings: VideoCompressionSettings, preset: string = 'balanced'): string[] {
  const { width, height, quality } = settings;
  
  // Calculate CRF value based on quality and preset
  let crf: number;
  let ffmpegPreset: string;
  
  switch (preset) {
    case 'ultra':
      crf = Math.round(32 - (quality * 8)); // Higher compression
      ffmpegPreset = 'slow';
      break;
    case 'aggressive':
      crf = Math.round(30 - (quality * 8)); // High compression
      ffmpegPreset = 'medium';
      break;
    case 'balanced':
      crf = Math.round(28 - (quality * 10)); // Balanced
      ffmpegPreset = 'medium';
      break;
    case 'light':
      crf = Math.round(26 - (quality * 10)); // Light compression
      ffmpegPreset = 'fast';
      break;
    default:
      crf = Math.round(28 - (quality * 10));
      ffmpegPreset = 'medium';
  }
  
  return [
    '-i', 'input.mp4',
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
    '-crf', crf.toString(),
    '-preset', ffmpegPreset,
    '-movflags', '+faststart',
    '-y',
    'output.mp4'
  ];
}

async function downloadVideo(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function compressVideo(videoData: Uint8Array, settings: VideoCompressionSettings, preset: string = 'balanced'): Promise<Uint8Array> {
  // Check if FFmpeg is available
  try {
    const ffmpegCheck = new Deno.Command('ffmpeg', {
      args: ['-version'],
    });
    
    const { code } = await ffmpegCheck.output();
    if (code !== 0) {
      throw new Error('FFmpeg not available');
    }
  } catch (error) {
    console.warn('FFmpeg not available in Edge Runtime, returning original video data');
    // Return original video data if FFmpeg is not available
    return videoData;
  }

  // Create temporary files
  const tempDir = await Deno.makeTempDir();
  const inputPath = `${tempDir}/input.mp4`;
  const outputPath = `${tempDir}/output.mp4`;
  
  try {
    // Write input video
    await Deno.writeFile(inputPath, videoData);
    
    // Run FFmpeg compression
    const ffmpegArgs = getFFmpegSettings(settings, preset);
    const command = new Deno.Command('ffmpeg', {
      args: ffmpegArgs,
      cwd: tempDir,
    });
    
    const { code, stderr } = await command.output();
    
    if (code !== 0) {
      throw new Error(`FFmpeg failed: ${new TextDecoder().decode(stderr)}`);
    }
    
    // Read compressed video
    const compressedData = await Deno.readFile(outputPath);
    
    // Check file size
    if (compressedData.length > settings.maxFileSizeBytes) {
      console.warn(`Compressed video (${compressedData.length} bytes) still exceeds target size (${settings.maxFileSizeBytes} bytes)`);
    }
    
    return compressedData;
    
  } finally {
    // Clean up temporary files
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch (e) {
      console.warn('Failed to clean up temp directory:', e);
    }
  }
}

async function uploadToR2(fileData: Uint8Array, filename: string): Promise<string> {
  const R2_ACCESS_KEY = getEnv('R2_ACCESS_KEY');
  const R2_SECRET_KEY = getEnv('R2_SECRET_KEY');
  const R2_BUCKET = getEnv('R2_BUCKET');
  const R2_ENDPOINT = getEnv('R2_ENDPOINT');
  const R2_PUBLIC_URL = getEnv('R2_PUBLIC_URL');
  
  // Create optimized filename
  const optimizedFilename = filename.replace(/(\.[^.]+)$/, '_optimized$1');
  
  // Upload to R2 using S3-compatible API
  const url = `${R2_ENDPOINT}/${R2_BUCKET}/${optimizedFilename}`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY}/20231201/auto/s3/aws4_request`,
      'Content-Type': 'video/mp4',
      'x-amz-acl': 'public-read',
    },
    body: fileData,
  });
  
  if (!response.ok) {
    throw new Error(`R2 upload failed: ${response.statusText}`);
  }
  
  return `${R2_PUBLIC_URL}/${optimizedFilename}`;
}

async function updateReviewWithOptimizedUrl(supabase: SupabaseClient, reviewId: string, optimizedUrl: string) {
  const { error } = await supabase
    .from('reviews')
    .update({ 
      media_url_optimized: optimizedUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', reviewId);
    
  if (error) throw error;
}

async function handleDirectUpload(request: DirectUploadRequest): Promise<Response> {
  try {
    console.log('📤 Handling direct upload for review:', request.reviewId);
    
    const supabase = createSupabase();
    
    // Convert base64 to Uint8Array
    const compressedData = Uint8Array.from(atob(request.compressedBlob), c => c.charCodeAt(0));
    
    // Extract filename from review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('media_url')
      .eq('id', request.reviewId)
      .single();
      
    if (reviewError) throw reviewError;
    
    // Extract filename from original URL
    const urlParts = review.media_url.split('/');
    const originalFilename = urlParts[urlParts.length - 1];
    
    // Upload to R2
    console.log('☁️ Uploading compressed video to R2...');
    const optimizedUrl = await uploadToR2(compressedData, originalFilename);
    console.log('✅ Uploaded to:', optimizedUrl);
    
    // Update review with optimized URL
    await updateReviewWithOptimizedUrl(supabase, request.reviewId, optimizedUrl);
    console.log('💾 Updated review with optimized URL');
    
    const compressionRatio = Math.round((1 - request.compressedSize / request.originalSize) * 100);
    
    return new Response(JSON.stringify({ 
      success: true, 
      optimizedUrl,
      originalSize: request.originalSize,
      compressedSize: request.compressedSize,
      compressionRatio,
      wasCompressed: true,
      message: `Video compressed successfully! Reduced by ${compressionRatio}%`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    console.error('❌ Error in direct upload:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    
    // Check if this is a direct upload request
    if (requestData.compressedBlob && requestData.originalSize && requestData.compressedSize) {
      return await handleDirectUpload(requestData as DirectUploadRequest);
    }
    
    // Otherwise, handle as regular compression request
    const { reviewId, targetResolution, maxFileSizeMB, quality, compressionPreset = 'balanced' }: CompressVideoRequest = requestData;
    
    console.log('🎬 Starting video compression for review:', reviewId);
    console.log('📐 Target resolution:', targetResolution);
    console.log('📦 Max file size:', maxFileSizeMB, 'MB');
    console.log('🎯 Quality:', quality);

    const supabase = createSupabase();
    
    // Get review data
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single();
      
    if (reviewError) throw reviewError;
    if (!review.media_url || review.media_type !== 'video') {
      throw new Error('Review does not have a video to compress');
    }
    
    // Parse settings
    const { width, height } = parseResolution(targetResolution);
    const settings: VideoCompressionSettings = {
      width,
      height,
      maxFileSizeBytes: maxFileSizeMB * 1024 * 1024,
      quality: Math.max(0.1, Math.min(1.0, quality))
    };
    
    console.log('⚙️ Compression settings:', settings);
    
    // Download original video
    console.log('⬇️ Downloading original video...');
    const originalVideoData = await downloadVideo(review.media_url);
    console.log(`📥 Downloaded ${originalVideoData.length} bytes`);
    
    // Compress video
    console.log('🎬 Compressing video with preset:', compressionPreset);
    const compressedVideoData = await compressVideo(originalVideoData, settings, compressionPreset);
    console.log(`📤 Compressed to ${compressedVideoData.length} bytes`);
    
    // Check if compression actually happened (FFmpeg available) or if we returned original data
    const wasCompressed = compressedVideoData.length < originalVideoData.length;
    const compressionRatio = wasCompressed ? 
      Math.round((1 - compressedVideoData.length / originalVideoData.length) * 100) : 0;
    
    // Extract filename from original URL
    const urlParts = review.media_url.split('/');
    const originalFilename = urlParts[urlParts.length - 1];
    
    // Upload compressed video to R2
    console.log('☁️ Uploading compressed video to R2...');
    const optimizedUrl = await uploadToR2(compressedVideoData, originalFilename);
    console.log('✅ Uploaded to:', optimizedUrl);
    
    // Update review with optimized URL
    await updateReviewWithOptimizedUrl(supabase, reviewId, optimizedUrl);
    console.log('💾 Updated review with optimized URL');
    
    return new Response(JSON.stringify({ 
      success: true, 
      optimizedUrl,
      originalSize: originalVideoData.length,
      compressedSize: compressedVideoData.length,
      compressionRatio,
      wasCompressed,
      message: wasCompressed ? 
        `Video compressed successfully! Reduced by ${compressionRatio}%` : 
        'Video uploaded successfully (compression not available in this environment)'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error in compress-video:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

serve(handler);
