import React, { useState, useRef, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Camera, Upload, Paperclip, Video } from 'lucide-react';
import { uploadToR2 } from '@/lib/r2-upload';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

const SubmitReview = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const profileFileRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    email: '',
    instagramHandle: '',
    rating: 0,
    description: '',
    profilePictureUrl: '',
    mediaUrl: '',
    mediaType: 'image' as 'image' | 'video'
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [profileUploadProgress, setProfileUploadProgress] = useState(0);
  const [isProfileUploading, setIsProfileUploading] = useState(false);
  const [isMediaUploading, setIsMediaUploading] = useState(false);

  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select a file smaller than 50MB.',
        variant: 'destructive'
      });
      return;
    }

    const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
    setFormData(prev => ({ ...prev, mediaType }));
    
    try {
      setIsMediaUploading(true);
      setUploadProgress(0);
      
      const url = await uploadToR2(file, (progress) => {
        setUploadProgress(progress);
      });
      
      setFormData(prev => ({ ...prev, mediaUrl: url }));
      
      toast({
        title: 'Success',
        description: 'Media uploaded successfully!'
      });
    } catch (error) {
      console.error('Media upload failed:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload media. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsMediaUploading(false);
      setTimeout(() => setUploadProgress(0), 1000); // Clear progress after delay
    }
  };

  const handleProfilePictureUpload = async (file: File) => {
    setIsProfileUploading(true);
    setProfileUploadProgress(25);
    
    try {
      const url = await uploadToR2(file, (progress) => {
        setProfileUploadProgress(progress);
      });
      setFormData(prev => ({ ...prev, profilePictureUrl: url }));
      
      toast({
        title: 'Success',
        description: 'Profile picture uploaded successfully!'
      });
    } catch (error) {
      console.error('Profile picture upload failed:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload profile picture. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProfileUploading(false);
      setProfileUploadProgress(0);
    }
  };

  const uploadToR2 = async (file: File, onProgress?: (progress: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            if (result.success) {
              resolve(result.url);
            } else {
              reject(new Error(result.error || 'Upload failed'));
            }
          } catch (e) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };
      
      xhr.open('POST', 'https://r2-upload-proxy.cleverpoly-store.workers.dev');
      xhr.send(formData);
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Send webhook to Make.com - Make.com will handle database insertion
      const webhookPayload = {
        action: "review_submission",
        password: "shahzrp11",
        email: formData.email,
        instagram_handle: formData.instagramHandle || '',
        rating: formData.rating,
        description: formData.description,
        media_url: formData.mediaUrl || '',
        media_url_optimized: formData.mediaUrl || '',
        media_type: formData.mediaType || 'image',
        profile_picture_url: formData.profilePictureUrl || '',
        timestamp: new Date().toISOString(),
        source: "website",
        is_active: false
      };

      console.log('Sending review webhook:', webhookPayload);
      
      // Send webhook to Make.com - Make.com will handle the database insertion
      const response = await fetch('https://hook.us2.make.com/fyfqkxjbgnnq4w72wqvd8csdp4flalwv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }

      console.log('Review webhook sent successfully');

      toast({
        title: 'Success!',
        description: 'Your review has been submitted successfully!',
      });

      // Show thank you page instead of resetting
      setIsSubmitted(true);
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit review. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.email && formData.instagramHandle && formData.profilePictureUrl;
      case 2:
        return formData.mediaUrl;
      case 3:
        return formData.rating > 0 && formData.description.trim().length > 0;
      default:
        return false;
    }
  };

  // Enhanced Review Card Component with memoization to prevent flickering
  const ReviewCard = memo<{
    isMobile?: boolean;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    rating: number;
    description: string;
    profilePictureUrl: string;
    instagramHandle: string;
  }>(({ isMobile = false, mediaUrl, mediaType, rating, description, profilePictureUrl, instagramHandle }) => {
    const userName = instagramHandle.replace('@', '') || 'Username';
    const avatarInitial = userName.charAt(0).toUpperCase();
    
    const cardSize = isMobile ? "w-40 h-60" : "w-80 h-[480px]";
    
    return (
      <div className={`relative ${cardSize} rounded-2xl overflow-hidden shadow-xl bg-gray-900`}>
        {mediaUrl ? (
          mediaType === 'video' ? (
            <video 
              key={mediaUrl} // Force re-mount only when URL changes
              className="w-full h-full object-cover" 
              src={mediaUrl} 
              muted 
              loop 
              autoPlay 
              playsInline 
            />
          ) : (
            <img className="w-full h-full object-cover" src={mediaUrl} alt="Review media" />
          )
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <Camera className={`${isMobile ? 'w-8 h-8' : 'w-20 h-20'} text-gray-400`} />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        
        <div className={`absolute bottom-0 left-0 right-0 ${isMobile ? 'p-2' : 'p-6'} text-white`}>
          <div className={`space-y-${isMobile ? '1' : '3'}`}>
            <div className="flex items-center space-x-1">
              {Array.from({ length: 5 }, (_, i) => (
                <svg key={i} className={`${isMobile ? 'w-3 h-3' : 'w-5 h-5'} ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.445a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.367-2.445a1 1 0 00-1.175 0l-3.367 2.445c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z" />
                </svg>
              ))}
            </div>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-white/90 line-clamp-2`}>
              "{description || 'Your review will appear here...'}"
            </p>
            <div className={`flex items-center space-x-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              <div className={`${isMobile ? 'w-5 h-5' : 'w-10 h-10'} rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white`}>
                {profilePictureUrl ? (
                  <img src={profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  avatarInitial
                )}
              </div>
              <span className="font-medium">{instagramHandle || '@username'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  });

  const renderStep = () => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Basic Information</h2>
              <p className="text-muted-foreground">Tell us about yourself</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@example.com"
                  className="h-12"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Instagram Handle *</label>
                <Input
                  type="text"
                  value={formData.instagramHandle}
                  onChange={(e) => {
                    let value = e.target.value;
                    // Automatically add @ if not present
                    if (value && !value.startsWith('@')) {
                      value = '@' + value;
                    }
                    setFormData({ ...formData, instagramHandle: value });
                  }}
                  placeholder="@yourusername"
                  className="h-12"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Profile Picture *</label>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100">
                      {formData.profilePictureUrl ? (
                        <img src={formData.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Camera className="w-6 h-6" />
                        </div>
                      )}
                      {isProfileUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                  <input
                    ref={profileFileRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleProfilePictureUpload(file);
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => profileFileRef.current?.click()}
                    disabled={isProfileUploading}
                    className="h-12"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {isProfileUploading ? 'Uploading...' : (formData.profilePictureUrl ? 'Change' : 'Upload')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Add Media</h2>
              <p className="text-muted-foreground">Show your experience</p>
            </div>

            {formData.mediaUrl ? (
              <div className="relative w-full h-64 rounded-lg overflow-hidden">
                {formData.mediaType === 'video' ? (
                  <video src={formData.mediaUrl} className="w-full h-full object-cover" controls />
                ) : (
                  <img src={formData.mediaUrl} alt="Review media" className="w-full h-full object-cover" />
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setFormData({ ...formData, mediaUrl: '', mediaType: 'image' })}
                  className="absolute top-2 right-2"
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {(uploadProgress > 0 || isMediaUploading) && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full h-2" />
                  </div>
                )}
                
                <div className="flex flex-col gap-3 md:hidden">
                  <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
                  <input ref={cameraRef} type="file" accept="image/*,video/*" capture="environment" onChange={handleFileUpload} className="hidden" />
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    disabled={isMediaUploading}
                    className="h-16 justify-start"
                  >
                    <Paperclip className="w-6 h-6 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Attach Photo/Video</div>
                      <div className="text-sm text-muted-foreground">From your gallery</div>
                    </div>
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => cameraRef.current?.click()}
                    disabled={isMediaUploading}
                    className="h-16 justify-start"
                  >
                    <Video className="w-6 h-6 mr-3" />
                    <div className="text-left">
                      <div className="font-medium">Take Photo/Video</div>
                      <div className="text-sm text-muted-foreground">Use your camera</div>
                    </div>
                  </Button>
                </div>

                <div className="hidden md:block">
                  <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    disabled={isMediaUploading}
                    className="w-full h-16"
                  >
                    <Upload className="w-6 h-6 mr-3" />
                    Upload Photo/Video
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Rate & Review</h2>
              <p className="text-muted-foreground">Share your experience</p>
            </div>

            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      className="p-2 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-12 h-12 ${
                          star <= formData.rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {formData.rating > 0 && (
                <div className="text-center">
                  <p className="text-lg font-medium">
                    {formData.rating === 1 && "Poor"}
                    {formData.rating === 2 && "Fair"}
                    {formData.rating === 3 && "Good"}
                    {formData.rating === 4 && "Very Good"}
                    {formData.rating === 5 && "Excellent"}
                  </p>
                </div>
              )}

              <div>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Share your experience, what you liked, what could be improved..."
                  rows={isMobile ? 6 : 8}
                  className="resize-none text-base"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Show thank you page after submission
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 text-center">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-8 space-y-6">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <div className="space-y-3">
                <h1 className="text-3xl font-bold text-green-900">Thank You!</h1>
                <p className="text-green-700 text-lg">
                  Your review has been submitted successfully.
                </p>
                <p className="text-green-600 text-sm">
                  We appreciate you taking the time to share your experience with us.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Mobile Preview */}
          <div className="lg:hidden order-first">
            <Card className="bg-gradient-to-br from-slate-50 to-white">
              <CardContent className="p-4">
                <div className="flex justify-center">
                  <ReviewCard 
                    isMobile={true}
                    mediaUrl={formData.mediaUrl}
                    mediaType={formData.mediaType}
                    rating={formData.rating}
                    description={formData.description}
                    profilePictureUrl={formData.profilePictureUrl}
                    instagramHandle={formData.instagramHandle}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Progress */}
            <div className="flex justify-center space-x-2 mb-8">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-3 h-3 rounded-full ${
                    step <= currentStep ? 'bg-primary' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            {/* Step Content */}
            <Card>
              <CardContent className="p-6 lg:p-8">
                {renderStep()}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between space-x-4">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex-1 h-12"
              >
                Back
              </Button>
              
              {currentStep < 3 ? (
                <Button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="flex-1 h-12"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceed() || isSubmitting}
                  className="flex-1 h-12"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              )}
            </div>
          </div>

          {/* Desktop Preview */}
          <div className="hidden lg:block">
            <div className="sticky top-8">
              <Card className="bg-gradient-to-br from-slate-50 to-white">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                      Live Preview
                    </h3>
                    <p className="text-muted-foreground">See how your review will look</p>
                  </div>
                  <div className="flex justify-center">
                    <ReviewCard 
                      isMobile={false}
                      mediaUrl={formData.mediaUrl}
                      mediaType={formData.mediaType}
                      rating={formData.rating}
                      description={formData.description}
                      profilePictureUrl={formData.profilePictureUrl}
                      instagramHandle={formData.instagramHandle}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmitReview;