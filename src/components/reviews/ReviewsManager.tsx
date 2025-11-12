import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/contexts/AuthContext';
import { 
  Star, 
  Settings, 
  FileText, 
  Clock, 
  Users, 
  Eye, 
  Check, 
  X, 
  Trash2, 
  Edit, 
  RefreshCw,
  Archive,
  ChevronUp,
  ChevronDown,
  Copy,
  Link,
  Calendar,
  TrendingUp,
  UserPlus,
  Tag,
  Mail,
  Download,
  Upload,
  Image,
  Video
} from "lucide-react";

interface Review {
  id: string;
  user_email: string;
  user_name: string;
  media_url: string;
  media_type: string;
  thumbnail_url?: string;
  rating: number;
  description: string;
  user_avatar: string;
  user_instagram_handle: string;
  is_active: boolean;
  sort_order: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface Customer {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface ReviewWithCustomer extends Review {
  customer?: Customer;
  isExistingCustomer: boolean;
}

interface ReviewStats {
  total_submissions: number;
  pending_count: number;
  approved_count: number;
  average_rating: number;
  total_published: number;
}

export const ReviewsManager = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [reviews, setReviews] = useState<ReviewWithCustomer[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    total_submissions: 0,
    pending_count: 0,
    approved_count: 0,
    average_rating: 0,
    total_published: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewWithCustomer | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Partial<Review>>({});
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaUploadProgress, setMediaUploadProgress] = useState(0);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailUploadProgress, setThumbnailUploadProgress] = useState(0);
  const [addCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    tags: [] as string[]
  });
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [editingTags, setEditingTags] = useState<{ [key: string]: string[] }>({});
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0);
  const { toast } = useToast();

  // Demo user ID for contacts
  // Remove the hardcoded DEMO_USER_ID line since we're using auth now

  // Fetch customers for cross-reference
  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, email, first_name, last_name, status, tags, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('status', 'subscribed');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  // Fetch reviews with customer lookup
  const fetchReviews = async (filterActive?: boolean) => {
    setLoading(true);
    try {
      console.log('Fetching reviews with filterActive:', filterActive);
      
      let query = supabase
        .from('reviews')
        .select('*')
        .order('sort_order', { ascending: false });
      
      if (filterActive !== undefined) {
        query = query.eq('is_active', filterActive);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Fetched reviews:', data?.length || 0, 'reviews');
      
      // Cross-reference with customers
      const reviewsWithCustomers: ReviewWithCustomer[] = (data || []).map((review: Review) => {
        const customer = customers.find(c => c.email.toLowerCase() === review.user_email?.toLowerCase());
        return {
          ...review,
          user_name: review.user_instagram_handle?.replace('@', '') || review.user_email?.split('@')[0] || 'Anonymous',
          customer,
          isExistingCustomer: !!customer
        };
      });
      
      setReviews(reviewsWithCustomers);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({
        title: "Error",
        description: "Failed to fetch reviews",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch review statistics
  const fetchStats = async () => {
    try {
      const { data: allReviews, error } = await supabase
        .from('reviews')
        .select('*');
      
      if (error) throw error;
      
      const total = allReviews?.length || 0;
      const pending = allReviews?.filter((r: any) => !r.is_active).length || 0;
      const approved = allReviews?.filter((r: any) => r.is_active).length || 0;
      const avgRating = total > 0 
        ? allReviews.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / total 
        : 0;

      setStats({
        total_submissions: total,
        pending_count: pending,
        approved_count: approved,
        average_rating: Number(avgRating.toFixed(1)),
        total_published: approved
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Fetch available tags from reviews
  const fetchAvailableTags = async () => {
    try {
      const { data, error } = await supabase.rpc('get_review_tags');
      if (error) throw error;
      setAvailableTags(data?.map((item: any) => item.tag) || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  // Update review
  const updateReview = async (reviewId: string, updates: Partial<Review>) => {
    try {
      console.log('Updating review:', reviewId, updates);
      
      // Filter out fields that don't exist in the database table
      const validDbFields = [
        'rating', 'is_active', 'sort_order', 'media_url', 'media_type', 
        'user_email', 'description', 'user_avatar', 'user_instagram_handle', 
        'user_name', 'media_url_optimized', 'thumbnail_url', 'tags'
      ];
      
      const filteredUpdates = Object.keys(updates)
        .filter(key => validDbFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key as keyof Review];
          return obj;
        }, {} as Partial<Review>);
      
      console.log('Filtered updates for database:', filteredUpdates);
      
      const { error } = await supabase
        .from('reviews')
        .update(filteredUpdates)
        .eq('id', reviewId);
      
      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }
      
      console.log('Review updated successfully');
      
      toast({
        title: "Success",
        description: "Review updated successfully",
      });
      
      // Update local state immediately for instant UI feedback
      setReviews(prevReviews => 
        prevReviews.map(review => 
          review.id === reviewId 
            ? { ...review, ...filteredUpdates }
            : review
        )
      );
      
    } catch (error) {
      console.error('Error updating review:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update review",
        variant: "destructive",
      });
      throw error; // Re-throw to let the caller handle it
    }
  };

  // Update review tags
  const updateReviewTags = async (reviewId: string, tags: string[]) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ tags })
        .eq('id', reviewId);
      
      if (error) throw error;
      
      // Update local state
      setReviews(prev => prev.map(review => 
        review.id === reviewId ? { ...review, tags } : review
      ));
      
      // Refresh available tags
      fetchAvailableTags();
      
      toast({
        title: "Tags updated",
        description: "Review tags have been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating tags:', error);
      toast({
        title: "Error",
        description: "Failed to update tags. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Delete review and associated media
  const deleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this review and its media?')) return;
    
    try {
      // First, get the review to find the media file
      const { data: review, error: fetchError } = await supabase
        .from('reviews')
        .select('media_url')
        .eq('id', reviewId)
        .single();

      if (fetchError) throw fetchError;

      // Extract file path from URL for storage deletion
      if (review?.media_url && !review.media_url.includes('placeholder.svg')) {
        const urlParts = review.media_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('reviews')
          .remove([fileName]);
        
        if (storageError) console.warn('Failed to delete media file:', storageError);
      }

      // Delete the review record
      const { error: deleteError } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);
      
      if (deleteError) throw deleteError;
      
      toast({
        title: "Success",
        description: "Review and media deleted successfully",
      });
      
      fetchReviews(activeTab === 'pending' ? false : activeTab === 'published' ? true : undefined);
      fetchStats();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive",
      });
    }
  };

  // Update sort order
  const updateSortOrder = async (reviewId: string, direction: 'up' | 'down') => {
    const currentReview = reviews.find(r => r.id === reviewId);
    if (!currentReview) return;

    const newSortOrder = direction === 'up' ? currentReview.sort_order + 1 : currentReview.sort_order - 1;
    await updateReview(reviewId, { sort_order: newSortOrder });
  };

  // Copy submission link
  const copySubmissionLink = () => {
    const link = `${window.location.origin}/submit-review`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied!",
      description: "Submission link copied to clipboard",
    });
  };

  // Handle edit form
  const handleEditSave = async () => {
    if (!selectedReview || !editingReview) {
      console.log('Missing selectedReview or editingReview');
      return;
    }
    
    try {
      console.log('Saving review with data:', editingReview);
      await updateReview(selectedReview.id, editingReview);
      
      // Close dialog and reset state
      setEditDialogOpen(false);
      setSelectedReview(null);
      setEditingReview({});
      
      // Force a fresh fetch of reviews to ensure UI updates
      await fetchReviews(activeTab === 'pending' ? false : activeTab === 'published' ? true : undefined);
      
    } catch (error) {
      console.error('Error in handleEditSave:', error);
      // Don't close dialog on error so user can try again
    }
  };

  // Add new customer from review
  const addCustomerFromReview = async (review: ReviewWithCustomer) => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          user_id: user.id,
          email: review.user_email,
          first_name: review.user_name?.split(' ')[0] || null,
          last_name: review.user_name?.split(' ').slice(1).join(' ') || null,
          status: 'subscribed',
          tags: ['review-submitter']
        })
        .select()
        .single();

      if (error) throw error;

      // Update customers list and refresh reviews
      setCustomers(prev => [...prev, data]);
      await fetchReviews(activeTab === 'published' ? true : activeTab === 'pending' ? false : undefined);
      
      toast({
        title: "Success",
        description: "Customer added successfully",
      });
    } catch (error) {
      console.error('Error adding customer:', error);
      toast({
        title: "Error",
        description: "Failed to add customer",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchStats();
    fetchAvailableTags();
  }, []);

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchReviews(false);
    } else if (activeTab === 'published') {
      fetchReviews(true);
    } else if (activeTab === 'analytics') {
      fetchStats();
    } else if (activeTab === 'all') {
      fetchReviews();
    }
  }, [activeTab]);

  // Re-fetch reviews when customers change
  useEffect(() => {
    if (customers.length > 0) {
      if (activeTab === 'pending') {
        fetchReviews(false);
      } else if (activeTab === 'published') {
        fetchReviews(true);
      } else if (activeTab === 'all') {
        fetchReviews();
      }
    }
  }, [customers]);

  // Debug function to test pending reviews
  const testPendingReviews = async () => {
    console.log('Testing pending reviews...');
    console.log('Current activeTab:', activeTab);
    console.log('Current customers:', customers);
    
    // Test direct database query
    try {
      console.log('Testing direct database query...');
      const { data: allReviews, error } = await supabase
        .from('reviews')
        .select('*');
      
      if (error) {
        console.error('Database error:', error);
      } else {
        console.log('All reviews in database:', allReviews);
        console.log('Pending reviews (is_active = false):', allReviews?.filter(r => !r.is_active));
        console.log('Published reviews (is_active = true):', allReviews?.filter(r => r.is_active));
      }
    } catch (error) {
      console.error('Error testing database:', error);
    }
    
    await fetchReviews(false);
    console.log('Current reviews after fetch:', reviews);
  };


  // Function to check database schema and table existence
  const checkDatabaseSchema = async () => {
    console.log('Checking database schema...');
    
    try {
      // Test if reviews table exists by trying to select from it
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('Reviews table error:', error);
        if (error.code === 'PGRST116') {
          console.error('Reviews table does not exist!');
        }
      } else {
        console.log('Reviews table exists and is accessible');
        console.log('Sample data:', data);
      }
      
      // Check table structure by trying to insert a test record (then delete it)
      const testReview = {
        user_email: 'test@example.com',
        user_name: 'Test User',
        user_instagram_handle: '@testuser',
        rating: 5,
        description: 'Test review for schema validation',
        user_avatar: 'https://example.com/avatar.jpg',
        media_url: 'https://example.com/image.jpg',
        media_type: 'image',
        is_active: false,
        sort_order: 0
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('reviews')
        .insert(testReview)
        .select();
      
      if (insertError) {
        console.error('Insert test failed:', insertError);
      } else {
        console.log('Insert test successful:', insertData);
        
        // Clean up test record
        if (insertData && insertData[0]) {
          await supabase
            .from('reviews')
            .delete()
            .eq('id', insertData[0].id);
          console.log('Test record cleaned up');
        }
      }
      
    } catch (error) {
      console.error('Schema check error:', error);
    }
  };

  // Make functions available globally for debugging
  (window as any).testPendingReviews = testPendingReviews;
  (window as any).checkDatabaseSchema = checkDatabaseSchema;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (rating: number, clickable: boolean = false, onRatingChange?: (rating: number) => void) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} ${
          clickable ? 'cursor-pointer hover:fill-yellow-300 hover:text-yellow-300' : ''
        }`}
        onClick={clickable && onRatingChange ? () => onRatingChange(i + 1) : undefined}
      />
    ));
  };

  // Media management functions
  const downloadMedia = async (mediaUrl: string, fileName?: string) => {
    try {
      // Show loading toast
      toast({
        title: "Preparing Download",
        description: "Fetching media file...",
      });

      // Always try to fetch the file first to ensure proper download
      const response = await fetch(mediaUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Accept': '*/*',
          'Cache-Control': 'no-cache',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Get the blob data
      const blob = await response.blob();
      
      // Create a proper filename with extension
      let finalFileName = fileName;
      
      if (!finalFileName) {
        // Try to get filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (fileNameMatch && fileNameMatch[1]) {
            finalFileName = fileNameMatch[1].replace(/['"]/g, '');
          }
        }
        
        // Fallback to URL-based filename
        if (!finalFileName) {
          const urlParts = mediaUrl.split('/');
          const originalFileName = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params
          const fileExtension = originalFileName.includes('.') ? originalFileName.split('.').pop() : '';
          finalFileName = `review-media-${Date.now()}${fileExtension ? '.' + fileExtension : ''}`;
        }
      }
      
      // Create blob URL and download
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = finalFileName;
      link.style.display = 'none';
      
      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup blob URL
      window.URL.revokeObjectURL(blobUrl);
      
      toast({
        title: "Download Complete",
        description: `Media file "${finalFileName}" downloaded successfully`,
      });
      
    } catch (error) {
      console.error('Error downloading media:', error);
      
      // Fallback: Try to open in new tab with download hint
      try {
        toast({
          title: "Download Method Changed",
          description: "Opening media in new tab. Right-click and 'Save as' to download.",
        });
        
        const link = document.createElement('a');
        link.href = mediaUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        toast({
          title: "Download Failed",
          description: "Could not download the media file. Please try right-clicking the media and selecting 'Save as'",
          variant: "destructive",
        });
      }
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

  const handleMediaUpload = async (file: File) => {
    setMediaUploading(true);
    try {
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      console.log('Uploading file:', file.name, 'type:', mediaType);
      
      const url = await uploadToR2(file, (progress) => {
        setMediaUploadProgress(progress);
      });
      
      console.log('Upload successful, URL:', url);
      
      const updatedMediaData = {
        media_url: url,
        media_type: mediaType
      };
      
      setEditingReview(prev => ({
        ...prev,
        ...updatedMediaData
      }));
      
      console.log('Updated editingReview with media data:', updatedMediaData);
      
      toast({
        title: "Success",
        description: "Media uploaded successfully",
      });
    } catch (error) {
      console.error('Media upload failed:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload media. Please try again.",
        variant: "destructive",
      });
    } finally {
      setMediaUploading(false);
      setMediaUploadProgress(0);
    }
  };

  const removeMedia = () => {
    setEditingReview(prev => ({
      ...prev,
      media_url: '',
      media_type: 'image'
    }));
  };

  const handleThumbnailUpload = async (file: File) => {
    setThumbnailUploading(true);
    try {
      console.log('Uploading thumbnail:', file.name);
      
      const url = await uploadToR2(file, (progress) => {
        setThumbnailUploadProgress(progress);
      });
      
      console.log('Thumbnail upload successful, URL:', url);
      
      setEditingReview(prev => ({
        ...prev,
        thumbnail_url: url
      }));
      
      toast({
        title: "Success",
        description: "Thumbnail uploaded successfully",
      });
    } catch (error) {
      console.error('Thumbnail upload failed:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload thumbnail. Please try again.",
        variant: "destructive",
      });
    } finally {
      setThumbnailUploading(false);
      setThumbnailUploadProgress(0);
    }
  };

  const removeThumbnail = () => {
    setEditingReview(prev => ({
      ...prev,
      thumbnail_url: ''
    }));
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    try {
      console.log('Uploading avatar:', file.name);
      
      const url = await uploadToR2(file, (progress) => {
        setAvatarUploadProgress(progress);
      });
      
      console.log('Avatar upload successful, URL:', url);
      
      setEditingReview(prev => ({
        ...prev,
        user_avatar: url
      }));
      
      toast({
        title: "Success",
        description: "Avatar uploaded successfully",
      });
    } catch (error) {
      console.error('Avatar upload failed:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAvatarUploading(false);
      setAvatarUploadProgress(0);
    }
  };

  const extractVideoFrame = async () => {
    const video = document.getElementById('video-frame-extractor') as HTMLVideoElement;
    if (!video) {
      toast({
        title: "Error",
        description: "Video element not found",
        variant: "destructive",
      });
      return;
    }

    // Ensure video is loaded and ready
    if (video.readyState < 2) {
      toast({
        title: "Loading Video",
        description: "Please wait for the video to load completely...",
      });
      
      // Wait for video to load
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video loading timeout - please check the video URL'));
        }, 15000); // 15 second timeout

        const onLoadedData = () => {
          clearTimeout(timeout);
          video.removeEventListener('loadeddata', onLoadedData);
          video.removeEventListener('error', onError);
          resolve();
        };

        const onError = (e: Event) => {
          clearTimeout(timeout);
          video.removeEventListener('loadeddata', onLoadedData);
          video.removeEventListener('error', onError);
          reject(new Error('Video failed to load - check CORS settings or video URL'));
        };

        video.addEventListener('loadeddata', onLoadedData);
        video.addEventListener('error', onError);
        
        // Try to load the video
        video.load();
      });
    }

    try {
      setThumbnailUploading(true);
      
      // Create canvas to capture frame
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      
      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/jpeg', 0.8);
      });
      
      // Create file from blob
      const file = new File([blob], `frame-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      // Upload the extracted frame
      await handleThumbnailUpload(file);
      
      toast({
        title: "Success",
        description: "Frame extracted and uploaded as thumbnail",
      });
      
    } catch (error) {
      console.error('Frame extraction failed:', error);
      toast({
        title: "Extraction Failed",
        description: error instanceof Error ? error.message : "Failed to extract frame from video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setThumbnailUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                Reviews Manager
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage customer reviews and submissions
              </p>
            </div>
            <Button onClick={copySubmissionLink} variant="outline" size="sm">
              <Link className="h-4 w-4 mr-2" />
              Copy Submission Link
            </Button>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto p-3 md:p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Navigation Tabs */}
          <div className="bg-card rounded-lg border p-1 shadow-sm">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full bg-transparent gap-1 h-auto">
              <TabsTrigger 
                value="pending" 
                className="flex items-center justify-center gap-1.5 text-xs md:text-sm px-2 md:px-3 py-2.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Pending</span>
                {stats.pending_count > 0 && (
                  <div className="ml-1 bg-destructive text-destructive-foreground rounded-full min-w-[20px] h-5 flex items-center justify-center text-xs font-medium px-1">
                    {stats.pending_count}
                  </div>
                )}
              </TabsTrigger>
              
              <TabsTrigger 
                value="published" 
                className="flex items-center justify-center gap-1.5 text-xs md:text-sm px-2 md:px-3 py-2.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Published</span>
                {stats.approved_count > 0 && (
                  <div className="ml-1 bg-green-500 text-white rounded-full min-w-[20px] h-5 flex items-center justify-center text-xs font-medium px-1">
                    {stats.approved_count}
                  </div>
                )}
              </TabsTrigger>
              
              <TabsTrigger 
                value="analytics" 
                className="flex items-center justify-center gap-1.5 text-xs md:text-sm px-2 md:px-3 py-2.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="all" 
                className="flex items-center justify-center gap-1.5 text-xs md:text-sm px-2 md:px-3 py-2.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">All Reviews</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Pending Reviews Tab */}
          <TabsContent value="pending" className="space-y-0">
            <Card className="shadow-xl shadow-email-primary/10 bg-gradient-to-br from-email-background via-white to-email-muted/20 border border-email-primary/20">
              <CardHeader className="bg-gradient-to-r from-email-primary/5 via-email-accent/5 to-email-primary/5 border-b border-email-primary/20">
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-sm">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-email-secondary font-semibold">Pending Reviews</span>
                    </CardTitle>
                    <p className="text-sm text-email-secondary/80 mt-2">
                      Review and approve incoming submissions
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => fetchReviews(false)} disabled={loading} className="border-email-primary/30 text-email-secondary hover:bg-email-primary/10 hover:border-email-primary/50 transition-all duration-200">
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Tag Filter Section */}
                <div className="mb-6 p-4 bg-gradient-to-r from-email-primary/5 to-email-accent/5 rounded-lg border border-email-primary/20">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-6 bg-gradient-to-b from-email-primary to-email-accent rounded-full"></div>
                      <h3 className="text-sm font-semibold text-email-primary">Filter by Tags</h3>
                    </div>
                    <Select value={tagFilter} onValueChange={setTagFilter}>
                      <SelectTrigger className="w-48 border-email-primary/30 focus:border-email-primary focus:ring-2 focus:ring-email-primary/20 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                        <SelectValue placeholder="Filter by tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tags</SelectItem>
                        {availableTags.map(tag => (
                          <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {loading ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Loading reviews...</p>
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No pending reviews</h3>
                    <p className="text-muted-foreground">New submissions will appear here for approval</p>
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left max-w-md mx-auto">
                      <p className="text-sm text-gray-600 mb-2">Debug Info:</p>
                      <p className="text-xs text-gray-500">Active Tab: {activeTab}</p>
                      <p className="text-xs text-gray-500">Loading: {loading ? 'Yes' : 'No'}</p>
                      <p className="text-xs text-gray-500">Reviews Count: {reviews.length}</p>
                      <p className="text-xs text-gray-500">Customers Count: {customers.length}</p>
                      <div className="flex gap-2 mt-2">
                        <Button 
                          onClick={testPendingReviews} 
                          variant="outline" 
                          size="sm" 
                          className="text-xs"
                        >
                          Debug Fetch
                        </Button>
                        <Button 
                          onClick={checkDatabaseSchema} 
                          variant="outline" 
                          size="sm" 
                          className="text-xs"
                        >
                          Check Schema
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img 
                                src={review.user_avatar} 
                                alt="User avatar"
                                className="w-10 h-10 rounded-full object-cover"
                              />
                              {/* Customer Status Indicator */}
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                                review.isExistingCustomer ? 'bg-green-500' : 'bg-yellow-500'
                              }`} title={review.isExistingCustomer ? 'Existing Customer' : 'New Customer'} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{review.user_name}</span>
                                {review.isExistingCustomer && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    <UserPlus className="h-3 w-3 mr-1" />
                                    Customer
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">@{review.user_instagram_handle}</div>
                              <div className="text-xs text-muted-foreground">{review.user_email}</div>
                              {review.customer?.tags && review.customer.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {review.customer.tags.slice(0, 3).map((tag, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      <Tag className="h-2 w-2 mr-1" />
                                      {tag}
                                    </Badge>
                                  ))}
                                  {review.customer.tags.length > 3 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{review.customer.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {formatDate(review.created_at)}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant={review.is_active ? "default" : "secondary"}>
                              {review.is_active ? "Published" : "Pending"}
                            </Badge>
                            {!review.isExistingCustomer && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addCustomerFromReview(review)}
                                className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                              >
                                <UserPlus className="h-3 w-3 mr-1" />
                                Add Customer
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {renderStars(review.rating)}
                          <span className="ml-2 text-sm font-medium">{review.rating}/5</span>
                        </div>
                        
                        <p className="text-sm">{review.description}</p>
                        
                        {review.tags && review.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {review.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {review.media_url && (
                          <div className="mt-2">
                            {review.media_type === 'video' ? (
                              <video 
                                src={review.media_url} 
                                className="max-w-xs rounded-lg"
                                controls
                                muted
                              />
                            ) : (
                              <img 
                                src={review.media_url} 
                                alt="Review media"
                                className="max-w-xs rounded-lg"
                              />
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 pt-2 flex-wrap">
                          <Button
                            size="sm"
                            onClick={() => updateReview(review.id, { is_active: true })}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedReview(review);
                              setEditingReview(review);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteReview(review.id)}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Published Reviews Tab */}
          <TabsContent value="published" className="space-y-0">
            <Card className="shadow-xl shadow-email-primary/10 bg-gradient-to-br from-email-background via-white to-email-muted/20 border border-email-primary/20">
              <CardHeader className="bg-gradient-to-r from-email-primary/5 via-email-accent/5 to-email-primary/5 border-b border-email-primary/20">
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm">
                        <Star className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-email-secondary font-semibold">Published Reviews</span>
                    </CardTitle>
                    <p className="text-sm text-email-secondary/80 mt-2">
                      Manage approved and published reviews
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => fetchReviews(true)} disabled={loading} className="border-email-primary/30 text-email-secondary hover:bg-email-primary/10 hover:border-email-primary/50 transition-all duration-200">
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Tag Filter Section */}
                <div className="mb-6 p-4 bg-gradient-to-r from-email-primary/5 to-email-accent/5 rounded-lg border border-email-primary/20">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-1 h-6 bg-gradient-to-b from-email-primary to-email-accent rounded-full"></div>
                      <h3 className="text-sm font-semibold text-email-primary">Filter by Tags</h3>
                    </div>
                    <Select value={tagFilter} onValueChange={setTagFilter}>
                      <SelectTrigger className="w-48 border-email-primary/30 focus:border-email-primary focus:ring-2 focus:ring-email-primary/20 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                        <SelectValue placeholder="Filter by tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tags</SelectItem>
                        {availableTags.map(tag => (
                          <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {loading ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Loading reviews...</p>
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-12">
                    <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No published reviews</h3>
                    <p className="text-muted-foreground">Approved reviews will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img 
                                src={review.user_avatar} 
                                alt="User avatar"
                                className="w-10 h-10 rounded-full object-cover"
                              />
                              {/* Customer Status Indicator */}
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                                review.isExistingCustomer ? 'bg-green-500' : 'bg-yellow-500'
                              }`} title={review.isExistingCustomer ? 'Existing Customer' : 'New Customer'} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{review.user_name}</span>
                                {review.isExistingCustomer && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    <UserPlus className="h-3 w-3 mr-1" />
                                    Customer
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">@{review.user_instagram_handle}</div>
                              {review.customer?.tags && review.customer.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {review.customer.tags.slice(0, 3).map((tag, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      <Tag className="h-2 w-2 mr-1" />
                                      {tag}
                                    </Badge>
                                  ))}
                                  {review.customer.tags.length > 3 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{review.customer.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                Sort Order: {review.sort_order}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateSortOrder(review.id, 'up')}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateSortOrder(review.id, 'down')}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {renderStars(review.rating)}
                          <span className="ml-2 text-sm font-medium">{review.rating}/5</span>
                        </div>
                        
                        <p className="text-sm">{review.description}</p>
                        
                        {review.tags && review.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {review.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {review.media_url && (
                          <div className="mt-2">
                            {review.media_type === 'video' ? (
                              <video 
                                src={review.media_url} 
                                className="max-w-xs rounded-lg"
                                controls
                                muted
                              />
                            ) : (
                              <img 
                                src={review.media_url} 
                                alt="Review media"
                                className="max-w-xs rounded-lg"
                              />
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 pt-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateReview(review.id, { is_active: false })}
                          >
                            <Archive className="h-4 w-4 mr-1" />
                            Unpublish
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedReview(review);
                              setEditingReview(review);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteReview(review.id)}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="shadow-xl shadow-blue-500/10 bg-gradient-to-br from-blue-50 via-white to-blue-50/50 border border-blue-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-blue-700">Total Submissions</CardTitle>
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{stats.total_submissions}</div>
                </CardContent>
              </Card>
              
              <Card className="shadow-xl shadow-yellow-500/10 bg-gradient-to-br from-yellow-50 via-white to-yellow-50/50 border border-yellow-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-yellow-700">Pending Reviews</CardTitle>
                  <div className="p-2 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-sm">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">{stats.pending_count}</div>
                </CardContent>
              </Card>
              
              <Card className="shadow-xl shadow-green-500/10 bg-gradient-to-br from-green-50 via-white to-green-50/50 border border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-green-700">Published Reviews</CardTitle>
                  <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm">
                    <Star className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{stats.approved_count}</div>
                </CardContent>
              </Card>
              
              <Card className="shadow-xl shadow-email-accent/10 bg-gradient-to-br from-email-accent/10 via-white to-email-accent/5 border border-email-accent/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-email-accent">Average Rating</CardTitle>
                  <div className="p-2 bg-gradient-to-br from-email-accent to-email-primary rounded-lg shadow-sm">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-email-accent">{stats.average_rating}/5</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* All Reviews Tab */}
          <TabsContent value="all">
            <Card className="shadow-xl shadow-email-primary/10 bg-gradient-to-br from-email-background via-white to-email-muted/20 border border-email-primary/20">
              <CardHeader className="bg-gradient-to-r from-email-primary/5 via-email-accent/5 to-email-primary/5 border-b border-email-primary/20">
                <CardTitle className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-email-primary to-email-accent rounded-lg shadow-sm">
                    <Star className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-email-secondary font-semibold">All Reviews</span>
                </CardTitle>
                <CardDescription className="text-email-secondary/80 mt-2">Complete overview of all review submissions</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Loading reviews...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img 
                                src={review.user_avatar} 
                                alt="User avatar"
                                className="w-10 h-10 rounded-full object-cover"
                              />
                              {/* Customer Status Indicator */}
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                                review.isExistingCustomer ? 'bg-green-500' : 'bg-yellow-500'
                              }`} title={review.isExistingCustomer ? 'Existing Customer' : 'New Customer'} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{review.user_name}</span>
                                {review.isExistingCustomer && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    <UserPlus className="h-3 w-3 mr-1" />
                                    Customer
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">@{review.user_instagram_handle}</div>
                              <div className="text-xs text-muted-foreground">{review.user_email}</div>
                              {review.customer?.tags && review.customer.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {review.customer.tags.slice(0, 3).map((tag, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      <Tag className="h-2 w-2 mr-1" />
                                      {tag}
                                    </Badge>
                                  ))}
                                  {review.customer.tags.length > 3 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{review.customer.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {formatDate(review.created_at)}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant={review.is_active ? "default" : "secondary"}>
                              {review.is_active ? "Published" : "Pending"}
                            </Badge>
                            {!review.isExistingCustomer && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addCustomerFromReview(review)}
                                className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                              >
                                <UserPlus className="h-3 w-3 mr-1" />
                                Add Customer
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {renderStars(review.rating)}
                          <span className="ml-2 text-sm font-medium">{review.rating}/5</span>
                        </div>
                        
                        <p className="text-sm">{review.description}</p>
                        
                        {review.tags && review.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {review.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {review.media_url && (
                          <div className="mt-2">
                            {review.media_type === 'video' ? (
                              <video 
                                src={review.media_url} 
                                className="max-w-xs rounded-lg"
                                controls
                                muted
                              />
                            ) : (
                              <img 
                                src={review.media_url} 
                                alt="Review media"
                                className="max-w-xs rounded-lg"
                              />
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 pt-2 flex-wrap">
                          <Button
                            size="sm"
                            onClick={() => updateReview(review.id, { is_active: !review.is_active })}
                            variant={review.is_active ? "outline" : "default"}
                          >
                            {review.is_active ? (
                              <>
                                <Archive className="h-4 w-4 mr-1" />
                                Unpublish
                              </>
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Publish
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedReview(review);
                              setEditingReview(review);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteReview(review.id)}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Review Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Review</DialogTitle>
              <DialogDescription>
                Make changes to the review details and manage media
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="user_name">Name</Label>
                    <Input
                      id="user_name"
                      value={editingReview.user_name || ''}
                      onChange={(e) => setEditingReview(prev => ({ ...prev, user_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="user_instagram_handle">Instagram Handle</Label>
                    <Input
                      id="user_instagram_handle"
                      value={editingReview.user_instagram_handle || ''}
                      onChange={(e) => setEditingReview(prev => ({ ...prev, user_instagram_handle: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Profile Picture */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Profile Picture</h3>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img 
                      src={editingReview.user_avatar || '/placeholder-avatar.png'} 
                      alt="Profile picture"
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="profile-picture-upload" className="cursor-pointer">
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-3 hover:border-muted-foreground/50 transition-colors">
                        {avatarUploading ? (
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Uploading... {avatarUploadProgress}%
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Upload className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Click to change profile picture
                            </span>
                          </div>
                        )}
                      </div>
                    </Label>
                    <input
                      id="profile-picture-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Rating */}
              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {renderStars(editingReview.rating || 5, true, (rating) => 
                      setEditingReview(prev => ({ ...prev, rating }))
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    ({editingReview.rating || 5}/5)
                  </span>
                </div>
              </div>
              
              {/* Review Text */}
              <div>
                <Label htmlFor="description">Review Text</Label>
                <Textarea
                  id="description"
                  value={editingReview.description || ''}
                  onChange={(e) => setEditingReview(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </div>

              {/* Tags */}
              <div>
                <Label htmlFor="tags">Tags</Label>
                <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px] bg-background">
                  {(editingReview.tags || []).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => {
                          const newTags = (editingReview.tags || []).filter((_, i) => i !== index);
                          setEditingReview(prev => ({ ...prev, tags: newTags }));
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    className="flex-1 min-w-[120px] border-none outline-none bg-transparent"
                    placeholder="Type tag and press Enter..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const value = e.currentTarget.value.trim();
                        if (value && !(editingReview.tags || []).includes(value)) {
                          setEditingReview(prev => ({ 
                            ...prev, 
                            tags: [...(prev.tags || []), value] 
                          }));
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value && !(editingReview.tags || []).includes(value)) {
                        setEditingReview(prev => ({ 
                          ...prev, 
                          tags: [...(prev.tags || []), value] 
                        }));
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Type tags and press Enter or comma. Tags can contain spaces (e.g., "lazy motion")
                </p>
              </div>

              {/* Media Management */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Media Management</h3>
                
                {editingReview.media_url ? (
                  <div className="space-y-3">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">Current Media</span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadMedia(editingReview.media_url!, `review-media-${editingReview.id}`)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={removeMedia}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {editingReview.media_type === 'video' ? (
                          <Video className="h-6 w-6 text-muted-foreground" />
                        ) : (
                          <Image className="h-6 w-6 text-muted-foreground" />
                        )}
                        <div>
                          <div className="text-sm font-medium">
                            {editingReview.media_type === 'video' ? 'Video File' : 'Image File'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Click download to save the file
                          </div>
                        </div>
                      </div>
                      
                      {editingReview.media_url && (
                        <div className="mt-3">
                          {editingReview.media_type === 'video' ? (
                            <video 
                              src={editingReview.media_url} 
                              className="max-w-xs rounded-lg"
                              controls
                              muted
                            />
                          ) : (
                            <img 
                              src={editingReview.media_url} 
                              alt="Review media"
                              className="max-w-xs rounded-lg"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <Label htmlFor="replace-media" className="cursor-pointer">
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                          {mediaUploading ? (
                            <div className="flex flex-col items-center gap-2">
                              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Uploading... {mediaUploadProgress}%
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="h-6 w-6 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Click to replace media
                              </span>
                            </div>
                          )}
                        </div>
                      </Label>
                      <Input
                        id="replace-media"
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleMediaUpload(file);
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Label htmlFor="upload-media" className="cursor-pointer">
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                        {mediaUploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Uploading... {mediaUploadProgress}%
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Click to upload media
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Supports images and videos
                            </span>
                          </div>
                        )}
                      </div>
                    </Label>
                    <Input
                      id="upload-media"
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleMediaUpload(file);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Thumbnail Management */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Thumbnail Management</h3>
                <p className="text-xs text-muted-foreground">
                  Upload a custom thumbnail or extract a frame from the video. This will be shown before the video plays.
                </p>
                
                {editingReview.thumbnail_url ? (
                  <div className="space-y-3">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">Current Thumbnail</span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadMedia(editingReview.thumbnail_url!, `review-thumbnail-${editingReview.id}`)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={removeThumbnail}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 mb-3">
                        <Image className="h-6 w-6 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">Thumbnail Image</div>
                          <div className="text-xs text-muted-foreground">
                            Click download to save the file
                          </div>
                        </div>
                      </div>
                      
                      <img 
                        src={editingReview.thumbnail_url} 
                        alt="Review thumbnail"
                        className="max-w-xs rounded-lg"
                      />
                    </div>

                    <div className="text-center">
                      <Label htmlFor="replace-thumbnail" className="cursor-pointer">
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                          {thumbnailUploading ? (
                            <div className="flex flex-col items-center gap-2">
                              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Uploading... {thumbnailUploadProgress}%
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="h-6 w-6 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Click to replace thumbnail
                              </span>
                            </div>
                          )}
                        </div>
                      </Label>
                      <Input
                        id="replace-thumbnail"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleThumbnailUpload(file);
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center">
                      <Label htmlFor="upload-thumbnail" className="cursor-pointer">
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                          {thumbnailUploading ? (
                            <div className="flex flex-col items-center gap-2">
                              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Uploading... {thumbnailUploadProgress}%
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="h-8 w-8 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Click to upload thumbnail
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Supports images only
                              </span>
                            </div>
                          )}
                        </div>
                      </Label>
                      <Input
                        id="upload-thumbnail"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleThumbnailUpload(file);
                        }}
                      />
                    </div>

                    {/* Video Frame Extractor */}
                    {editingReview.media_type === 'video' && editingReview.media_url && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Video className="h-6 w-6 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">Extract Frame from Video</div>
                            <div className="text-xs text-muted-foreground">
                              Choose a frame from the video as thumbnail
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="relative">
                            <video 
                              className="max-w-xs rounded-lg"
                              controls
                              muted
                              preload="metadata"
                              id="video-frame-extractor"
                              onLoadStart={() => console.log('Video loading started')}
                              onLoadedData={() => console.log('Video data loaded')}
                              onError={(e) => {
                                console.error('Video load error:', e);
                                const video = e.target as HTMLVideoElement;
                                console.error('Video error details:', {
                                  error: video.error,
                                  networkState: video.networkState,
                                  readyState: video.readyState,
                                  src: video.src
                                });
                              }}
                              onCanPlay={() => console.log('Video can play')}
                              onLoadedMetadata={() => console.log('Video metadata loaded')}
                            >
                              <source src={editingReview.media_url} type="video/mp4" />
                              <source src={editingReview.media_url} type="video/webm" />
                              <source src={editingReview.media_url} type="video/ogg" />
                              Your browser does not support the video tag.
                            </video>
                            <div className="mt-2 text-xs text-gray-500">
                              Video URL: {editingReview.media_url}
                            </div>
                            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="text-sm text-yellow-800">
                                <strong>Video not loading?</strong>
                                <ul className="mt-1 text-xs space-y-1">
                                  <li>• Click "Reload Video" to try different formats</li>
                                  <li>• Click "Check Video Access" to diagnose the issue</li>
                                  <li>• The video might have CORS restrictions</li>
                                  <li>• Try opening the video URL directly in a new tab</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const video = document.getElementById('video-frame-extractor') as HTMLVideoElement;
                                if (video) {
                                  // Clear current sources
                                  video.innerHTML = '';
                                  
                                  // Add sources with different approaches
                                  const sources = [
                                    { src: editingReview.media_url, type: 'video/mp4' },
                                    { src: editingReview.media_url, type: 'video/webm' },
                                    { src: editingReview.media_url, type: 'video/ogg' },
                                    { src: editingReview.media_url, type: 'video/quicktime' }
                                  ];
                                  
                                  sources.forEach(source => {
                                    const sourceElement = document.createElement('source');
                                    sourceElement.src = source.src;
                                    sourceElement.type = source.type;
                                    video.appendChild(sourceElement);
                                  });
                                  
                                  // Try different crossOrigin settings
                                  video.crossOrigin = 'anonymous';
                                  video.load();
                                  
                                  toast({
                                    title: "Reloading Video",
                                    description: "Trying different video formats and settings...",
                                  });
                                }
                              }}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Reload Video
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={extractVideoFrame}
                              disabled={thumbnailUploading}
                            >
                              <Image className="h-4 w-4 mr-1" />
                              Extract Current Frame
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  setThumbnailUploading(true);
                                  toast({
                                    title: "Alternative Method",
                                    description: "Trying to extract frame using server-side method...",
                                  });
                                  
                                  // Try to fetch the video and create a thumbnail using a different approach
                                  const response = await fetch(editingReview.media_url, {
                                    method: 'HEAD',
                                    mode: 'cors'
                                  });
                                  
                                  if (response.ok) {
                                    toast({
                                      title: "Video Accessible",
                                      description: "Video is accessible. The issue might be browser CORS policy. Try using a different browser or check the video URL.",
                                      variant: "destructive",
                                    });
                                  } else {
                                    throw new Error(`Video not accessible: ${response.status}`);
                                  }
                                } catch (error) {
                                  console.error('Alternative method failed:', error);
                                  toast({
                                    title: "Video Access Issue",
                                    description: "Cannot access video. This might be due to CORS restrictions or the video URL being invalid.",
                                    variant: "destructive",
                                  });
                                } finally {
                                  setThumbnailUploading(false);
                                }
                              }}
                              disabled={thumbnailUploading}
                            >
                              <Video className="h-4 w-4 mr-1" />
                              Check Video Access
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sort_order">Sort Order</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      value={editingReview.sort_order || 0}
                      onChange={(e) => setEditingReview(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={editingReview.is_active || false}
                        onCheckedChange={(checked) => setEditingReview(prev => ({ ...prev, is_active: checked }))}
                      />
                      <Label htmlFor="is_active">Published</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSave} disabled={mediaUploading || thumbnailUploading}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
