import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface VideoCompressorProps {
  videoFile: File;
  onCompressed: (compressedBlob: Blob, originalSize: number, compressedSize: number) => void;
  onCancel: () => void;
}

export const VideoCompressor: React.FC<VideoCompressorProps> = ({
  videoFile,
  onCompressed,
  onCancel,
}) => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [targetResolution, setTargetResolution] = useState('1280x720');
  const [quality, setQuality] = useState(0.7);
  const [compressionPreset, setCompressionPreset] = useState('balanced');
  const { toast } = useToast();

  const compressVideo = async () => {
    try {
      setIsCompressing(true);
      setProgress(0);
      setStatus('Loading video...');
      
      console.log(`Starting compression with preset: ${compressionPreset}, quality: ${quality}, resolution: ${targetResolution}`);

      // Create video element from file
      const video = document.createElement('video');
      const videoUrl = URL.createObjectURL(videoFile);
      video.src = videoUrl;
      video.muted = true;
      
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

      // Calculate target bitrate based on quality and preset
      let bitrateMultiplier = 1.0;
      let adjustedQuality = quality;
      
      switch (compressionPreset) {
        case 'ultra':
          adjustedQuality = quality * 0.5;
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
      
      // Calculate bitrates based on resolution and quality
      const baseBitrate = (newWidth * newHeight * 24 * adjustedQuality) / 1000; // Base calculation
      const videoBitrate = Math.max(100, baseBitrate * bitrateMultiplier * 0.8);
      const audioBitrate = Math.max(32, baseBitrate * bitrateMultiplier * 0.2);

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
        URL.revokeObjectURL(videoUrl); // Clean up
        onCompressed(compressedBlob, videoFile.size, compressedBlob.size);
        setIsCompressing(false);
      };

      // Start recording
      mediaRecorder.start(1000);

      setProgress(40);
      setStatus(`Processing frames on your PC using ${compressionPreset} preset...`);

      // Process video frame by frame
      const fps = 24;
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
          
          // Use setTimeout for better performance
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
        description: `Failed to compress video: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      setIsCompressing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4 p-6 bg-card rounded-lg border">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Video Compression</h3>
        <p className="text-sm text-muted-foreground">
          Optimize your video for faster uploads and better performance
        </p>
        <div className="text-xs text-muted-foreground mt-1">
          Original Size: {formatFileSize(videoFile.size)}
        </div>
      </div>

      {!isCompressing && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Resolution</label>
              <Select value={targetResolution} onValueChange={setTargetResolution}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1920x1080">1080p (1920x1080)</SelectItem>
                  <SelectItem value="1280x720">720p (1280x720)</SelectItem>
                  <SelectItem value="854x480">480p (854x480)</SelectItem>
                  <SelectItem value="640x360">360p (640x360)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Quality ({Math.round(quality * 100)}%)</label>
              <Select value={quality.toString()} onValueChange={(value) => setQuality(parseFloat(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.9">High (90%)</SelectItem>
                  <SelectItem value="0.7">Medium (70%)</SelectItem>
                  <SelectItem value="0.5">Low (50%)</SelectItem>
                  <SelectItem value="0.3">Very Low (30%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Compression</label>
              <Select value={compressionPreset} onValueChange={setCompressionPreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                  <SelectItem value="ultra">Ultra</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

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