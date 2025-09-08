import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CompressVideoRequest {
  reviewId: string;
  targetResolution: string; // e.g., "1280x720", "1920x1080"
  maxFileSizeMB: number;
  quality: number; // 0.1 to 1.0
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

function getFFmpegSettings(settings: VideoCompressionSettings): string[] {
  const { width, height, quality } = settings;
  
  // Calculate CRF value based on quality (0.1-1.0 maps to 28-18)
  const crf = Math.round(28 - (quality * 10));
  
  return [
    '-i', 'input.mp4',
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
    '-crf', crf.toString(),
    '-preset', 'medium',
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

async function compressVideo(videoData: Uint8Array, settings: VideoCompressionSettings): Promise<Uint8Array> {
  // Create temporary files
  const tempDir = await Deno.makeTempDir();
  const inputPath = `${tempDir}/input.mp4`;
  const outputPath = `${tempDir}/output.mp4`;
  
  try {
    // Write input video
    await Deno.writeFile(inputPath, videoData);
    
    // Run FFmpeg compression
    const ffmpegArgs = getFFmpegSettings(settings);
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

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reviewId, targetResolution, maxFileSizeMB, quality }: CompressVideoRequest = await req.json();
    
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
    console.log('🎬 Compressing video...');
    const compressedVideoData = await compressVideo(originalVideoData, settings);
    console.log(`📤 Compressed to ${compressedVideoData.length} bytes`);
    
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
      compressionRatio: Math.round((1 - compressedVideoData.length / originalVideoData.length) * 100)
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
