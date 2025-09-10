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
  ChevronDown,
  ChevronUp,
  User,
  Eye,
  Users,
  Building
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  name: string;
  phone: string;
  certification: File | null;
  certificationUrl: string;
}

interface BrandTheme {
  brand_name: string;
  page_theme_primary: string;
  page_theme_secondary: string;
  page_theme_accent: string;
  font_family: string;
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
    profilePictureUrl: '',
    name: '',
    phone: '',
    certification: null,
    certificationUrl: ''
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [brandTheme, setBrandTheme] = useState<BrandTheme | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    rating: true,
    profile: false,
    media: false,
    description: false,
    preview: false
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const totalSteps = 3;

  // Load brand theme
  useEffect(() => {
    const loadBrandTheme = async () => {
      try {
        const { data, error } = await supabase
          .from('style_guides')
          .select('brand_name, page_theme_primary, page_theme_secondary, page_theme_accent, font_family')
          .single();

        if (error) {
          console.error('Error loading brand theme:', error);
          return;
        }

        setBrandTheme(data);
      } catch (error) {
        console.error('Error loading brand theme:', error);
      }
    };

    loadBrandTheme();
  }, []);

  // Cleanup local URLs on component unmount
  useEffect(() => {
    return () => {
      formData.mediaFiles.forEach(mediaFile => {
        URL.revokeObjectURL(mediaFile.localUrl);
      });
      if (formData.profilePictureUrl && formData.profilePictureUrl.startsWith('blob:')) {
        URL.revokeObjectURL(formData.profilePictureUrl);
      }
    };
  }, []);

  // Upload to Cloudflare R2 via Worker proxy
  const uploadToR2 = async (file: File): Promise<string> => {
    console.log('Uploading media to R2...');
    
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `media-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Use Cloudflare Worker proxy to upload to R2
      const formData = new FormData();
      formData.append('file', file);
      
      // Use your deployed Cloudflare Worker
      const workerUrl = 'https://r2-upload-proxy.cleverpoly-store.workers.dev';
      
      // Show upload progress
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
      console.log('Media uploaded to R2 successfully');
      return result.url;
    } catch (error) {
      console.log('R2 upload failed, using Supabase storage as fallback:', error);
      
      // Fallback to Supabase storage
      const bucket = 'reviews';
      const fileExt = file.name.split('.').pop();
      const fileName = `media-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      console.log('Using Supabase storage as fallback...');
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      console.log('Media uploaded to Supabase successfully');
      return urlData.publicUrl;
    }
  };

  const handleFileUpload = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    fileArray.forEach(file => {
      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is too large. Please select files smaller than 50MB`,
          variant: "destructive"
        });
        return;
      }

      // Validate video duration (30 seconds max)
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
      localUrl: URL.createObjectURL(file),
      id: `${Date.now()}-${Math.random().toString(36).substring(2)}`
    };

    setFormData(prev => ({
      ...prev,
      mediaFiles: [...prev.mediaFiles, mediaFile]
    }));

    // Start upload immediately
    setTimeout(() => {
      uploadToR2(file).then(url => {
        setFormData(prev => ({
          ...prev,
          mediaFiles: prev.mediaFiles.map(mf => 
            mf.id === mediaFile.id ? { ...mf, url } : mf
          )
        }));
      }).catch(error => {
        console.warn('Upload failed:', error);
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}. Please try again.`,
          variant: "destructive"
        });
      });
    }, 100);
  };

  const removeMediaFile = (id: string) => {
    setFormData(prev => {
      const mediaFileToRemove = prev.mediaFiles.find(mf => mf.id === id);
      if (mediaFileToRemove) {
        // Clean up the local URL to prevent memory leaks
        URL.revokeObjectURL(mediaFileToRemove.localUrl);
      }
      return {
        ...prev,
        mediaFiles: prev.mediaFiles.filter(mf => mf.id !== id)
      };
    });
  };

  const handleProfilePictureUpload = async (file: File) => {
    console.log('Profile picture upload started:', file.name, file.size, file.type);
    
    // Validate file size (5MB max for profile pictures)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Profile picture must be smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    // Validate file type (images only)
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Profile picture must be an image file (JPG, PNG, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Show immediate preview
    const previewUrl = URL.createObjectURL(file);
    setFormData(prev => ({
      ...prev,
      profilePicture: file,
      profilePictureUrl: previewUrl
    }));

    // Show upload progress
    toast({
      title: "Uploading profile picture...",
      description: "Please wait while we upload your photo",
    });

    try {
      // Upload profile picture
      const uploadedUrl = await uploadToR2(file);
      console.log('Profile picture uploaded successfully:', uploadedUrl);
      
      setFormData(prev => ({ 
        ...prev, 
        profilePictureUrl: uploadedUrl 
      }));
      
      toast({
        title: "Success!",
        description: "Profile picture uploaded successfully",
      });
    } catch (error) {
      console.error('Profile picture upload failed:', error);
      toast({
        title: "Upload failed",
        description: `Failed to upload profile picture: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
      
      // Keep the preview URL as fallback
      setFormData(prev => ({ 
        ...prev, 
        profilePictureUrl: previewUrl 
      }));
    }
  };

  const handleSubmit = async () => {
    setUploading(true);
    
    try {
      const reviewData = {
        user_email: formData.email || '',
        user_name: formData.name || '',
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
        title: "Success!",
        description: "Your review has been submitted successfully and is pending approval.",
      });

      // Reset form
      setFormData({
        email: '',
        instagram: '',
        rating: 0,
        description: '',
        mediaFiles: [],
        profilePicture: null,
        profilePictureUrl: '',
        name: '',
        phone: '',
        certification: null,
        certificationUrl: ''
      });
      setCurrentStep(1);

    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: `Failed to submit review: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Rate Your Experience</h2>
              <p className="text-gray-600">How would you rate your overall experience?</p>
            </div>

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

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-base font-medium">Your Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your full name"
                  className="mt-2"
                />
              </div>

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
                <Label htmlFor="instagram" className="text-base font-medium">Instagram Handle</Label>
                <Input
                  id="instagram"
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="@yourhandle"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-base font-medium">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Share Your Media</h2>
              <p className="text-gray-600">Upload photos or videos of your experience</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Profile Picture</Label>
                <div className="mt-2 flex items-center space-x-4">
                  {formData.profilePictureUrl ? (
                    <img
                      src={formData.profilePictureUrl}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
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
                    <label
                      htmlFor="profile-upload"
                      className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-base font-medium">Media Files (Photos/Videos)</Label>
                <div className="mt-2 space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={(e) => {
                        if (e.target.files) handleFileUpload(e.target.files);
                      }}
                      className="hidden"
                      id="media-upload"
                    />
                    <label htmlFor="media-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600">Drop files here or click to browse</p>
                      <p className="text-sm text-gray-500 mt-1">Images and videos up to 50MB</p>
                    </label>
                  </div>

                  {formData.mediaFiles.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {formData.mediaFiles.map((media) => (
                        <div key={media.id} className="relative group">
                          {media.type === 'video' ? (
                            <video
                              src={media.localUrl}
                              className="w-full h-32 object-cover rounded-lg"
                              controls
                            />
                          ) : (
                            <img
                              src={media.localUrl}
                              alt="Upload"
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          )}
                          <button
                            onClick={() => removeMediaFile(media.id)}
                            className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Tell Us More</h2>
              <p className="text-gray-600">Share details about your experience</p>
            </div>

            <div>
              <Label htmlFor="description" className="text-base font-medium">Your Review</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell us about your experience..."
                className="mt-2 min-h-[120px]"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Review Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Rating:</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          formData.rating >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{formData.name || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Instagram:</span>
                  <span className="font-medium">{formData.instagram || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Media files:</span>
                  <span className="font-medium">{formData.mediaFiles.length} file(s)</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return formData.rating > 0 && formData.instagram.trim() !== '' && formData.name.trim() !== '';
      case 2:
        return formData.mediaFiles.length > 0 && formData.profilePictureUrl !== '';
      case 3:
        return formData.description.trim() !== '';
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            {/* Progress indicator */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-gray-600">
                  Step {currentStep} of {totalSteps}
                </span>
                <span className="text-sm font-medium text-gray-600">
                  {Math.round((currentStep / totalSteps) * 100)}% Complete
                </span>
              </div>
              <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
            </div>

            {/* Step content */}
            {renderStepContent()}

            {/* Navigation buttons */}
            <div className="flex justify-between mt-8">
              <Button
                onClick={prevStep}
                disabled={currentStep === 1}
                variant="outline"
                className="flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {currentStep === totalSteps ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceedToNextStep() || uploading}
                  className="flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Review
                      <CheckCircle className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={nextStep}
                  disabled={!canProceedToNextStep()}
                  className="flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default SubmitReview;
