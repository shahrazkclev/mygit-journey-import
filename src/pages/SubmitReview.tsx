import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const SubmitReview = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    instagram: '',
    rating: 5,
    description: '',
    media: null as File | null,
    mediaType: '',
    avatar: null as File | null
  });
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const totalSteps = 6;
  const progressPercentage = (currentStep / totalSteps) * 100;

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
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };

      setMediaRecorder(recorder);
      setIsRecording(true);
      recorder.start(1000);

      // Start timer
      const timer = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) { // Max 60 seconds
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // Auto-stop after 60 seconds
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

  const uploadToSupabase = async (file: File, bucket: string, fileName: string): Promise<string> => {
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
        const mediaFileName = `${Date.now()}-${formData.media.name}`;
        mediaUrl = await uploadToSupabase(formData.media, 'reviews', mediaFileName);
      }

      // Upload avatar if present
      if (formData.avatar) {
        const avatarFileName = `avatar-${Date.now()}-${formData.avatar.name}`;
        avatarUrl = await uploadToSupabase(formData.avatar, 'reviews', avatarFileName);
      }

      // Insert review into database using direct API call
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
          is_active: false, // Pending approval
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

      setCurrentStep(7); // Success step
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
      case 3: return formData.instagram.trim().length > 0;
      case 4: return formData.rating > 0;
      case 5: return formData.description.trim().length > 10;
      case 6: return true; // Media is optional
      default: return false;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-width-lg mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3 text-foreground">Submit Your Review</h1>
          <p className="text-lg text-muted-foreground">Share your experience with our community</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-muted-foreground">{Math.round(progressPercentage)}% Complete</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-card border rounded-lg p-8 shadow-lg max-w-md mx-auto">
          {/* Step 1: Name */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">What's your name?</h2>
                <p className="text-muted-foreground">This will be displayed with your review</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-4 border rounded-lg text-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your full name"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 2: Email */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Your email address</h2>
                <p className="text-muted-foreground">We'll only use this to contact you if needed</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full p-4 border rounded-lg text-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="your@email.com"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 3: Instagram */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="m16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Instagram handle</h2>
                <p className="text-muted-foreground">Your Instagram username (without @)</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Instagram Handle</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">@</span>
                  <input
                    type="text"
                    value={formData.instagram}
                    onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                    className="w-full pl-8 pr-4 py-4 border rounded-lg text-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="username"
                    autoFocus
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Rating */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Rate your experience</h2>
                <p className="text-muted-foreground">How many stars would you give us?</p>
              </div>
              
              <div className="text-center">
                <div className="flex justify-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                      className={`w-12 h-12 rounded-lg transition-all ${
                        star <= formData.rating 
                          ? 'text-yellow-400 bg-yellow-50' 
                          : 'text-gray-300 hover:text-yellow-400'
                      }`}
                    >
                      <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
                <p className="text-lg font-medium">{formData.rating} out of 5 stars</p>
              </div>
            </div>
          )}

          {/* Step 5: Description */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Tell us more</h2>
                <p className="text-muted-foreground">Share your detailed experience with us</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Your Review</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-4 border rounded-lg text-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Describe your experience..."
                  autoFocus
                />
                <p className="text-sm text-muted-foreground mt-2">
                  {formData.description.length}/500 characters
                </p>
              </div>
            </div>
          )}

          {/* Step 6: Media Upload */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21,15 16,10 5,21"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Add a photo or video</h2>
                <p className="text-muted-foreground">Optional: Show others your experience (max 30MB)</p>
              </div>

              {/* Media Preview */}
              {formData.media && (
                <div className="text-center mb-4">
                  {formData.mediaType === 'video' ? (
                    <video 
                      src={URL.createObjectURL(formData.media)} 
                      className="max-w-full h-48 rounded-lg mx-auto"
                      controls
                    />
                  ) : (
                    <img 
                      src={URL.createObjectURL(formData.media)} 
                      alt="Preview"
                      className="max-w-full h-48 rounded-lg mx-auto object-cover"
                    />
                  )}
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, media: null, mediaType: '' }))}
                    className="mt-2 text-sm text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Upload Options */}
              {!formData.media && (
                <div className="space-y-4">
                  {/* File Upload */}
                  <div 
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg className="w-10 h-10 mx-auto mb-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="font-medium">Click to upload a file</p>
                    <p className="text-sm text-muted-foreground">JPG, PNG, MP4, MOV up to 30MB</p>
                  </div>

                  {/* Camera/Video Recording */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm">Photo</span>
                    </button>
                    
                    <button
                      onClick={isRecording ? stopRecording : startVideoRecording}
                      className={`p-4 border rounded-lg transition-colors ${
                        isRecording ? 'bg-red-50 border-red-200' : 'hover:bg-muted/50'
                      }`}
                    >
                      <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm">{isRecording ? 'Stop' : 'Video'}</span>
                    </button>
                  </div>

                  {/* Recording UI */}
                  {isRecording && (
                    <div className="text-center space-y-4">
                      <video 
                        ref={videoRef}
                        className="w-full max-w-sm rounded-lg mx-auto"
                        muted
                        playsInline
                      />
                      <div className="text-red-600 font-medium">
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
                  if (file && file.size <= 30 * 1024 * 1024) { // 30MB limit
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
          {currentStep === 7 && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-500 rounded-lg flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">Thank you!</h2>
              <p className="text-muted-foreground">
                Your review has been submitted and is pending approval. 
                We'll review it shortly and get back to you.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Submit Another Review
              </button>
            </div>
          )}

          {/* Navigation Buttons */}
          {currentStep < 7 && (
            <div className="flex gap-3 mt-8">
              {currentStep > 1 && (
                <button
                  onClick={prevStep}
                  className="flex-1 py-3 px-6 border rounded-lg font-medium hover:bg-muted transition-colors"
                >
                  Back
                </button>
              )}
              
              <button
                onClick={nextStep}
                disabled={!canProceed() || uploading}
                className="flex-1 py-3 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Submitting...' : currentStep === totalSteps ? 'Submit Review' : 'Continue'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmitReview;