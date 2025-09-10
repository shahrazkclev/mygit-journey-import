import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Star, Camera, Upload, ChevronDown, Paperclip, Video } from 'lucide-react';
import { uploadToR2 } from '@/lib/r2-upload';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [profileUploadProgress, setProfileUploadProgress] = useState(0);
  const [isProfileUploading, setIsProfileUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    rating: false,
    media: false,
    review: false
  });

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
    
    // Create local preview
    const localUrl = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, mediaUrl: localUrl }));

    try {
      setUploadProgress(0);
      const url = await uploadToR2(file);
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
      setUploadProgress(0);
    }
  };

  const handleProfilePictureUpload = async (file: File) => {
    console.log('Profile picture upload started:', file.name, file.size, file.type);
    setIsProfileUploading(true);
    setProfileUploadProgress(0);
    
    try {
      console.log('Creating local preview URL');
      const localPreview = URL.createObjectURL(file);
      
      setFormData(prev => ({ ...prev, profilePictureUrl: localPreview }));
      setProfileUploadProgress(25);
      
      console.log('Starting upload to R2');
      const url = await uploadToR2(file);
      console.log('Upload successful, URL:', url);
      
      setProfileUploadProgress(100);
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

  // Upload to Cloudflare R2 via Worker
  const uploadToR2 = async (file: File, isOptimized: boolean = false): Promise<string> => {
    console.log('uploadToR2 called with file:', file.name, 'isOptimized:', isOptimized);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('isOptimized', isOptimized.toString());
      
      // Your Cloudflare Worker endpoint
      const workerUrl = 'https://r2-upload-proxy.cleverpoly-store.workers.dev';
      console.log('Uploading to:', workerUrl);
      
      if (isProfileUploading) {
        setProfileUploadProgress(50);
      } else {
        setUploadProgress(25);
      }
      
      const response = await fetch(workerUrl, {
        method: 'POST',
        body: formData,
      });
      
      console.log('Upload response status:', response.status, response.statusText);
      
      if (isProfileUploading) {
        setProfileUploadProgress(75);
      } else {
        setUploadProgress(75);
      }
      
      if (!response.ok) {
        const errorData = await response.text();
        console.log('Upload failed with response:', errorData);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Upload successful, result:', result);
      
      if (isProfileUploading) {
        setProfileUploadProgress(100);
      } else {
        setUploadProgress(100);
      }
      
      return result.url;
    } catch (error) {
      console.error('Upload failed:', error);
      if (isProfileUploading) {
        setProfileUploadProgress(0);
      } else {
        setUploadProgress(0);
      }
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.instagramHandle || !formData.profilePictureUrl || !formData.rating || !formData.mediaUrl || !formData.description) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields including media upload.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          user_instagram_handle: formData.instagramHandle,
          user_email: formData.email,
          rating: formData.rating,
          description: formData.description,
          user_avatar: formData.profilePictureUrl,
          media_url: formData.mediaUrl,
          media_type: formData.mediaType,
          is_active: false,
          sort_order: 0
        });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Your review has been submitted and is pending approval.',
      });

      // Reset form
      setFormData({
        email: '',
        instagramHandle: '',
        rating: 0,
        description: '',
        profilePictureUrl: '',
        mediaUrl: '',
        mediaType: 'image'
      });
      setCurrentStep(0);
      setExpandedSections({
        basic: true,
        rating: false,
        media: false,
        review: false
      });
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
    if (currentStep === 0 && formData.email && formData.instagramHandle && formData.profilePictureUrl) {
      setExpandedSections({
        basic: false,
        rating: true,
        media: false,
        review: false
      });
      setCurrentStep(1);
    } else if (currentStep === 1 && formData.rating > 0) {
      setExpandedSections({
        basic: false,
        rating: false,
        media: true,
        review: false
      });
      setCurrentStep(2);
    } else if (currentStep === 2 && formData.mediaUrl) {
      setExpandedSections({
        basic: false,
        rating: false,
        media: false,
        review: true
      });
      setCurrentStep(3);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      if (currentStep === 1) {
        setExpandedSections({
          basic: true,
          rating: false,
          media: false,
          review: false
        });
      } else if (currentStep === 2) {
        setExpandedSections({
          basic: false,
          rating: true,
          media: false,
          review: false
        });
      } else if (currentStep === 3) {
        setExpandedSections({
          basic: false,
          rating: false,
          media: true,
          review: false
        });
      }
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const generateAvatarInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const generateAvatarGradient = (name: string) => {
    const colors = [
      'from-purple-500 to-pink-500',
      'from-blue-500 to-teal-500',
      'from-green-500 to-emerald-500',
      'from-orange-500 to-red-500',
      'from-indigo-500 to-purple-500',
      'from-pink-500 to-rose-500',
      'from-cyan-500 to-blue-500',
      'from-yellow-500 to-orange-500'
    ];
    const hash = name ? name.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 0;
    return colors[hash % colors.length];
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  // Enhanced Review Card Component matching standalone HTML
  const ReviewCard = ({ isMobile = false }) => {
    const userName = formData.instagramHandle.replace('@', '') || 'Username';
    const avatarInitial = generateAvatarInitial(userName);
    const avatarGradient = generateAvatarGradient(userName);
    
    const cardSize = isMobile 
      ? "w-48 h-72" // Smaller for mobile
      : "w-80 h-[480px]"; // Larger for desktop
    
    return (
      <div className={`relative ${cardSize} aspect-[2/3] flex-shrink-0 rounded-2xl overflow-hidden transition-transform duration-500 ease-in-out hover:scale-105 shadow-xl group bg-gray-900`}>
        {formData.mediaUrl ? (
          <>
            {formData.mediaType === 'video' ? (
              <video 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                src={formData.mediaUrl} 
                muted 
                loop 
                autoPlay 
                playsInline
              />
            ) : (
              <img 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                src={formData.mediaUrl} 
                alt="Review media"
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <Camera className={`${isMobile ? 'w-12 h-12' : 'w-20 h-20'} text-gray-400`} />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
        
        <div className={`relative z-10 ${isMobile ? 'p-3' : 'p-6'} flex flex-col justify-end h-full text-white`}>
          <div className={`space-y-${isMobile ? '2' : '3'}`}>
            <div className="flex items-center space-x-1">
              {Array.from({ length: 5 }, (_, i) => (
                <svg key={i} className={`${isMobile ? 'w-3 h-3' : 'w-5 h-5'} ${i < formData.rating ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.445a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.367-2.445a1 1 0 00-1.175 0l-3.367 2.445c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z"></path>
                </svg>
              ))}
            </div>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-white/90 line-clamp-2 select-none`}>
              "{formData.description || 'Your review will appear here...'}"
            </p>
            <div className={`flex items-center space-x-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              <div className={`${isMobile ? 'w-6 h-6' : 'w-10 h-10'} rounded-full overflow-hidden bg-gradient-to-br ${avatarGradient} flex items-center justify-center font-bold text-white`}>
                {formData.profilePictureUrl ? (
                  <img 
                    src={formData.profilePictureUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  avatarInitial
                )}
              </div>
              <div className="flex items-center space-x-1.5 group">
                <svg className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-white/80 group-hover:text-blue-300`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.585-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.85-.07-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.069-1.645-.069-4.85s.011-3.585.069-4.85c.149-3.225 1.664-4.771 4.919-4.919 1.266-.057 1.644-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.689-.073-4.948-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.791-4 4-4 4 1.79 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44 1.441-.645 1.441-1.44-.645-1.44-1.441-1.44z"/>
                </svg>
                <span className="font-medium text-white group-hover:text-blue-300 transition-colors">
                  {formData.instagramHandle || '@username'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-2 md:p-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Form Section */}
          <div className="space-y-4">
            {/* Mobile Preview - Enhanced */}
            <div className="lg:hidden mb-6">
              <Card className="bg-gradient-to-br from-slate-50 to-white border-2">
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      Live Preview
                    </h3>
                    <p className="text-sm text-muted-foreground">See how your review will look</p>
                  </div>
                  <div className="flex justify-center">
                    <ReviewCard isMobile={true} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl md:text-2xl font-bold text-center">Share Your Review</CardTitle>
                <p className="text-center text-muted-foreground text-sm">
                  Tell others about your experience and help them make informed decisions
                </p>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                  
                  {/* Basic Information */}
                  <Collapsible open={expandedSections.basic} onOpenChange={() => toggleSection('basic')}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto text-base md:text-lg font-semibold hover:bg-transparent">
                        <span>Basic Information</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.basic ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 md:space-y-4 mt-3 md:mt-4">
                      <div className="grid grid-cols-1 gap-3 md:gap-4">
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium mb-1 md:mb-2">
                            Email *
                          </label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="your.email@example.com"
                            required
                            className="h-9 md:h-10"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="instagramHandle" className="block text-sm font-medium mb-1 md:mb-2">
                            Instagram Handle *
                          </label>
                          <Input
                            id="instagramHandle"
                            type="text"
                            value={formData.instagramHandle}
                            onChange={(e) => setFormData({ ...formData, instagramHandle: e.target.value })}
                            placeholder="@yourusername"
                            required
                            className="h-9 md:h-10"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1 md:mb-2">
                            Profile Picture *
                          </label>
                          <div className="flex items-center space-x-3 md:space-x-4">
                            <div className="relative">
                              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden bg-gray-100 relative">
                                {formData.profilePictureUrl ? (
                                  <img 
                                    src={formData.profilePictureUrl} 
                                    alt="Profile preview" 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <Camera className="w-5 h-5 md:w-6 md:h-6" />
                                  </div>
                                )}
                                {isProfileUploading && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                      <path
                                        className="text-gray-200"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      />
                                      <path
                                        className="text-primary"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeDasharray={`${profileUploadProgress}, 100`}
                                      />
                                    </svg>
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
                                if (file) {
                                  handleProfilePictureUpload(file);
                                }
                              }}
                              className="hidden"
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => profileFileRef.current?.click()}
                              disabled={isProfileUploading}
                              className="h-8 md:h-9 text-xs md:text-sm"
                            >
                              <Camera className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                              {isProfileUploading ? 'Uploading...' : (formData.profilePictureUrl ? 'Change' : 'Upload')}
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {formData.email && formData.instagramHandle && formData.profilePictureUrl && (
                        <div className="pt-4 border-t">
                          <Button 
                            type="button"
                            onClick={nextStep}
                            className="w-full h-11 text-base font-medium"
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Rating Section */}
                  <Collapsible open={expandedSections.rating} onOpenChange={() => toggleSection('rating')}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto text-base md:text-lg font-semibold hover:bg-transparent">
                        <span>Your Experience</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.rating ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 md:space-y-4 mt-3 md:mt-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 md:mb-2">
                          Rating *
                        </label>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFormData({ ...formData, rating: star })}
                              className="focus:outline-none"
                            >
                              <Star
                                className={`w-6 h-6 md:w-8 md:h-8 transition-colors ${
                                  star <= formData.rating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300 hover:text-gray-400'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {formData.rating > 0 && (
                        <div className="pt-4 border-t">
                          <div className="grid grid-cols-2 gap-3">
                            <Button 
                              type="button"
                              variant="outline"
                              onClick={prevStep}
                              className="h-11"
                            >
                              Back
                            </Button>
                            <Button 
                              type="button"
                              onClick={nextStep}
                              className="h-11"
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Media Upload Section */}
                  <Collapsible open={expandedSections.media} onOpenChange={() => toggleSection('media')}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto text-base md:text-lg font-semibold hover:bg-transparent">
                        <span>Add Media *</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.media ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 md:space-y-4 mt-3 md:mt-4">
                      {formData.mediaUrl && (
                        <div className="relative w-full h-48 md:h-64 bg-gray-100 rounded-lg overflow-hidden">
                          {formData.mediaType === 'video' ? (
                            <video 
                              src={formData.mediaUrl} 
                              className="w-full h-full object-cover"
                              controls
                            />
                          ) : (
                            <img 
                              src={formData.mediaUrl} 
                              alt="Review media" 
                              className="w-full h-full object-cover"
                            />
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setFormData({ ...formData, mediaUrl: '', mediaType: 'image' })}
                            className="absolute top-2 right-2 h-7 text-xs"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                      
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <Progress value={uploadProgress} className="w-full" />
                      )}
                      
                      <div className="flex flex-col gap-2 md:hidden">
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <input
                          ref={cameraRef}
                          type="file"
                          accept="image/*,video/*"
                          capture="environment"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileRef.current?.click()}
                          disabled={uploadProgress > 0 && uploadProgress < 100}
                          className="h-9 justify-start"
                        >
                          <Paperclip className="w-4 h-4 mr-2" />
                          Attach Photo/Video
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => cameraRef.current?.click()}
                          disabled={uploadProgress > 0 && uploadProgress < 100}
                          className="h-9 justify-start"
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Capture Photo/Video
                        </Button>
                      </div>
                      
                      <div className="hidden md:block">
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileRef.current?.click()}
                          disabled={uploadProgress > 0 && uploadProgress < 100}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Photo/Video
                        </Button>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <div className="grid grid-cols-2 gap-3">
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={prevStep}
                            className="h-11"
                          >
                            Back
                          </Button>
                          <Button 
                            type="button"
                            onClick={nextStep}
                            className="h-11"
                            disabled={!formData.mediaUrl}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Review Text Section */}
                  <Collapsible open={expandedSections.review} onOpenChange={() => toggleSection('review')}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto text-base md:text-lg font-semibold hover:bg-transparent">
                        <span>Your Review</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.review ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 md:space-y-4 mt-3 md:mt-4">
                      <div>
                        <label htmlFor="description" className="block text-sm font-medium mb-1 md:mb-2">
                          Your Review *
                        </label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Share your experience, what you liked, what could be improved..."
                          rows={3}
                          required
                          className="resize-none"
                        />
                      </div>
                      
                      <div className="pt-4 border-t">
                        <div className="grid grid-cols-2 gap-3">
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={prevStep}
                            className="h-11"
                          >
                            Back
                          </Button>
                          <Button 
                            type="submit" 
                            className="h-11" 
                            disabled={isSubmitting || !formData.description}
                          >
                            {isSubmitting ? 'Submitting...' : 'Submit'}
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Desktop Preview - Enhanced */}
          <div className="hidden lg:block">
            <div className="sticky top-8">
              <Card className="bg-gradient-to-br from-slate-50 to-white border-2 shadow-lg">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                      Live Preview
                    </h3>
                    <p className="text-muted-foreground">See how your review will look to others</p>
                  </div>
                  <div className="flex justify-center">
                    <ReviewCard isMobile={false} />
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