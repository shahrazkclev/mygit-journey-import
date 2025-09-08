import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface VideoCompressorProps {
  videoUrl: string;
  onCompressed: (compressedBlob: Blob, originalSize: number, compressedSize: number) => void;
  onCancel: () => void;
  targetResolution: string;
  maxFileSizeMB: number;
  quality: number;
  compressionPreset: string;
}

export const VideoCompressor: React.FC<VideoCompressorProps> = ({
  videoUrl,
  onCompressed,
  onCancel,
  targetResolution,
  maxFileSizeMB,
  quality,
  compressionPreset
}) => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const compressVideo = async () => {
    try {
      setIsCompressing(true);
      setProgress(0);
      setStatus('Loading video...');
      
      console.log(`Starting compression with preset: ${compressionPreset}, quality: ${quality}, resolution: ${targetResolution}, maxSize: ${maxFileSizeMB}MB`);
      
      // Check for any worker-related errors
      if (typeof Worker === 'undefined') {
        console.warn('Web Workers not supported in this environment');
      }

      // Create video element
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoUrl;
      video.muted = true; // Mute to avoid audio issues
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
      });

      setProgress(10);
      setStatus('Analyzing video...');

      // Get video dimensions
      const [targetWidth, targetHeight] = targetResolution.split('x').map(Number);
      const aspectRatio = video.videoWidth / video.videoHeight;
      
      // Calculate new dimensions maintaining aspect ratio
      let newWidth = targetWidth;
      let newHeight = targetHeight;
      
      if (aspectRatio > targetWidth / targetHeight) {
        newHeight = Math.round(targetWidth / aspectRatio);
      } else {
        newWidth = Math.round(targetHeight * aspectRatio);
      }

      setProgress(20);
      setStatus('Setting up compression...');

      // Create canvas for frame processing
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d')!;

      // Calculate target bitrate based on file size and duration
      const targetBitrate = (maxFileSizeMB * 8 * 1024) / video.duration; // kbps
      
      // Apply compression preset to quality and bitrate
      let adjustedQuality = quality;
      let bitrateMultiplier = 1.0;
      
      switch (compressionPreset) {
        case 'ultra':
          adjustedQuality = quality * 0.5; // More aggressive compression
          bitrateMultiplier = 0.3;
          break;
        case 'aggressive':
          adjustedQuality = quality * 0.7;
          bitrateMultiplier = 0.5;
          break;
        case 'balanced':
          adjustedQuality = quality * 0.9;
          bitrateMultiplier = 0.8;
          break;
        case 'light':
          adjustedQuality = quality;
          bitrateMultiplier = 1.0;
          break;
        default:
          adjustedQuality = quality * 0.7;
          bitrateMultiplier = 0.5;
      }
      
      // Map quality to video bitrate with preset adjustments
      const videoBitrate = Math.max(100, targetBitrate * adjustedQuality * bitrateMultiplier * 0.8); // Minimum 100kbps
      const audioBitrate = Math.max(32, targetBitrate * adjustedQuality * bitrateMultiplier * 0.2); // Minimum 32kbps

      console.log(`Compression settings: ${compressionPreset} preset, ${newWidth}x${newHeight}, ${videoBitrate}kbps video, ${audioBitrate}kbps audio`);

      setProgress(30);
      setStatus('Starting compression...');

      // Create MediaRecorder with compression settings
      const stream = canvas.captureStream(24); // 24 FPS for better compression
      
      // Try different codec options for better browser support
      let mediaRecorder;
      const codecOptions = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9',
        'video/webm'
      ];

      for (const mimeType of codecOptions) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          mediaRecorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: videoBitrate * 1000,
            audioBitsPerSecond: audioBitrate * 1000
          });
          console.log(`Using codec: ${mimeType}`);
          break;
        }
      }

      if (!mediaRecorder) {
        throw new Error('No supported video codec found');
      }

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const compressedBlob = new Blob(chunks, { type: 'video/webm' });
        // Estimate original size more accurately
        const originalSize = video.duration * video.videoWidth * video.videoHeight * 4; // 4 bytes per pixel estimate
        onCompressed(compressedBlob, originalSize, compressedBlob.size);
      };

      // Start recording
      mediaRecorder.start(1000); // Record in 1-second chunks for better performance

      setProgress(40);
      setStatus(`Processing frames on your PC using ${compressionPreset} preset...`);

      // Process video frame by frame with better performance
      const fps = 24; // Use 24 FPS for better compression
      const totalFrames = Math.floor(video.duration * fps);
      let currentFrame = 0;

      const processFrame = () => {
        if (currentFrame >= totalFrames) {
          setProgress(95);
          setStatus('Finalizing compression...');
          mediaRecorder.stop();
          return;
        }

        // Seek to current frame
        const targetTime = currentFrame / fps;
        video.currentTime = targetTime;
        
        video.onseeked = () => {
          // Draw frame to canvas with better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(video, 0, 0, newWidth, newHeight);
          
          // Update progress
          const frameProgress = 40 + (currentFrame / totalFrames) * 50;
          setProgress(frameProgress);
          setStatus(`Processing frame ${currentFrame + 1} of ${totalFrames} (${compressionPreset} preset)`);
          
          currentFrame++;
          
          // Use setTimeout for better performance on PC
          setTimeout(processFrame, 10);
        };
      };

      // Start processing
      video.currentTime = 0;
      video.onseeked = () => {
        processFrame();
      };

    } catch (error) {
      console.error('Compression error:', error);
      toast({
        title: "Compression failed",
        description: `Failed to compress video: ${error.message}`,
        variant: "destructive"
      });
      setIsCompressing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Video Compression</h3>
        <p className="text-sm text-muted-foreground">
          Compressing video with <span className="font-medium text-primary">{compressionPreset}</span> preset
        </p>
        <div className="text-xs text-muted-foreground mt-1">
          Resolution: {targetResolution} | Max Size: {maxFileSizeMB}MB | Quality: {Math.round(quality * 100)}%
        </div>
      </div>

      {isCompressing && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>{status}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}

      <div className="flex gap-2 justify-center">
        <Button
          onClick={compressVideo}
          disabled={isCompressing}
          className="bg-primary hover:bg-primary/90"
        >
          {isCompressing ? 'Compressing...' : 'Start Compression'}
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          disabled={isCompressing}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
