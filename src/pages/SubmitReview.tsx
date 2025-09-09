import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  Star, 
  Camera, 
  Upload, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Heart,
  MessageCircle,
  Image as ImageIcon,
  Video,
  Mic,
  X,
  User,
  Eye
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MediaFile {
  file: File;
  type: string;
  url: string;
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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const totalSteps = 3;

  // Upload to Cloudflare R2 via Worker proxy
  const uploadToR2 = async (file: File): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `media-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const formData = new FormData();
      formData.append('file', file);
      
      const workerUrl = 'https://r2-upload-proxy.cleverpoly-store.workers.dev';
      setUploadProgress(10);
      
      const response = await fetch(workerUrl, {
        method: 'POST',
        body: formData,
      });
      
      setUploadProgress(50);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`R2 upload failed: ${response.status} ${errorData.error || 'Unknown error'}`);
      }
      
      setUploadProgress(90);
      
      const result = await response.json();
      setUploadProgress(100);
      return result.url;
    } catch (error) {
      // Fallback to Supabase storage
      const bucket = 'reviews';
      const fileExt = file.name.split('.').pop();
      const fileName = `media-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return urlData.publicUrl;
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

      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          if (video.duration > 30) {
            toast({
              title: "Video too long",
              description: `${file.name} is too long. Please select videos shorter than 30 seconds`,
              variant: "destructive"
            });
            return;
          }
          addMediaFile(file, 'video');
        };
        video.src = URL.createObjectURL(file);
      } else {
        addMediaFile(file, 'image');
      }
    });
  };

  const addMediaFile = (file: File, type: string) => {
    const mediaFile: MediaFile = {
      file,
      type,
      url: '',
      id: `${Date.now()}-${Math.random().toString(36).substring(2)}`
    };

    setFormData(prev => ({
      ...prev,
      mediaFiles: [...prev.mediaFiles, mediaFile]
    }));

    setTimeout(() => {
      uploadToR2(file).then(url => {
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
    }, 100);
  };

  const removeMediaFile = (id: string) => {
    setFormData(prev => ({
      ...prev,
      mediaFiles: prev.mediaFiles.filter(mf => mf.id !== id)
    }));
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

    try {
      const uploadedUrl = await uploadToR2(file);
      setFormData(prev => ({ 
        ...prev, 
        profilePictureUrl: uploadedUrl 
      }));
      
      toast({
        title: "Success!",
        description: "Profile picture uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload profile picture",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    setShowCamera(false);
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return formData.email.includes('@') && formData.instagram.trim().length > 0;
      case 2:
        return formData.rating > 0 && formData.description.trim().length > 10 && formData.mediaFiles.length > 0;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps && isStepValid(currentStep)) {
      setCurrentStep(prev => prev + 1);
    } else if (currentStep === 2 && isStepValid(currentStep)) {
      submitReview();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const submitReview = async () => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      if (formData.mediaFiles.length === 0) {
        throw new Error('At least one media file is required.');
      }

      const uploadedMediaFiles = formData.mediaFiles.filter(mf => mf.url);
      
      if (uploadedMediaFiles.length === 0) {
        throw new Error('Please wait for your media files to finish uploading.');
      }

      const primaryMedia = uploadedMediaFiles[0];

      const reviewData = {
        user_email: formData.email,
        user_instagram_handle: formData.instagram,
        rating: formData.rating,
        description: formData.description,
        user_avatar: formData.profilePictureUrl || '/placeholder.svg',
        is_active: false,
        sort_order: 0,
        media_url: primaryMedia.url,
        media_type: primaryMedia.type
      };

      const { error } = await supabase
        .from('reviews')
        .insert(reviewData);

      if (error) {
        throw error;
      }

      toast({
        title: "Success!",
        description: "Your review has been submitted for approval.",
      });

      setCurrentStep(3);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const steps = [
    { id: 1, title: "Contact Info", icon: <User className="h-5 w-5" /> },
    { id: 2, title: "Your Review", icon: <Star className="h-5 w-5" /> }
  ];

  // Success screen
  if (currentStep === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Review Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for sharing your experience. Your review is now pending approval.
            </p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-xl border-0">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Share Your Review</h1>
            <p className="text-muted-foreground">Help others by sharing your experience</p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-4 gap-8">
              {steps.map((step) => (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    currentStep >= step.id
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-background border-muted text-muted-foreground'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <span className={`text-sm mt-2 font-medium ${
                    currentStep >= step.id ? 'text-blue-600' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
            <div className="w-full bg-muted rounded-full h-2 max-w-xs mx-auto">
              <div 
                className="h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / 2) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            {/* Step 1: Contact Info */}
            {currentStep === 1 && (
              <div className="max-w-md mx-auto space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Contact Information</h2>
                  <p className="text-muted-foreground">We'll use this to verify your review</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="instagram">Instagram Handle *</Label>
                    <Input
                      id="instagram"
                      type="text"
                      value={formData.instagram}
                      onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                      placeholder="@yourusername"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Review Content */}
            {currentStep === 2 && (
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Share Your Experience</h2>
                  <p className="text-muted-foreground">Rate your experience and add media to tell your story</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Rating */}
                    <div className="bg-muted/50 rounded-lg p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Star className="h-5 w-5" />
                        Rate Your Experience *
                      </h3>
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                            className={`w-12 h-12 rounded-full transition-all ${
                              star <= formData.rating
                                ? 'bg-yellow-400 text-white scale-110'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            <Star className="h-6 w-6 mx-auto" fill={star <= formData.rating ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                      </div>
                      {formData.rating > 0 && (
                        <p className="text-center text-sm text-muted-foreground mt-2">
                          {formData.rating} star{formData.rating > 1 ? 's' : ''} selected
                        </p>
                      )}
                    </div>

                    {/* Description */}
                    <div className="bg-muted/50 rounded-lg p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" />
                        Tell Your Story *
                      </h3>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Share your experience with others. What made it special?"
                        className="min-h-32 resize-none"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {formData.description.length} characters (minimum 10)
                      </p>
                    </div>

                    {/* Profile Picture */}
                    <div className="bg-muted/50 rounded-lg p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Profile Picture (Optional)
                      </h3>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                          {formData.profilePictureUrl ? (
                            <img 
                              src={formData.profilePictureUrl} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleProfilePictureUpload(file);
                            }}
                            className="hidden"
                            id="profile-upload"
                          />
                          <label htmlFor="profile-upload">
                            <Button variant="outline" size="sm" className="cursor-pointer">
                              <Upload className="h-4 w-4 mr-2" />
                              {formData.profilePictureUrl ? 'Change' : 'Upload'}
                            </Button>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Media Upload */}
                  <div className="bg-muted/50 rounded-lg p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Add Media * ({formData.mediaFiles.length} uploaded)
                    </h3>
                    
                    <div 
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                      onDrop={(e) => {
                        e.preventDefault();
                        handleFileUpload(e.dataTransfer.files);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => document.getElementById('media-upload')?.click()}
                    >
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="font-medium mb-2">Upload photos or videos</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Drag and drop or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Max 50MB, videos under 30 seconds
                      </p>
                    </div>

                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                      className="hidden"
                      id="media-upload"
                    />

                    {/* Media Preview */}
                    {formData.mediaFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {formData.mediaFiles.map((mediaFile) => (
                          <div key={mediaFile.id} className="flex items-center gap-3 p-3 bg-background rounded-lg">
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              {mediaFile.type === 'video' ? (
                                <Video className="h-6 w-6 text-muted-foreground" />
                              ) : (
                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{mediaFile.file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(mediaFile.file.size / 1024 / 1024).toFixed(1)} MB
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMediaFile(mediaFile.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload Progress */}
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm font-medium text-blue-700">Uploading...</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <Button
              onClick={nextStep}
              disabled={!isStepValid(currentStep) || uploading}
              className="flex items-center gap-2"
            >
              {currentStep === 2 ? (
                uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Review'
                )
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Hidden canvas for camera capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Camera modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <video ref={videoRef} autoPlay muted className="w-full rounded-lg mb-4" />
            <div className="flex gap-2 justify-center">
              <Button onClick={() => stopCamera()} variant="outline">
                Cancel
              </Button>
              {cameraMode === 'photo' ? (
                <Button onClick={() => {}}>
                  Take Photo
                </Button>
              ) : (
                <Button onClick={() => {}}>
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmitReview;