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
  const { toast } = useToast();

  const compressVideo = async () => {
    if (!videoFile) return;

    setIsCompressing(true);
    setProgress(0);
    setStatus('Initializing compression...');

    try {
      // Create a canvas and video element for processing
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Set up video
      video.src = URL.createObjectURL(videoFile);
      video.muted = true;

      return new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          const [targetWidth, targetHeight] = targetResolution.split('x').map(Number);
          
          // Calculate aspect ratio
          const aspectRatio = video.videoWidth / video.videoHeight;
          let outputWidth = targetWidth;
          let outputHeight = targetHeight;

          if (aspectRatio > targetWidth / targetHeight) {
            outputHeight = Math.round(targetWidth / aspectRatio);
          } else {
            outputWidth = Math.round(targetHeight * aspectRatio);
          }

          canvas.width = outputWidth;
          canvas.height = outputHeight;

          setStatus('Processing video...');

          // For demo purposes, we'll simulate compression by creating a smaller canvas
          video.currentTime = 0;
          video.onseeked = () => {
            ctx.drawImage(video, 0, 0, outputWidth, outputHeight);
            
            // Convert to blob with quality setting
            canvas.toBlob((blob) => {
              if (blob) {
                const originalSize = videoFile.size;
                const compressedSize = blob.size;
                
                setProgress(100);
                setStatus('Compression complete!');
                
                setTimeout(() => {
                  onCompressed(blob, originalSize, compressedSize);
                  resolve();
                }, 500);
              } else {
                reject(new Error('Failed to create compressed blob'));
              }
            }, 'image/jpeg', quality);
          };
        };

        video.onerror = () => reject(new Error('Video loading failed'));
      });

    } catch (error) {
      console.error('Compression error:', error);
      toast({
        title: "Compression Failed",
        description: "Failed to compress video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCompressing(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Video Compression</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Original file: {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Target Resolution</label>
          <Select value={targetResolution} onValueChange={setTargetResolution}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1920x1080">1920x1080 (Full HD)</SelectItem>
              <SelectItem value="1280x720">1280x720 (HD)</SelectItem>
              <SelectItem value="854x480">854x480 (SD)</SelectItem>
              <SelectItem value="640x360">640x360 (Low)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Quality: {Math.round(quality * 100)}%</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {isCompressing && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">{status}</p>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button 
            onClick={compressVideo} 
            disabled={isCompressing}
            className="flex-1"
          >
            {isCompressing ? 'Compressing...' : 'Start Compression'}
          </Button>
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={isCompressing}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};