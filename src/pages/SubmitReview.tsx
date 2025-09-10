import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  Star, 
  Camera, 
  Upload, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Image as ImageIcon,
  Video,
  X,
  User,
  Instagram,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VideoCompressor } from '@/components/reviews/VideoCompressor';

interface MediaFile {
  file: File;
  type: string;
  url: string;
  localUrl: string;
  id: string;
}

interface FormData {
  email: string;
  instagram: string;
  rating: number;
  description: string;
  mediaFiles: MediaFile[];
  profilePicture: File | null;
  profilePictureUrl: string;
}

interface PreviewReview {
  user_name: string;
  user_instagram_handle: string;
  rating: number;
  description: string;
  user_avatar: string;
  media_url: string;
  media_type: string;
}

const SubmitReview: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    instagram: '',
    rating: 0,
    description: '',
    mediaFiles: [],
    profilePicture: null,
    profilePictureUrl: ''
  });
  const [showCompressor, setShowCompressor] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const totalSteps = 2;

  // Upload to Cloudflare R2 via Worker
  const uploadToR2 = async (file: File, isOptimized: boolean = false): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('isOptimized', isOptimized.toString());
      
      // Your Cloudflare Worker endpoint
      const workerUrl = 'https://r2-upload-proxy.cleverpoly-store.workers.dev';
      
      setUploadProgress(25);
      
      const response = await fetch(workerUrl, {
        method: 'POST',
        body: formData,
      });
      
      setUploadProgress(75);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Upload failed: ${errorData.error || 'Unknown error'}`);
      }
      
      const result = await response.json();
      setUploadProgress(100);
      
      return result.url;
    } catch (error) {
      console.error('R2 upload failed:', error);
      throw error;
    }
  };

  const handleFileUpload = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    fileArray.forEach(file => {
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is too large. Please select files smaller than 50MB`,
          variant: "destructive"
        });
        return;
      }

      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

  const addMediaFile = (file: File, type: string) => {
    const mediaFile: MediaFile = {
      file,
      type,
      url: '',
      localUrl: URL.createObjectURL(file),
      id: `${Date.now()}-${Math.random().toString(36).substring(2)}`
    };

    setFormData(prev => ({
      ...prev,
      mediaFiles: [...prev.mediaFiles, mediaFile]
    }));

    // Upload immediately
    uploadToR2(file, false).then(url => {
      setFormData(prev => ({
        ...prev,
        mediaFiles: prev.mediaFiles.map(mf => 
          mf.id === mediaFile.id ? { ...mf, url } : mf
        )
      }));
    }).catch(error => {
      toast({
        title: "Upload failed",
        description: `Failed to upload ${file.name}. Please try again.`,
        variant: "destructive"
      });
    });
  };

  const canSubmit = () => {
    return formData.rating > 0 && formData.description.trim() !== '' && formData.mediaFiles.length > 0;
  };
    });
  };

  const addMediaFile = (file: File, type: string) => {
    const mediaFile: MediaFile = {
      file,
      type,
      url: '',
      localUrl: URL.createObjectURL(file),
      id: `${Date.now()}-${Math.random().toString(36).substring(2)}`
    };

    setFormData(prev => ({
      ...prev,
      mediaFiles: [...prev.mediaFiles, mediaFile]
    }));

    // Upload immediately
    uploadToR2(file, false).then(url => {
      setFormData(prev => ({
        ...prev,
        mediaFiles: prev.mediaFiles.map(mf => 
          mf.id === mediaFile.id ? { ...mf, url } : mf
        )
      }));
    }).catch(error => {
      toast({
        title: "Upload failed",
        description: `Failed to upload ${file.name}. Please try again.`,
        variant: "destructive"
      });
    });
  };

  const removeMediaFile = (id: string) => {
    setFormData(prev => {
      const mediaFileToRemove = prev.mediaFiles.find(mf => mf.id === id);
      if (mediaFileToRemove) {
        URL.revokeObjectURL(mediaFileToRemove.localUrl);
      }
      return {
        ...prev,
        mediaFiles: prev.mediaFiles.filter(mf => mf.id !== id)
      };
    });
  };

  const handleProfilePictureUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Profile picture must be smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Profile picture must be an image file",
        variant: "destructive"
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setFormData(prev => ({
      ...prev,
      profilePicture: file,
      profilePictureUrl: previewUrl
    }));

    // Show upload progress
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadedUrl = await uploadToR2(file, false);
      setFormData(prev => ({ 
        ...prev, 
        profilePictureUrl: uploadedUrl 
      }));
      toast({
        title: "Success",
        description: "Profile picture uploaded successfully",
      });
    } catch (error) {
      console.error('Profile picture upload failed:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload profile picture. Please try again.",
        variant: "destructive"
      });
      // Keep local preview for user experience
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async () => {
    setIsUploading(true);
    
    try {
      const reviewData = {
        user_email: formData.email || '',
        user_name: formData.instagram.replace('@', ''),
        user_instagram_handle: formData.instagram,
        media_url: formData.mediaFiles[0]?.url || '',
        media_type: formData.mediaFiles[0]?.type || 'image',
        rating: formData.rating,
        description: formData.description,
        user_avatar: formData.profilePictureUrl || '/placeholder.svg',
        is_active: false,
        sort_order: 0
      };

      const { error } = await supabase
        .from('reviews')
        .insert(reviewData);

      if (error) {
        throw error;
      }

      toast({
        title: "Thank you!",
        description: "Your review has been submitted successfully.",
      });

      // Reset form
      setFormData({
        email: '',
        instagram: '',
        rating: 0,
        description: '',
        mediaFiles: [],
        profilePicture: null,
        profilePictureUrl: ''
      });
      setCurrentStep(1);

    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToStep2 = () => {
    return formData.instagram.trim() !== '' && formData.profilePictureUrl !== '';
  };

  const handleVideoCompressed = async (compressedBlob: Blob, originalSize: number, compressedSize: number) => {
    // Convert blob to file with _optimized suffix
    const compressedFile = new File([compressedBlob], 'video_optimized.webm', {
      type: 'video/webm'
    });
    
    try {
      const uploadedUrl = await uploadToR2(compressedFile, true); // Mark as optimized
      
      // Update the media file with the uploaded optimized URL
      if (videoFile) {
        const mediaFileId = formData.mediaFiles.find(mf => 
          mf.localUrl === URL.createObjectURL(videoFile)
        )?.id;
        
        if (mediaFileId) {
          setFormData(prev => ({
            ...prev,
            mediaFiles: prev.mediaFiles.map(mf => 
              mf.id === mediaFileId ? { ...mf, url: uploadedUrl } : mf
            )
          }));
        }
      }
      
      setShowCompressor(false);
      setVideoFile(null);
      
      const compressionRatio = Math.round((1 - compressedSize / originalSize) * 100);
      toast({
        title: "Video optimized!",
        description: `File size reduced by ${compressionRatio}% (${(originalSize / 1024 / 1024).toFixed(1)}MB → ${(compressedSize / 1024 / 1024).toFixed(1)}MB)`,
      });
    } catch (error) {
      console.error('Failed to upload optimized video:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload optimized video. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSkipCompression = async () => {
    if (videoFile) {
      try {
        const uploadedUrl = await uploadToR2(videoFile, false); // Upload original
        
        const mediaFileId = formData.mediaFiles.find(mf => 
          mf.localUrl === URL.createObjectURL(videoFile)
        )?.id;
        
        if (mediaFileId) {
          setFormData(prev => ({
            ...prev,
            mediaFiles: prev.mediaFiles.map(mf => 
              mf.id === mediaFileId ? { ...mf, url: uploadedUrl } : mf
            )
          }));
        }
        
        setShowCompressor(false);
        setVideoFile(null);
        
        toast({
          title: "Video uploaded",
          description: "Original video uploaded successfully",
        });
      } catch (error) {
        console.error('Failed to upload original video:', error);
        toast({
          title: "Upload failed",
          description: "Failed to upload video. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  // Generate preview review data
  const getPreviewReview = (): PreviewReview => ({
    user_name: formData.instagram.replace('@', '') || 'Anonymous',
    user_instagram_handle: formData.instagram || '@username',
    rating: formData.rating,
    description: formData.description || 'Your review text will appear here...',
    user_avatar: formData.profilePictureUrl || '/placeholder.svg',
    media_url: formData.mediaFiles[0]?.localUrl || '',
    media_type: formData.mediaFiles[0]?.type || 'image'
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const ReviewPreview = ({ review }: { review: PreviewReview }) => (
    <div className="relative w-full max-w-sm mx-auto h-96 rounded-2xl overflow-hidden shadow-lg bg-gray-900">
      {review.media_url && (
        <div className="absolute inset-0">
          {review.media_type === 'video' ? (
            <video
              className="w-full h-full object-cover"
              src={review.media_url}
              muted
              loop
              autoPlay
              playsInline
            />
          ) : (
            <img
              className="w-full h-full object-cover"
              src={review.media_url}
              alt="Review media"
            />
          )}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
      
      <div className="relative z-10 p-4 flex flex-col justify-end h-full text-white">
        <div className="space-y-3">
          <div className="flex items-center space-x-1">
            {renderStars(review.rating)}
          </div>
          <p className="text-sm text-white/90 line-clamp-2">
            "{review.description}"
          </p>
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              {review.user_avatar && review.user_avatar !== '/placeholder.svg' ? (
                <img 
                  src={review.user_avatar} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="font-bold text-white">
                  {review.user_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1.5">
              <Instagram className="w-4 h-4 text-white/80" />
              <span className="font-medium text-white">
                {review.user_instagram_handle}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    if (currentStep === 1) {
      return (
        <div className="grid md:grid-cols-2 gap-8">
          {/* Step 1 Form */}
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Tell us about yourself</h2>
              <p className="text-muted-foreground">We need your Instagram handle and profile picture to get started</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-base font-medium">Email Address (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@example.com"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="instagram" className="text-base font-medium">Instagram Handle *</Label>
                <Input
                  id="instagram"
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="@yourhandle"
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label className="text-base font-medium">Profile Picture *</Label>
                <div className="mt-2 flex items-center space-x-4">
                  {formData.profilePictureUrl ? (
                    <div className="relative">
                      <img
                        src={formData.profilePictureUrl}
                        alt="Profile"
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <button
                        onClick={() => setFormData({ ...formData, profilePicture: null, profilePictureUrl: '' })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProfilePictureUpload(file);
                      }}
                      className="hidden"
                    />
                    <Button type="button" variant="outline" size="sm">
                      <Camera className="w-4 h-4 mr-2" />
                      {formData.profilePictureUrl ? 'Change' : 'Upload'}
                    </Button>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Card */}
          <div className="hidden md:block">
            <div className="sticky top-8">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center justify-center gap-2">
                  <Eye className="w-5 h-5" />
                  Preview
                </h3>
                <p className="text-sm text-muted-foreground">How your review will look</p>
              </div>
              <ReviewPreview review={getPreviewReview()} />
            </div>
          </div>
        </div>
      );
    }

    // Step 2
    return (
      <div className="grid md:grid-cols-2 gap-8">
        {/* Step 2 Form */}
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
              <Star className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Share your experience</h2>
            <p className="text-muted-foreground">Rate your experience and share your story</p>
          </div>

          {/* Rating */}
          <div className="text-center space-y-4">
            <Label className="text-base font-medium">How would you rate your experience? *</Label>
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className={`w-12 h-12 transition-all duration-200 ${
                    formData.rating >= star
                      ? 'text-yellow-400'
                      : 'text-gray-300 hover:text-yellow-200'
                  }`}
                >
                  <Star className="w-full h-full fill-current" />
                </button>
              ))}
            </div>
          </div>

          {/* Media Upload */}
          <div>
            <Label className="text-base font-medium">Upload Media *</Label>
            <div className="mt-2 space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) handleFileUpload(files);
                    }}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload images or videos
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Max 50MB, videos under 30 seconds
                    </p>
                  </div>
                </label>
              </div>

              {/* Media Preview */}
              {formData.mediaFiles.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {formData.mediaFiles.map((media) => (
                    <div key={media.id} className="relative group">
                      {media.type === 'video' ? (
                        <video
                          src={media.localUrl}
                          className="w-full h-24 object-cover rounded-lg"
                          controls
                        />
                      ) : (
                        <img
                          src={media.localUrl}
                          alt="Media preview"
                          className="w-full h-24 object-cover rounded-lg"
                        />
                      )}
                      <button
                        onClick={() => removeMediaFile(media.id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-base font-medium">Tell us about your experience *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Share your thoughts, what you loved, what could be improved..."
              className="mt-2 min-h-[120px]"
              required
            />
          </div>
        </div>

        {/* Preview Card */}
        <div className="hidden md:block">
          <div className="sticky top-8">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center justify-center gap-2">
                <Eye className="w-5 h-5" />
                Live Preview
              </h3>
              <p className="text-sm text-muted-foreground">Real-time preview of your review</p>
            </div>
            <ReviewPreview review={getPreviewReview()} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Share Your Review</h1>
          <p className="text-muted-foreground">Help others discover great experiences</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  i + 1 <= currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {i + 1}
                </div>
                {i < totalSteps - 1 && (
                  <div className={`w-12 h-1 ml-4 transition-colors ${
                    i + 1 < currentStep ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <Progress value={(currentStep / totalSteps) * 100} className="max-w-md mx-auto" />
        </div>

        {/* Step Content */}
        <Card className="max-w-6xl mx-auto">
          <CardContent className="p-8">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 max-w-6xl mx-auto">
          <Button
            onClick={prevStep}
            variant="outline"
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </Button>

          {currentStep < totalSteps ? (
            <Button
              onClick={nextStep}
              disabled={!canProceedToStep2()}
              className="flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit() || isUploading}
              className="flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Submit Review
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmitReview;
