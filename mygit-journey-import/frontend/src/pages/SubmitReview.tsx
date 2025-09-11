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

  // Camera functionality
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: cameraMode === 'video' 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to take photos or videos.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setIsRecording(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            addMediaFile(file, 'image');
            stopCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const startVideoRecording = () => {
    if (streamRef.current) {
      const mediaRecorder = new MediaRecorder(streamRef.current);
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const file = new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' });
        addMediaFile(file, 'video');
        stopCamera();
      };
      
      setMediaRecorder(mediaRecorder);
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      const timer = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 30) {
            stopVideoRecording();
            clearInterval(timer);
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getSectionStatus = (section: string) => {
    switch (section) {
      case 'rating':
        return formData.rating > 0 ? 'completed' : 'pending';
      case 'profile':
        return formData.profilePictureUrl ? 'completed' : 'optional';
      case 'media':
        return formData.mediaFiles.length > 0 ? 'completed' : 'required';
      case 'description':
        return formData.description.trim().length > 10 ? 'completed' : 'required';
      default:
        return 'pending';
    }
  };

  const submitReview = async () => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      console.log('Starting review submission...');
      console.log('Form data:', formData);
      console.log('Media files:', formData.mediaFiles);
      
      // Media is required - ensure we have at least one media file
      if (formData.mediaFiles.length === 0) {
        console.error('No media files found');
        throw new Error('At least one media file is required. Please upload a video or image before submitting.');
      }

      // Ensure all media files are uploaded
      const uploadedMediaFiles = formData.mediaFiles.filter(mf => mf.url);
      console.log('Uploaded media files:', uploadedMediaFiles);
      
      if (uploadedMediaFiles.length === 0) {
        console.error('No uploaded media files found');
        throw new Error('Please wait for your media files to finish uploading before submitting.');
      }

      // Use the first media file as the primary media for the review
      const primaryMedia = uploadedMediaFiles[0];

      // Insert review into database
      console.log('Submitting review to database...');
      const reviewData: any = {
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

      const { data, error } = await supabase
        .from('reviews')
        .insert(reviewData)
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Review submitted successfully');

      toast({
        title: "Success!",
        description: "Your review has been submitted for approval.",
      });

      setCurrentStep(3); // Success step
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: `Failed to submit review: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else {
      submitReview();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: {
        const emailValid = formData.email.includes('@');
        const instagramValid = formData.instagram.trim().length > 0;
        console.log('Step 1 validation:', { emailValid, instagramValid, email: formData.email, instagram: formData.instagram });
        return emailValid && instagramValid;
      }
      case 2: {
        const ratingValid = formData.rating > 0;
        const descriptionValid = formData.description.trim().length > 10;
        const mediaValid = formData.mediaFiles.length > 0;
        console.log('Step 2 validation:', { ratingValid, descriptionValid, mediaValid, rating: formData.rating, descriptionLength: formData.description.trim().length, mediaCount: formData.mediaFiles.length });
        return ratingValid && descriptionValid && mediaValid;
      }
      case 3: {
        const nameValid = formData.name.trim().length > 0;
        const phoneValid = formData.phone.trim().length > 0;
        console.log('Step 3 validation:', { nameValid, phoneValid, name: formData.name, phone: formData.phone });
        return nameValid && phoneValid;
      }
      default: return false;
    }
  };

  const steps = [
    { id: 1, title: "Contact Info", icon: <Mail className="h-5 w-5" /> },
    { id: 2, title: "Review & Media", icon: <Star className="h-5 w-5" /> },
    { id: 3, title: "Personal Details", icon: <User className="h-5 w-5" /> }
  ];

  // Success screen
  if (currentStep === 4) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
          <CardContent className="p-8 text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mx-auto">
                <svg className="h-10 w-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558-.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z"/>
                </svg>
            </div>
              {/* Sparkle effect */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-yellow-400 rounded-full animate-pulse delay-150"></div>
              <div className="absolute top-2 -left-3 w-3 h-3 bg-yellow-400 rounded-full animate-pulse delay-300"></div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">We've received your application!</h2>
            <p className="text-slate-600 mb-6">
              We will process it and reach out to you in a few days.
            </p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 md:p-6 lg:p-8">
      <Card className="w-full max-w-4xl shadow-2xl border-0 bg-white">
        <CardContent className="p-6 md:p-8 lg:p-10">
          {/* Enhanced Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
              Share Your Review
            </h1>
            <p className="text-sm md:text-base text-slate-600 max-w-md mx-auto">
              Help others by sharing your experience with our community
            </p>
          </div>

          {/* Enhanced Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    currentStep > step.id
                      ? 'bg-yellow-500 border-yellow-500 text-white'
                      : currentStep === step.id
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-white border-slate-300 text-slate-400'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <div className="text-lg font-bold">{step.id}</div>
                    )}
                  </div>
                  <span className={`text-sm mt-2 font-medium transition-colors ${
                    currentStep >= step.id ? 'text-purple-600' : 'text-slate-400'
                  }`}>
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="h-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
            </div>
          </div>

          {/* Step 1: Contact Info */}
          {currentStep === 1 && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">Contact Information</h2>
                <p className="text-slate-600">We'll use this to verify your review and potentially feature you</p>
              </div>
              
              <div className="space-y-8">
                <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
                  <div className="space-y-8">
                    <div>
                      <Label htmlFor="email" className="text-base font-semibold text-slate-700 mb-4 block">
                        Email Address *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="your@email.com"
                        className="h-16 text-lg border-slate-200 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                      />
                      <p className="text-sm text-slate-500 mt-3">We'll never share your email with anyone</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="instagram" className="text-base font-semibold text-slate-700 mb-4 block">
                        Instagram Handle *
                      </Label>
                      <Input
                        id="instagram"
                        type="text"
                        value={formData.instagram}
                        onChange={(e) => {
                          let value = e.target.value;
                          // Automatically add @ if not present
                          if (value && !value.startsWith('@')) {
                            value = '@' + value;
                          }
                          setFormData(prev => ({ ...prev, instagram: value }));
                        }}
                        placeholder="@yourusername"
                        className="h-16 text-lg border-slate-200 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                      />
                      <p className="text-sm text-slate-500 mt-3">Your Instagram will be displayed with your review</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Review & Media */}
          {currentStep === 2 && (
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">Share Your Experience</h2>
                <p className="text-slate-600">Tell us about your experience and add some media to make it shine</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Form */}
                <div className="space-y-6">
                {/* Rating Section */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <Label className="text-base font-semibold text-slate-700 mb-4 block">
                      How would you rate your experience?
                    </Label>
                    <div className="flex justify-center gap-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                  <button
                          key={star}
                          onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                          className={`w-16 h-16 rounded-full transition-all duration-200 ${
                            star <= formData.rating
                              ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg scale-110'
                              : 'bg-white text-slate-400 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          <Star className="h-8 w-8 mx-auto" fill={star <= formData.rating ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                    {formData.rating > 0 && (
                      <p className="text-center text-sm text-slate-600 mt-4">
                        You rated this {formData.rating} star{formData.rating > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Review Description */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <Label htmlFor="description" className="text-base font-semibold text-slate-700 mb-4 block">
                      Tell us more about your experience
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Share your thoughts about the product, service, or overall experience..."
                      className="min-h-32 text-lg border-slate-200 focus:border-purple-500 focus:ring-purple-500 resize-none bg-white rounded-xl"
                    />
                    <p className="text-sm text-slate-500 mt-3">
                      {formData.description.length}/500 characters
                    </p>
                  </div>

                  {/* Media Upload Section */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Add Your Media</h3>
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                      Please upload a short 30-second video of yourself sharing your experience, or add an animation or render that illustrates your story better.
                    </p>
                    
                    {/* Upload Progress */}
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm font-medium text-purple-700">Uploading media...</span>
                        </div>
                        <div className="w-full bg-purple-200 rounded-full h-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Media Upload Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {/* File Upload */}
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-purple-400 transition-colors bg-slate-50 hover:bg-purple-50/30">
                        <input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files) handleFileUpload(files);
                          }}
                          className="hidden"
                          id="media-upload"
                        />
                        <label htmlFor="media-upload" className="cursor-pointer">
                          <div className="space-y-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                              <Upload className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 mb-1">
                                Upload Files
                              </p>
                              <p className="text-xs text-slate-500">
                                Images or videos up to 50MB
                              </p>
                            </div>
                          </div>
                        </label>
                      </div>

                      {/* Camera Capture */}
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-green-400 transition-colors bg-slate-50 hover:bg-green-50/30">
                        <button
                          onClick={startCamera}
                          className="w-full"
                        >
                          <div className="space-y-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto">
                              <Camera className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 mb-1">
                                Take Photo/Video
                              </p>
                              <p className="text-xs text-slate-500">
                                Use your camera
                              </p>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Media Files List */}
                    {formData.mediaFiles.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-slate-700">Your Media Files ({formData.mediaFiles.length})</h4>
                        {formData.mediaFiles.map((mediaFile) => (
                          <div key={mediaFile.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <div className="flex items-center gap-3">
                              {mediaFile.type === 'image' ? (
                                <ImageIcon className="h-6 w-6 text-green-500" />
                              ) : (
                                <Video className="h-6 w-6 text-blue-500" />
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-slate-900 text-sm">{mediaFile.file.name}</p>
                                <p className="text-xs text-slate-500">
                                  {(mediaFile.file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {mediaFile.url ? (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="text-xs font-medium">Uploaded</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-purple-600">
                                    <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs font-medium">Uploading...</span>
                                  </div>
                                )}
                                <Button
                                  onClick={() => removeMediaFile(mediaFile.id)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Preview */}
                <div className="hidden lg:block">
                  <div className="sticky top-8">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Preview</h3>
                    <div className="flex justify-center">
                      {/* Review Card Preview */}
                      <div className="video-card relative w-64 h-96 aspect-[2/3] flex-shrink-0 rounded-2xl overflow-hidden transition-transform duration-500 ease-in-out hover:scale-105 shadow-lg group">
                        {/* Media Content */}
                        {formData.mediaFiles.length > 0 ? (
                          formData.mediaFiles[0].type === 'video' ? (
                            <video 
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                              muted 
                              loop 
                              playsInline 
                              src={formData.mediaFiles[0].localUrl}
                            />
                          ) : (
                            <img 
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                              src={formData.mediaFiles[0].localUrl} 
                              alt="Review image" 
                            />
                          )
                        ) : (
                          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                            <div className="text-center text-slate-500">
                              <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                              <p className="text-sm">Media Preview</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                        
                        {/* Content */}
                        <div className="relative z-10 p-4 flex flex-col justify-end h-full text-white">
                          <div className="space-y-3">
                            {/* Stars */}
                            <div className="flex items-center space-x-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= formData.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                  }`}
                                  fill={star <= formData.rating ? 'currentColor' : 'none'}
                                />
                              ))}
                            </div>
                            
                            {/* Description */}
                            <p className="text-sm text-white/90 line-clamp-2 select-none">
                              "{formData.description || 'Your review description will appear here...'}"
                            </p>
                            
                            {/* User Info */}
                            <div className="flex items-center space-x-2 text-sm">
                              {/* Avatar */}
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white">
                                {formData.profilePictureUrl ? (
                                  <img 
                                    src={formData.profilePictureUrl} 
                                    alt="Profile" 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span>
                                    {formData.instagram ? formData.instagram.charAt(1).toUpperCase() : 'U'}
                                  </span>
                                )}
                              </div>
                              
                              {/* Instagram Handle */}
                              <div className="flex items-center space-x-1.5 group">
                                <svg className="w-4 h-4 text-white/80 group-hover:text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.585-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.85-.07-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.069-1.645-.069-4.85s.011-3.585.069-4.85c.149-3.225 1.664 4.771 4.919-4.919 1.266-.057 1.644-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.689-.073-4.948-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.791-4 4-4 4 1.79 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44 1.441-.645 1.441-1.44-.645-1.44-1.441-1.44z"/>
                                </svg>
                                <span className="font-medium text-white group-hover:text-blue-300 transition-colors">
                                  {formData.instagram || '@yourusername'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Personal Details */}
          {currentStep === 3 && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">Personal Details</h2>
                <p className="text-slate-600">Complete your profile information</p>
              </div>
              
              <div className="space-y-8">
                {/* Confirmed Details */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Confirmed Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Email:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{formData.email}</span>
                        <CheckCircle className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Instagram:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{formData.instagram}</span>
                        <CheckCircle className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Rating:</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= formData.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                              fill={star <= formData.rating ? 'currentColor' : 'none'}
                            />
                          ))}
                        </div>
                        <CheckCircle className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
                  <div className="space-y-8">
                    <div>
                      <Label htmlFor="name" className="text-base font-semibold text-slate-700 mb-4 block">
                        Name *
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. John Smith"
                        className="h-16 text-lg border-slate-200 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone" className="text-base font-semibold text-slate-700 mb-4 block">
                        Phone *
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="e.g. 07991 123 456"
                        className="h-16 text-lg border-slate-200 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                      />
                    </div>

                    {/* Certification Upload */}
                    <div>
                      <Label className="text-base font-semibold text-slate-700 mb-4 block">
                        Certification (optional)
                      </Label>
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors bg-slate-50 hover:bg-purple-50/30">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setFormData(prev => ({ ...prev, certification: file }));
                              // Upload certification
                              uploadToR2(file).then(url => {
                                setFormData(prev => ({ ...prev, certificationUrl: url }));
                              }).catch(error => {
                                console.warn('Certification upload failed:', error);
                              });
                            }
                          }}
                          className="hidden"
                          id="certification-upload"
                        />
                        <label htmlFor="certification-upload" className="cursor-pointer">
                          <div className="space-y-4">
                            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto">
                              <Upload className="h-8 w-8 text-white" />
                            </div>
                            <div>
                              <p className="text-base font-semibold text-slate-900 mb-2">
                                Click to upload or drag and drop
                              </p>
                              <p className="text-sm text-slate-500">
                                PDF, DOC, DOCX, JPG, PNG up to 10MB
                              </p>
                            </div>
                          </div>
                        </label>
                      </div>
                      {formData.certification && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="text-sm font-medium text-green-800">
                              {formData.certification.name} uploaded successfully
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-12 pt-8 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-8 py-3 h-12 text-base"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            <Button
              onClick={nextStep}
              disabled={!canProceed() || uploading}
              className="px-8 py-3 h-12 text-base bg-purple-600 hover:bg-purple-700"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : currentStep === totalSteps ? (
                <>
                  Submit Review
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubmitReview;
