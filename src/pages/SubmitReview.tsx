import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  Camera, 
  Video, 
  Upload, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Heart,
  MessageCircle,
  Image as ImageIcon,
  Play,
  Pause,
  Square
} from 'lucide-react';

interface FormData {
  name: string;
  email: string;
  instagram: string;
  rating: number;
  description: string;
  media: File | null;
  mediaType: string;
  avatar: File | null;
}

const SubmitReview = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    instagram: '',
    rating: 5,
    description: '',
    media: null,
    mediaType: '',
    avatar: null
  });
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [isExistingCustomer, setIsExistingCustomer] = useState<boolean | null>(null);
  const [customerTags, setCustomerTags] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const totalSteps = 5;
  const progressPercentage = (currentStep / totalSteps) * 100;

  // Check if email exists in customer database
  const checkCustomerStatus = async (email: string) => {
    if (!email.includes('@')) return;
    
    try {
      const DEMO_USER_ID = "550e8400-e29b-41d4-a716-446655440000";
      const { data, error } = await supabase
        .from('contacts')
        .select('id, email, tags')
        .eq('user_id', DEMO_USER_ID)
        .eq('email', email.toLowerCase())
        .eq('status', 'subscribed')
        .single();

      if (data) {
        setIsExistingCustomer(true);
        setCustomerTags(data.tags || []);
      } else {
        setIsExistingCustomer(false);
        setCustomerTags([]);
      }
    } catch (error) {
      setIsExistingCustomer(false);
      setCustomerTags([]);
    }
  };

  // Debounced email check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.email) {
        checkCustomerStatus(formData.email);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.email]);

  const handleFileUpload = (file: File, type: 'media' | 'avatar') => {
    if (type === 'media') {
      setFormData(prev => ({
        ...prev,
        media: file,
        mediaType: file.type.startsWith('video/') ? 'video' : 'image'
      }));
    } else {
      setFormData(prev => ({ ...prev, avatar: file }));
    }
  };

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const file = new File([blob], `review-video-${Date.now()}.webm`, { type: 'video/webm' });
        handleFileUpload(file, 'media');
        
        stream.getTracks().forEach(track => track.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };

      setMediaRecorder(recorder);
      setIsRecording(true);
      recorder.start(1000);

      const timer = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      setTimeout(() => {
        if (recorder.state === 'recording') {
          stopRecording();
        }
        clearInterval(timer);
      }, 60000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Could not access camera/microphone",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  // Upload to Cloudflare R2 (simulated - you'll need to implement actual R2 upload)
  const uploadToR2 = async (file: File, type: 'media' | 'avatar'): Promise<string> => {
    // For now, we'll use Supabase storage but you can replace this with actual R2 upload
    const bucket = 'reviews';
    const fileName = `${type}-${Date.now()}-${file.name}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const submitReview = async () => {
    setUploading(true);
    try {
      let mediaUrl = '';
      let avatarUrl = '';

      // Upload media if present
      if (formData.media) {
        mediaUrl = await uploadToR2(formData.media, 'media');
      }

      // Upload avatar if present
      if (formData.avatar) {
        avatarUrl = await uploadToR2(formData.avatar, 'avatar');
      }

      // Insert review into database
      const SUPABASE_URL = "https://mixifcnokcmxarpzwfiy.supabase.co";
      const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peGlmY25va2NteGFycHp3Zml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NjYwNTEsImV4cCI6MjA2OTA0MjA1MX0.-4uIuzcHcDGS20-dtKbjVFOtpBSmwYhT9Bgt6KA-dXI";
      
      const insertUrl = `${SUPABASE_URL}/rest/v1/reviews`;
      
      const insertResponse = await fetch(insertUrl, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          user_name: formData.name,
          user_email: formData.email,
          user_instagram_handle: formData.instagram,
          rating: formData.rating,
          description: formData.description,
          media_url: mediaUrl,
          media_type: formData.mediaType,
          user_avatar: avatarUrl || '/placeholder.svg',
          is_active: false,
          sort_order: 0
        })
      });

      if (!insertResponse.ok) {
        const errorData = await insertResponse.text();
        throw new Error(`Failed to insert review: ${errorData}`);
      }

      toast({
        title: "Success!",
        description: "Your review has been submitted for approval.",
      });

      setCurrentStep(6); // Success step
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
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
      case 1: return formData.name.trim().length > 0;
      case 2: return formData.email.includes('@');
      case 3: return formData.rating > 0;
      case 4: return formData.description.trim().length > 10;
      case 5: return true; // Media is optional
      default: return false;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const steps = [
    { id: 1, title: "Your Name", icon: <Heart className="h-5 w-5" /> },
    { id: 2, title: "Email", icon: <MessageCircle className="h-5 w-5" /> },
    { id: 3, title: "Rating", icon: <Star className="h-5 w-5" /> },
    { id: 4, title: "Review", icon: <MessageCircle className="h-5 w-5" /> },
    { id: 5, title: "Media", icon: <Camera className="h-5 w-5" /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 mb-6 shadow-lg">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <span className="font-semibold text-gray-700">Share Your Experience</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            We'd Love Your Review!
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Help others discover our amazing products by sharing your honest experience
          </p>
        </div>

        {/* Progress Steps */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2 z-0">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
                style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
              />
            </div>
            {steps.map((step, index) => (
              <div key={step.id} className="relative z-10 flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  currentStep >= step.id 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                    : 'bg-white text-gray-400 border-2 border-gray-200'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    step.icon
                  )}
                </div>
                <span className={`text-sm font-medium mt-2 transition-colors ${
                  currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <Card className="max-w-2xl mx-auto shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            {/* Step 1: Name */}
            {currentStep === 1 && (
              <div className="space-y-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Heart className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold mb-3 text-gray-900">What's your name?</h2>
                  <p className="text-gray-600">This will be displayed with your review</p>
                </div>
                
                <div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-6 border-2 border-gray-200 rounded-2xl text-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200"
                    placeholder="Enter your full name"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Step 2: Email */}
            {currentStep === 2 && (
              <div className="space-y-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <MessageCircle className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold mb-3 text-gray-900">Your email address</h2>
                  <p className="text-gray-600">We'll only use this to contact you if needed</p>
                </div>
                
                <div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-6 border-2 border-gray-200 rounded-2xl text-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                    placeholder="your@email.com"
                    autoFocus
                  />
                  
                  {/* Customer Status Indicator */}
                  {isExistingCustomer !== null && (
                    <div className="mt-4 flex items-center justify-center">
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                        isExistingCustomer 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        <div className={`w-3 h-3 rounded-full ${
                          isExistingCustomer ? 'bg-green-500' : 'bg-yellow-500'
                        }`} />
                        <span className="font-medium">
                          {isExistingCustomer ? 'Existing Customer' : 'New Customer'}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Customer Tags */}
                  {customerTags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                      {customerTags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-800">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Rating */}
            {currentStep === 3 && (
              <div className="space-y-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Star className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold mb-3 text-gray-900">Rate your experience</h2>
                  <p className="text-gray-600">How many stars would you give us?</p>
                </div>
                
                <div className="text-center">
                  <div className="flex justify-center gap-3 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                        className={`w-16 h-16 rounded-2xl transition-all duration-200 transform hover:scale-110 ${
                          star <= formData.rating 
                            ? 'text-yellow-400 bg-yellow-50 shadow-lg' 
                            : 'text-gray-300 hover:text-yellow-400 hover:bg-yellow-50'
                        }`}
                      >
                        <Star className="w-10 h-10 mx-auto fill-current" />
                      </button>
                    ))}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formData.rating} out of 5 stars
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Description */}
            {currentStep === 4 && (
              <div className="space-y-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <MessageCircle className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold mb-3 text-gray-900">Tell us more</h2>
                  <p className="text-gray-600">Share your detailed experience with us</p>
                </div>
                
                <div>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-6 border-2 border-gray-200 rounded-2xl text-lg focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200 resize-none"
                    rows={5}
                    placeholder="Describe your experience..."
                    autoFocus
                  />
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    {formData.description.length}/500 characters
                  </p>
                </div>
              </div>
            )}

            {/* Step 5: Media Upload */}
            {currentStep === 5 && (
              <div className="space-y-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Camera className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold mb-3 text-gray-900">Add a photo or video</h2>
                  <p className="text-gray-600">Optional: Show others your experience (max 30MB)</p>
                </div>

                {/* Media Preview */}
                {formData.media && (
                  <div className="text-center mb-6">
                    {formData.mediaType === 'video' ? (
                      <video 
                        src={URL.createObjectURL(formData.media)} 
                        className="max-w-full h-64 rounded-2xl mx-auto shadow-lg"
                        controls
                      />
                    ) : (
                      <img 
                        src={URL.createObjectURL(formData.media)} 
                        alt="Preview"
                        className="max-w-full h-64 rounded-2xl mx-auto object-cover shadow-lg"
                      />
                    )}
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, media: null, mediaType: '' }))}
                      className="mt-4 text-sm text-red-600 hover:underline font-medium"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* Upload Options */}
                {!formData.media && (
                  <div className="space-y-6">
                    {/* File Upload */}
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all duration-200"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium text-gray-700 mb-2">Click to upload a file</p>
                      <p className="text-sm text-gray-500">JPG, PNG, MP4, MOV up to 30MB</p>
                    </div>

                    {/* Camera/Video Recording */}
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-6 border-2 border-gray-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group"
                      >
                        <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-blue-500" />
                        <span className="font-medium text-gray-700">Photo</span>
                      </button>
                      
                      <button
                        onClick={isRecording ? stopRecording : startVideoRecording}
                        className={`p-6 border-2 rounded-2xl transition-all duration-200 group ${
                          isRecording 
                            ? 'border-red-400 bg-red-50' 
                            : 'border-gray-200 hover:border-red-400 hover:bg-red-50'
                        }`}
                      >
                        {isRecording ? (
                          <Square className="w-8 h-8 mx-auto mb-2 text-red-500" />
                        ) : (
                          <Video className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-red-500" />
                        )}
                        <span className="font-medium text-gray-700">{isRecording ? 'Stop' : 'Video'}</span>
                      </button>
                    </div>

                    {/* Recording UI */}
                    {isRecording && (
                      <div className="text-center space-y-4">
                        <video 
                          ref={videoRef}
                          className="w-full max-w-md rounded-2xl mx-auto shadow-lg"
                          muted
                          playsInline
                        />
                        <div className="text-red-600 font-bold text-lg">
                          Recording: {formatTime(recordingTime)} / 1:00
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.size <= 30 * 1024 * 1024) {
                      handleFileUpload(file, 'media');
                    } else if (file) {
                      toast({
                        title: "File too large",
                        description: "Please select a file smaller than 30MB",
                        variant: "destructive"
                      });
                    }
                  }}
                  className="hidden"
                />
              </div>
            )}

            {/* Success Step */}
            {currentStep === 6 && (
              <div className="text-center space-y-8">
                <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                  <CheckCircle className="h-12 w-12 text-white" />
                </div>
                <div>
                  <h2 className="text-4xl font-bold mb-4 text-gray-900">Thank you!</h2>
                  <p className="text-lg text-gray-600 mb-8">
                    Your review has been submitted and is pending approval. 
                    We'll review it shortly and get back to you.
                  </p>
                  <Button
                    onClick={() => window.location.reload()}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-lg"
                  >
                    Submit Another Review
                  </Button>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            {currentStep < 6 && (
              <div className="flex gap-4 mt-12">
                {currentStep > 1 && (
                  <Button
                    onClick={prevStep}
                    variant="outline"
                    className="flex-1 py-4 px-6 rounded-2xl text-lg font-semibold border-2 hover:bg-gray-50"
                  >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Back
                  </Button>
                )}
                
                <Button
                  onClick={nextStep}
                  disabled={!canProceed() || uploading}
                  className="flex-1 py-4 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl text-lg font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    'Submitting...'
                  ) : currentStep === totalSteps ? (
                    <>
                      Submit Review
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubmitReview;