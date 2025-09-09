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
  businessTitle: string;
  businessDescription: string;
  companyType: string;
  employeeCount: string;
  businessAddress: {
    country: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    zipcode: string;
  };
  billingAddress: {
    country: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    zipcode: string;
  };
  sameAsBusiness: boolean;
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
    businessTitle: '',
    businessDescription: '',
    companyType: 'llc',
    employeeCount: '1-20',
    businessAddress: {
      country: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipcode: ''
    },
    billingAddress: {
      country: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipcode: ''
    },
    sameAsBusiness: true
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

  const totalSteps = 7;

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
    setFormData(prev => ({
      ...prev,
      mediaFiles: prev.mediaFiles.filter(mf => mf.id !== id)
    }));
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
      case 1: 
        return true;
      case 2: {
        const businessTitleValid = formData.businessTitle.trim().length > 0;
        const businessDescriptionValid = formData.businessDescription.trim().length > 0;
        const companyTypeValid = formData.companyType.length > 0;
        const employeeCountValid = formData.employeeCount.length > 0;
        return businessTitleValid && businessDescriptionValid && companyTypeValid && employeeCountValid;
      }
      default: return true;
    }
  };

  const steps = [
    { id: 1, title: "Create account", icon: <CheckCircle className="h-4 w-4" /> },
    { id: 2, title: "Business overview", icon: <CheckCircle className="h-4 w-4" /> },
    { id: 3, title: "Build profile", icon: <CheckCircle className="h-4 w-4" /> },
    { id: 4, title: "Bank details", icon: <CheckCircle className="h-4 w-4" /> },
    { id: 5, title: "Tax information", icon: <CheckCircle className="h-4 w-4" /> },
    { id: 6, title: "Two-factor authentication", icon: <CheckCircle className="h-4 w-4" /> },
    { id: 7, title: "Confirm details", icon: <CheckCircle className="h-4 w-4" /> }
  ];

  // Success screen
  if (currentStep === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Review Submitted!</h2>
            <p className="text-slate-600 mb-6">
              Thank you for sharing your experience. Your review is now pending approval.
            </p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-2xl border-0 bg-white rounded-3xl">
        <CardContent className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Button 
              variant="ghost" 
              onClick={() => window.location.href = '/'}
              className="text-slate-600 hover:text-slate-900 p-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to dashboard
            </Button>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4 mb-6">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : currentStep === step.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-200 text-slate-400'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-medium">{step.id}</span>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-px mx-2 ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center mb-6">
              <p className="text-sm text-slate-600">Business overview</p>
            </div>
          </div>

          {/* Step 2: Business Overview */}
          {currentStep === 2 && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-3">About your business</h2>
              </div>
              
              <div className="space-y-8">
                {/* Business Title */}
                <div>
                  <Label htmlFor="businessTitle" className="text-sm font-medium text-slate-700 mb-3 block">
                    Your business title
                  </Label>
                  <Input
                    id="businessTitle"
                    type="text"
                    value={formData.businessTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessTitle: e.target.value }))}
                    placeholder="Text input"
                    className="h-12 text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                  />
                </div>

                {/* Business Description */}
                <div>
                  <Label htmlFor="businessDescription" className="text-sm font-medium text-slate-700 mb-3 block">
                    Description of business conducted
                    <span className="text-slate-500 block text-xs font-normal">Helpful description</span>
                  </Label>
                  <Textarea
                    id="businessDescription"
                    value={formData.businessDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessDescription: e.target.value }))}
                    placeholder="I've typed something here"
                    className="min-h-24 text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg resize-none"
                  />
                </div>

                {/* Company Type */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-3 block">
                    Company type
                    <span className="text-slate-500 block text-xs font-normal">Helpful description</span>
                  </Label>
                  <RadioGroup 
                    value={formData.companyType} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, companyType: value }))}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="llc" id="llc" />
                      <Label htmlFor="llc" className="text-base">LLC / Partnership / Single-member</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="corp" id="corp" />
                      <Label htmlFor="corp" className="text-base">C / S Corporation</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="bcorp" id="bcorp" />
                      <Label htmlFor="bcorp" className="text-base">B Corporation</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Number of Employees */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-3 block">
                    Number of employees
                    <span className="text-slate-500 block text-xs font-normal">Helpful description</span>
                  </Label>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, employeeCount: '1-20' }))}
                      className={`p-4 border-2 rounded-lg text-center transition-all ${
                        formData.employeeCount === '1-20'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <User className="h-6 w-6 mx-auto mb-2 text-slate-600" />
                      <span className="text-sm font-medium">1-20</span>
                    </button>
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, employeeCount: '21-49' }))}
                      className={`p-4 border-2 rounded-lg text-center transition-all ${
                        formData.employeeCount === '21-49'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Users className="h-6 w-6 mx-auto mb-2 text-slate-600" />
                      <span className="text-sm font-medium">21-49</span>
                    </button>
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, employeeCount: '50+' }))}
                      className={`p-4 border-2 rounded-lg text-center transition-all ${
                        formData.employeeCount === '50+'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Building className="h-6 w-6 mx-auto mb-2 text-slate-600" />
                      <span className="text-sm font-medium">50+</span>
                    </button>
                  </div>
                </div>

                {/* Business Address */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-3 block">
                    Business address
                    <span className="text-slate-500 block text-xs font-normal">Helpful description</span>
                  </Label>
                  <div className="space-y-4">
                    <Select 
                      value={formData.businessAddress.country}
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        businessAddress: { ...prev.businessAddress, country: value }
                      }))}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us">United States</SelectItem>
                        <SelectItem value="ca">Canada</SelectItem>
                        <SelectItem value="uk">United Kingdom</SelectItem>
                        <SelectItem value="au">Australia</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Input
                      placeholder="Address line 1"
                      value={formData.businessAddress.addressLine1}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        businessAddress: { ...prev.businessAddress, addressLine1: e.target.value }
                      }))}
                      className="h-12"
                    />
                    
                    <Input
                      placeholder="Address line 2"
                      value={formData.businessAddress.addressLine2}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        businessAddress: { ...prev.businessAddress, addressLine2: e.target.value }
                      }))}
                      className="h-12"
                    />
                    
                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        placeholder="City"
                        value={formData.businessAddress.city}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          businessAddress: { ...prev.businessAddress, city: e.target.value }
                        }))}
                        className="h-12"
                      />
                      <Select 
                        value={formData.businessAddress.state}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          businessAddress: { ...prev.businessAddress, state: value }
                        }))}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ca">CA</SelectItem>
                          <SelectItem value="ny">NY</SelectItem>
                          <SelectItem value="tx">TX</SelectItem>
                          <SelectItem value="fl">FL</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Zipcode"
                        value={formData.businessAddress.zipcode}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          businessAddress: { ...prev.businessAddress, zipcode: e.target.value }
                        }))}
                        className="h-12"
                      />
                    </div>
                  </div>
                </div>

                {/* Billing Address */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-3 block">
                    Billing address
                    <span className="text-slate-500 block text-xs font-normal">Helpful description</span>
                  </Label>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox 
                      id="sameAsBusiness"
                      checked={formData.sameAsBusiness}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sameAsBusiness: checked as boolean }))}
                    />
                    <Label htmlFor="sameAsBusiness" className="text-sm">Same as business address</Label>
                  </div>
                  
                  {!formData.sameAsBusiness && (
                    <div className="space-y-4">
                      <Select 
                        value={formData.billingAddress.country}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          billingAddress: { ...prev.billingAddress, country: value }
                        }))}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="us">United States</SelectItem>
                          <SelectItem value="ca">Canada</SelectItem>
                          <SelectItem value="uk">United Kingdom</SelectItem>
                          <SelectItem value="au">Australia</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Input
                        placeholder="Address line 1"
                        value={formData.billingAddress.addressLine1}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          billingAddress: { ...prev.billingAddress, addressLine1: e.target.value }
                        }))}
                        className="h-12"
                      />
                      
                      <Input
                        placeholder="Address line 2"
                        value={formData.billingAddress.addressLine2}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          billingAddress: { ...prev.billingAddress, addressLine2: e.target.value }
                        }))}
                        className="h-12"
                      />
                      
                      <div className="grid grid-cols-3 gap-4">
                        <Input
                          placeholder="City"
                          value={formData.billingAddress.city}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            billingAddress: { ...prev.billingAddress, city: e.target.value }
                          }))}
                          className="h-12"
                        />
                        <Select 
                          value={formData.billingAddress.state}
                          onValueChange={(value) => setFormData(prev => ({
                            ...prev,
                            billingAddress: { ...prev.billingAddress, state: value }
                          }))}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="State" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ca">CA</SelectItem>
                            <SelectItem value="ny">NY</SelectItem>
                            <SelectItem value="tx">TX</SelectItem>
                            <SelectItem value="fl">FL</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Zipcode"
                          value={formData.billingAddress.zipcode}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            billingAddress: { ...prev.billingAddress, zipcode: e.target.value }
                          }))}
                          className="h-12"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Hidden review content - keeping functionality intact */}
          {false && (
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">Share Your Experience</h2>
                <p className="text-slate-600">Tell us about your experience and add some media to make it shine</p>
              </div>
              
              {/* Mobile: Collapsible Sections */}
              <div className="lg:hidden space-y-6">
                
                {/* Rating Section */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggleSection('rating')}
                    className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        getSectionStatus('rating') === 'completed' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Star className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-slate-900">Rate Your Experience</p>
                        <p className="text-sm text-slate-500">
                          {formData.rating > 0 ? `${formData.rating} star${formData.rating > 1 ? 's' : ''} selected` : 'Tap to rate'}
                        </p>
                      </div>
                    </div>
                    {expandedSections.rating ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                  </button>
                  
                  {expandedSections.rating && (
                    <div className="px-6 pb-6 border-t border-slate-100">
                      <div className="pt-6">
                        <div className="flex justify-center gap-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                              className={`w-14 h-14 rounded-full transition-all duration-200 ${
                                star <= formData.rating
                                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg scale-110'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              <Star className="h-7 w-7 mx-auto" fill={star <= formData.rating ? 'currentColor' : 'none'} />
                            </button>
                          ))}
                        </div>
                        <p className="text-center text-sm text-slate-500 mt-4">
                          {formData.rating > 0 ? `You rated this ${formData.rating} star${formData.rating > 1 ? 's' : ''}` : 'Select a rating above'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Picture Section */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggleSection('profile')}
                    className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        getSectionStatus('profile') === 'completed' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <User className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-slate-900">Profile Picture</p>
                        <p className="text-sm text-slate-500">Optional - Add a photo of yourself</p>
                      </div>
                    </div>
                    {expandedSections.profile ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                  </button>
                  
                  {expandedSections.profile && (
                    <div className="px-6 pb-6 border-t border-slate-100">
                      <div className="pt-6">
                        <div className="flex items-center gap-6">
                          <div className="relative">
                            <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center border-2 border-slate-300">
                              {formData.profilePictureUrl ? (
                                <img 
                                  src={formData.profilePictureUrl} 
                                  alt="Profile" 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-10 h-10 text-slate-400" />
                              )}
                            </div>
                            {formData.profilePictureUrl && (
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  console.log('File selected:', file);
                                  handleProfilePictureUpload(file);
                                }
                                // Reset the input so the same file can be selected again
                                e.target.value = '';
                              }}
                              className="hidden"
                              id="profile-upload-mobile"
                            />
                            <label htmlFor="profile-upload-mobile" className="cursor-pointer">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="hover:bg-blue-50 hover:border-blue-300 transition-colors"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                {formData.profilePictureUrl ? 'Change Photo' : 'Upload Photo'}
                              </Button>
                            </label>
                            <p className="text-xs text-slate-500 mt-2">
                              Max 5MB, JPG/PNG recommended
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Media Upload Section */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggleSection('media')}
                    className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        getSectionStatus('media') === 'completed' ? 'bg-green-100 text-green-600' : 
                        getSectionStatus('media') === 'required' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Camera className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-slate-900">Add Your Media</p>
                        <p className="text-sm text-slate-500">
                          {formData.mediaFiles.length > 0 ? `${formData.mediaFiles.length} file${formData.mediaFiles.length > 1 ? 's' : ''} uploaded` : 'Required - Upload a video or image'}
                        </p>
                      </div>
                    </div>
                    {expandedSections.media ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                  </button>
                  
                  {expandedSections.media && (
                    <div className="px-6 pb-6 border-t border-slate-100">
                      <div className="pt-6 space-y-6">
                        <p className="text-sm text-slate-600 leading-relaxed">
                          Please upload a short 30-second video of yourself sharing your experience, or add an animation or render that illustrates your story better.
                        </p>
              
                        {/* Upload Progress */}
                        {uploadProgress > 0 && uploadProgress < 100 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              <span className="text-sm font-medium text-blue-700">Uploading media...</span>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Media Upload Options */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* File Upload */}
                          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors bg-white hover:bg-blue-50/30">
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
                              <div className="space-y-4">
                                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                                  <Upload className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                  <p className="text-base font-semibold text-slate-900 mb-2">
                                    Upload Files
                                  </p>
                                  <p className="text-sm text-slate-500">
                                    Images or videos up to 50MB
                                  </p>
                                </div>
                              </div>
                            </label>
                          </div>

                          {/* Camera Capture */}
                          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-green-400 transition-colors bg-white hover:bg-green-50/30">
                            <button
                              onClick={startCamera}
                              className="w-full"
                            >
                              <div className="space-y-4">
                                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                  <Camera className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                  <p className="text-base font-semibold text-slate-900 mb-2">
                                    Take Photo/Video
                                  </p>
                                  <p className="text-sm text-slate-500">
                                    Use your camera
                                  </p>
                                </div>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Camera Interface */}
                        {showCamera && (
                          <div className="bg-black rounded-lg p-4 mb-4">
                            <div className="relative">
                              <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-64 object-cover rounded-lg"
                              />
                              <canvas ref={canvasRef} className="hidden" />
                              
                              {/* Camera Controls */}
                              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
                                <Button
                                  onClick={stopCamera}
                                  variant="outline"
                                  size="sm"
                                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                
                                {cameraMode === 'photo' ? (
                                  <Button
                                    onClick={capturePhoto}
                                    className="w-12 h-12 rounded-full bg-white hover:bg-gray-100"
                                  >
                                    <Camera className="h-6 w-6 text-black" />
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={isRecording ? stopVideoRecording : startVideoRecording}
                                    className={`w-12 h-12 rounded-full ${
                                      isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-white hover:bg-gray-100'
                                    }`}
                                  >
                                    {isRecording ? (
                                      <div className="w-4 h-4 bg-white rounded-sm" />
                                    ) : (
                                      <Video className="h-6 w-6 text-black" />
                                    )}
                                  </Button>
                                )}
                                
                                <Button
                                  onClick={() => setCameraMode(cameraMode === 'photo' ? 'video' : 'photo')}
                                  variant="outline"
                                  size="sm"
                                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                                >
                                  {cameraMode === 'photo' ? <Video className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                                </Button>
                              </div>
                              
                              {/* Recording Timer */}
                              {isRecording && (
                                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                  {recordingTime}s
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Media Files List */}
                        {formData.mediaFiles.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-slate-700">Your Media Files ({formData.mediaFiles.length})</h4>
                            {formData.mediaFiles.map((mediaFile) => (
                              <div key={mediaFile.id} className="bg-white border border-slate-200 rounded-lg p-4">
                                <div className="flex items-center gap-3">
                                  {mediaFile.type === 'image' ? (
                                    <ImageIcon className="h-8 w-8 text-green-500" />
                                  ) : (
                                    <Video className="h-8 w-8 text-blue-500" />
                                  )}
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-900">{mediaFile.file.name}</p>
                                    <p className="text-sm text-slate-500">
                                      {(mediaFile.file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {mediaFile.url ? (
                                      <div className="flex items-center gap-2 text-green-600">
                                        <CheckCircle className="h-5 w-5" />
                                        <span className="text-sm font-medium">Uploaded</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 text-blue-600">
                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-sm font-medium">Uploading...</span>
                                      </div>
                                    )}
                                    <Button
                                      onClick={() => removeMediaFile(mediaFile.id)}
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Review Description */}
                <div className="bg-slate-50 rounded-lg p-6">
                  <Label htmlFor="description" className="text-sm font-medium text-slate-700 mb-2 block">
                    Tell us more about your experience
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Share your thoughts about the product, service, or overall experience..."
                    className="min-h-32 text-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 resize-none bg-white"
                  />
                  <p className="text-sm text-slate-500 mt-2">
                    {formData.description.length}/500 characters
                  </p>
                </div>
              </div>

              {/* Desktop: Side-by-side Layout */}
              <div className="hidden lg:grid lg:grid-cols-2 gap-12">
                {/* Left Column - Form */}
                <div className="space-y-8">
                  {/* Rating Section */}
                  <div className="bg-slate-50 rounded-xl p-8">
                    <Label className="text-base font-semibold text-slate-700 mb-6 block">
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
                              : 'bg-white text-slate-400 hover:bg-slate-100'
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

                  {/* Profile Picture Section */}
                  <div className="bg-slate-50 rounded-xl p-8">
                    <Label className="text-base font-semibold text-slate-700 mb-6 block">
                      Profile Picture (Optional)
                    </Label>
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center border-2 border-slate-300">
                          {formData.profilePictureUrl ? (
                            <img 
                              src={formData.profilePictureUrl} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-10 h-10 text-slate-400" />
                          )}
                        </div>
                        {formData.profilePictureUrl && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              console.log('File selected:', file);
                              handleProfilePictureUpload(file);
                            }
                            // Reset the input so the same file can be selected again
                            e.target.value = '';
                          }}
                          className="hidden"
                          id="profile-upload"
                        />
                        <label htmlFor="profile-upload" className="cursor-pointer">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="hover:bg-blue-50 hover:border-blue-300 transition-colors"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {formData.profilePictureUrl ? 'Change Photo' : 'Upload Photo'}
                          </Button>
                        </label>
                        <p className="text-sm text-slate-500 mt-2">
                          Max 5MB, JPG/PNG recommended
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Media Upload Section */}
                  <div className="bg-slate-50 rounded-xl p-8">
                    <h3 className="text-xl font-bold text-slate-900 mb-3">Add Your Media</h3>
                    <p className="text-sm text-slate-600 mb-8 leading-relaxed">
                      Please upload a short 30-second video of yourself sharing your experience, or add an animation or render that illustrates your story better.
                    </p>
                    
                    {/* Upload Progress */}
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm font-medium text-blue-700">Uploading media...</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Media Upload Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      {/* File Upload */}
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors bg-white hover:bg-blue-50/30">
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
                          <div className="space-y-4">
                            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                              <Upload className="h-8 w-8 text-white" />
                            </div>
                            <div>
                              <p className="text-base font-semibold text-slate-900 mb-2">
                                Upload Files
                              </p>
                              <p className="text-sm text-slate-500">
                                Images or videos up to 50MB
                              </p>
                            </div>
                          </div>
                        </label>
                      </div>

                      {/* Camera Capture */}
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-green-400 transition-colors bg-white hover:bg-green-50/30">
                        <button
                          onClick={startCamera}
                          className="w-full"
                        >
                          <div className="space-y-4">
                            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto">
                              <Camera className="h-8 w-8 text-white" />
                            </div>
                            <div>
                              <p className="text-base font-semibold text-slate-900 mb-2">
                                Take Photo/Video
                              </p>
                              <p className="text-sm text-slate-500">
                                Use your camera
                              </p>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Camera Interface */}
                    {showCamera && (
                      <div className="bg-black rounded-lg p-4 mb-4">
                        <div className="relative">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-64 object-cover rounded-lg"
                          />
                          <canvas ref={canvasRef} className="hidden" />
                          
                          {/* Camera Controls */}
                          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
                            <Button
                              onClick={stopCamera}
                              variant="outline"
                              size="sm"
                              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            
                            {cameraMode === 'photo' ? (
                              <Button
                                onClick={capturePhoto}
                                className="w-12 h-12 rounded-full bg-white hover:bg-gray-100"
                              >
                                <Camera className="h-6 w-6 text-black" />
                              </Button>
                            ) : (
                              <Button
                                onClick={isRecording ? stopVideoRecording : startVideoRecording}
                                className={`w-12 h-12 rounded-full ${
                                  isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-white hover:bg-gray-100'
                                }`}
                              >
                                {isRecording ? (
                                  <div className="w-4 h-4 bg-white rounded-sm" />
                                ) : (
                                  <Video className="h-6 w-6 text-black" />
                                )}
                              </Button>
                            )}
                            
                            <Button
                              onClick={() => setCameraMode(cameraMode === 'photo' ? 'video' : 'photo')}
                              variant="outline"
                              size="sm"
                              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                            >
                              {cameraMode === 'photo' ? <Video className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                            </Button>
                          </div>
                          
                          {/* Recording Timer */}
                          {isRecording && (
                            <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                              {recordingTime}s
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Media Files List */}
                    {formData.mediaFiles.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-slate-700">Your Media Files ({formData.mediaFiles.length})</h4>
                        {formData.mediaFiles.map((mediaFile) => (
                          <div key={mediaFile.id} className="bg-white border border-slate-200 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              {mediaFile.type === 'image' ? (
                                <ImageIcon className="h-8 w-8 text-green-500" />
                              ) : (
                                <Video className="h-8 w-8 text-blue-500" />
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-slate-900">{mediaFile.file.name}</p>
                                <p className="text-sm text-slate-500">
                                  {(mediaFile.file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {mediaFile.url ? (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="h-5 w-5" />
                                    <span className="text-sm font-medium">Uploaded</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-blue-600">
                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-sm font-medium">Uploading...</span>
                                  </div>
                                )}
                                <Button
                                  onClick={() => removeMediaFile(mediaFile.id)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Review Description */}
                  <div className="bg-slate-50 rounded-xl p-8">
                    <Label htmlFor="description" className="text-base font-semibold text-slate-700 mb-4 block">
                      Tell us more about your experience
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Share your thoughts about the product, service, or overall experience..."
                      className="min-h-40 text-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 resize-none bg-white rounded-xl"
                    />
                    <p className="text-sm text-slate-500 mt-3">
                      {formData.description.length}/500 characters
                    </p>
                  </div>
                </div>

                {/* Right Column - Preview (Desktop Only) */}
                <div className="hidden lg:block">
                  <div className="sticky top-8">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Preview</h3>
                    <div className="flex justify-center">
                      {/* Review Card Preview - Exact match to reviews-standalone.html */}
                      <div className="video-card relative w-64 h-96 aspect-[2/3] flex-shrink-0 rounded-2xl overflow-hidden transition-transform duration-500 ease-in-out hover:scale-105 shadow-lg group">
                        {/* Media Content */}
                        {formData.mediaFiles.length > 0 ? (
                          formData.mediaFiles[0].type === 'video' ? (
                            <video 
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                              muted 
                              loop 
                              playsInline 
                              src={formData.mediaFiles[0].url || URL.createObjectURL(formData.mediaFiles[0].file)}
                            />
                          ) : (
                            <img 
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                              src={formData.mediaFiles[0].url || URL.createObjectURL(formData.mediaFiles[0].file)} 
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

          {/* Navigation */}
          <div className="flex justify-center mt-12">
            <Button
              onClick={nextStep}
              className="px-8 py-3 h-12 text-base bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubmitReview;