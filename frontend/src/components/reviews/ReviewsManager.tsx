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
import { useGlobalTheme } from "@/hooks/useGlobalTheme";
import { supabase } from "@/integrations/supabase/client";
import { VideoCompressor } from './VideoCompressor';
import { StyleGuide } from "@/components/email/StyleGuide";
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
  Minimize,
  Video,
  Palette,
  RotateCcw
} from "lucide-react";

interface Review {
  id: string;
  user_email: string;
  user_name: string;
  media_url: string;
  media_url_optimized?: string;
  media_type: string;
  rating: number;
  description: string;
  user_avatar: string;
  user_instagram_handle: string;
  is_active: boolean;
  sort_order: number;
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
  const [activeTab, setActiveTab] = useState("pending");
  const [settingsSubTab, setSettingsSubTab] = useState("style");
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
  const [addCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    tags: [] as string[]
  });
  const { toast } = useToast();
  const { themeColors } = useGlobalTheme();
  const [compressionDialogOpen, setMinimizeionDialogOpen] = useState(false);
  const [selectedVideoReview, setSelectedVideoReview] = useState<ReviewWithCustomer | null>(null);
  const [compressionSettings, setMinimizeionSettings] = useState({
    targetResolution: '1280x720',
    maxFileSizeMB: 1,
    quality: 0.3,
    compressionPreset: 'aggressive'
  });
  const [compressing, setMinimizeing] = useState(false);
  const [compressionProgress, setMinimizeionProgress] = useState(0);
  const [compressionStatus, setMinimizeionStatus] = useState('');
  const [showVideoCompressor, setShowVideoCompressor] = useState(false);

  // Demo user ID for contacts
  const DEMO_USER_ID = "550e8400-e29b-41d4-a716-446655440000";

  // Fetch customers for cross-reference
  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, email, first_name, last_name, status, tags, created_at, updated_at')
        .eq('user_id', DEMO_USER_ID)
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
        console.error('Supabase fetch error:', error);
        throw error;
      }
      
      console.log('Fetched reviews data:', data);
      
      // Cross-reference with customers
      const reviewsWithCustomers: ReviewWithCustomer[] = (data || []).map((review: Review) => {
        const customer = customers.find(c => c.email.toLowerCase() === review.user_email?.toLowerCase());
        return {
          ...review,
          customer,
          isExistingCustomer: !!customer
        };
      });
      
      console.log('Reviews with customers:', reviewsWithCustomers);
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
      const SUPABASE_URL = "https://mixifcnokcmxarpzwfiy.supabase.co";
      const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peGlmY25va2NteGFycHp3Zml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NjYwNTEsImV4cCI6MjA2OTA0MjA1MX0.-4uIuzcHcDGS20-dtKbjVFOtpBSmwYhT9Bgt6KA-dXI";
      
      const url = `${SUPABASE_URL}/rest/v1/reviews?select=*`;
      
      const response = await fetch(url, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch reviews');
      const allReviews = await response.json();
      
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

  // Update review
  const updateReview = async (reviewId: string, updates: Partial<Review>) => {
    try {
      console.log('Updating review:', reviewId, 'with updates:', updates);
      
      const { error } = await supabase
        .from('reviews')
        .update(updates)
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
      
      // Refresh the current view
      if (activeTab === 'pending') {
        await fetchReviews(false);
      } else if (activeTab === 'published') {
        await fetchReviews(true);
      } else if (activeTab === 'all') {
        await fetchReviews();
      }
      
      await fetchStats();
    } catch (error) {
      console.error('Error updating review:', error);
      toast({
        title: "Error",
        description: "Failed to update review",
        variant: "destructive",
      });
    }
  };

  // Delete review and associated media
  const deleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this review and its media?')) return;
    
    try {
      // First, get the review to find the media file
      const SUPABASE_URL = "https://mixifcnokcmxarpzwfiy.supabase.co";
      const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peGlmY25va2NteGFycHp3Zml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NjYwNTEsImV4cCI6MjA2OTA0MjA1MX0.-4uIuzcHcDGS20-dtKbjVFOtpBSmwYhT9Bgt6KA-dXI";
      
      const getUrl = `${SUPABASE_URL}/rest/v1/reviews?select=media_url&id=eq.${reviewId}`;
      
      const getResponse = await fetch(getUrl, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!getResponse.ok) throw new Error('Failed to fetch review');
      const reviews = await getResponse.json();
      const review = reviews[0];

      // Extract file path from URL for storage deletion
      if (review?.media_url) {
        const urlParts = review.media_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('reviews')
          .remove([fileName]);
        
        if (storageError) console.warn('Failed to delete media file:', storageError);
      }

      // Delete the review record
      const deleteUrl = `${SUPABASE_URL}/rest/v1/reviews?id=eq.${reviewId}`;
      
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!deleteResponse.ok) throw new Error('Failed to delete review');
      
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
    const link = `${window.location.origin}/submitreview`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied!",
      description: "Submission link copied to clipboard",
    });
  };

  // Handle edit form
  const handleEditSave = async () => {
    if (!selectedReview || !editingReview) return;
    
    await updateReview(selectedReview.id, editingReview);
    setEditDialogOpen(false);
    setSelectedReview(null);
    setEditingReview({});
  };

  // Add new customer from review
  const addCustomerFromReview = async (review: ReviewWithCustomer) => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          user_id: DEMO_USER_ID,
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

  // Minimize video
  const compressVideo = async (review: ReviewWithCustomer) => {
    if (!review.media_url || review.media_type !== 'video') {
      toast({
        title: "No video to compress",
        description: "This review doesn't have a video to compress.",
        variant: "destructive"
      });
      return;
    }

    setSelectedVideoReview(review);
    setShowVideoCompressor(true);
  };

  // Handle compressed video from client-side compression
  const handleCompressedVideo = async (compressedBlob: Blob, originalSize: number, compressedSize: number) => {
    if (!selectedVideoReview) return;

    console.log('handleCompressedVideo called with:', {
      blobSize: compressedBlob.size,
      blobType: compressedBlob.type,
      originalSize,
      compressedSize,
      selectedReview: selectedVideoReview.id
    });

    if (compressedBlob.size === 0) {
      console.error('Compressed blob is empty!');
      throw new Error('Compressed video is empty');
    }

    try {
      setMinimizeing(true);
      setMinimizeionProgress(95);
      setMinimizeionStatus('Uploading compressed video...');

      // Upload compressed video directly to R2 via Cloudflare Worker
      console.log(`Uploading compressed video, size: ${compressedBlob.size} bytes`);
      console.log('Compressed blob type:', compressedBlob.type);
      console.log('Compressed blob:', compressedBlob);
      
      const formData = new FormData();
      formData.append('file', compressedBlob, 'compressed-video.webm');
      formData.append('isOptimized', 'true');
      
      console.log('FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }
      
      const workerUrl = 'https://r2-upload-proxy.cleverpoly-store.workers.dev';
      console.log('Uploading to Cloudflare Worker:', workerUrl);
      
      const response = await fetch(workerUrl, {
        method: 'POST',
        body: formData,
      });

      console.log('Upload response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(`R2 upload failed: ${response.status} ${errorData.error || 'Unknown error'}`);
      }

      const uploadData = await response.json();
      console.log('Upload response data:', uploadData);

      console.log(`Upload successful: ${uploadData.url}`);
      
      const uploadResult = {
        url: uploadData.url,
        fileName: uploadData.fileName || `compressed-${Date.now()}.webm`,
        isOptimized: true
      };
      
      // Update review with optimized URL
      const { error } = await supabase
        .from('reviews')
        .update({ 
          media_url_optimized: uploadResult.url,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedVideoReview.id);

      if (error) throw error;

      setMinimizeionProgress(100);
      setMinimizeionStatus('Compression completed!');

      const compressionRatio = Math.round((1 - compressedSize / originalSize) * 100);

      toast({
        title: "Video compressed successfully!",
        description: `Compressed from ${Math.round(originalSize / 1024 / 1024)}MB to ${Math.round(compressedSize / 1024 / 1024)}MB (${compressionRatio}% reduction)`,
      });

      // Refresh reviews to show updated data
      await fetchReviews(activeTab === 'published' ? true : activeTab === 'pending' ? false : undefined);
      
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload compressed video. Please try again.",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setMinimizeing(false);
        setMinimizeionProgress(0);
        setMinimizeionStatus('');
        setMinimizeionDialogOpen(false);
        setShowVideoCompressor(false);
        setSelectedVideoReview(null);
      }, 2000);
    }
  };

  // Reload original video (remove optimized version)
  const reloadOriginalVideo = async (review: ReviewWithCustomer) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ 
          media_url_optimized: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', review.id);

      if (error) throw error;

      toast({
        title: "Original video restored",
        description: "The original video is now being used instead of the optimized version.",
      });

      // Refresh reviews to show updated data
      await fetchReviews(activeTab === 'published' ? true : activeTab === 'pending' ? false : undefined);
      
    } catch (error: any) {
      console.error('Error reloading original video:', error);
      toast({
        title: "Failed to restore original video",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchStats();
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
  }, [activeTab, customers]); // Add customers as dependency

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Debug function to test pending reviews
  const testPendingReviews = async () => {
    console.log('Testing pending reviews...');
    console.log('Current activeTab:', activeTab);
    console.log('Current customers:', customers);
    await fetchReviews(false);
    console.log('Current reviews after fetch:', reviews);
  };

  // Make test function available globally for debugging
  (window as any).testPendingReviews = testPendingReviews;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
                Reviews Manager
              </h1>
              <p className="text-xs md:text-sm lg:text-base text-muted-foreground">
                Manage customer reviews and submissions
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Navigation Tabs */}
          <div className="bg-card rounded-lg border p-1 shadow-sm">
            <TabsList className="grid grid-cols-5 w-full bg-transparent gap-1 h-auto">
              <TabsTrigger
                value="pending" 
                className="flex items-center justify-center gap-1.5 text-xs md:text-sm px-2 md:px-3 py-2.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Pending</span>
                {stats.pending_count > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-xs flex items-center justify-center rounded-full">
                    {stats.pending_count}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger 
                value="published" 
                className="flex items-center justify-center gap-1.5 text-xs md:text-sm px-2 md:px-3 py-2.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Published</span>
                {stats.approved_count > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-xs flex items-center justify-center rounded-full">
                    {stats.approved_count}
                  </Badge>
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
              
              <TabsTrigger 
                value="settings" 
                className="flex items-center justify-center gap-1.5 text-xs md:text-sm px-2 md:px-3 py-2.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Pending Reviews Tab */}
          <TabsContent value="pending">
            <div className="shadow-soft bg-gradient-to-br from-email-background to-background border-email-primary/20 rounded-lg border">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Clock className="h-5 w-5" style={{ color: `hsl(${themeColors.primary})` }} />
                      Pending Reviews
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Review and approve incoming submissions
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fetchReviews(false)} 
                    disabled={loading}
                    style={{
                      backgroundColor: 'white',
                      borderColor: `hsl(${themeColors.primary})`,
                      color: `hsl(${themeColors.primary})`
                    }}
                    className="hover:bg-gray-50"
                  >
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Refresh
                  </Button>
                </div>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-8 w-8 mx-auto animate-spin text-gray-400 mb-4" />
                    <p className="text-gray-600">Loading reviews...</p>
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No pending reviews</h3>
                    <p className="text-gray-600">New submissions will appear here for approval</p>
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
                        
                        {review.media_url && (
                          <div className="mt-2">
                            {review.media_type === 'video' ? (
                              <div className="space-y-2">
                                <video 
                                  src={review.media_url_optimized || review.media_url} 
                                  className="max-w-xs rounded-lg"
                                  controls
                                  muted
                                />
                                {review.media_url_optimized && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-green-600">
                                      <Check className="h-3 w-3" />
                                      Optimized version active
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Using compressed version for better performance
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => reloadOriginalVideo(review)}
                                      className="text-xs bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                                    >
                                      <RotateCcw className="h-3 w-3 mr-1" />
                                      Reload Original
                                    </Button>
                                  </div>
                                )}
                                {!review.media_url_optimized && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedVideoReview(review);
                                      setMinimizeionDialogOpen(true);
                                    }}
                                    className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                  >
                                    <Minimize className="h-3 w-3 mr-1" />
                                    Minimize Video
                                  </Button>
                                )}
                              </div>
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
              </div>
            </div>
          </TabsContent>

          {/* Published Reviews Tab */}
          <TabsContent value="published">
            <Card className="shadow-soft bg-gradient-to-br from-email-background to-background border-email-primary/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Published Reviews
                  </CardTitle>
                  <CardDescription>
                    Manage approved and published reviews
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchReviews(true)} disabled={loading}>
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
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
                        
                        {review.media_url && (
                          <div className="mt-2">
                            {review.media_type === 'video' ? (
                              <div className="space-y-2">
                                <video 
                                  src={review.media_url_optimized || review.media_url} 
                                  className="max-w-xs rounded-lg"
                                  controls
                                  muted
                                />
                                {review.media_url_optimized && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-green-600">
                                      <Check className="h-3 w-3" />
                                      Optimized version active
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Using compressed version for better performance
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => reloadOriginalVideo(review)}
                                      className="text-xs bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                                    >
                                      <RotateCcw className="h-3 w-3 mr-1" />
                                      Reload Original
                                    </Button>
                                  </div>
                                )}
                                {!review.media_url_optimized && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedVideoReview(review);
                                      setMinimizeionDialogOpen(true);
                                    }}
                                    className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                  >
                                    <Minimize className="h-3 w-3 mr-1" />
                                    Minimize Video
                                  </Button>
                                )}
                              </div>
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
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_submissions}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pending_count}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Published Reviews</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.approved_count}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.average_rating}/5</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* All Reviews Tab */}
          <TabsContent value="all">
            <Card className="shadow-soft bg-gradient-to-br from-email-background to-background border-email-primary/20">
              <CardHeader>
                <CardTitle>All Reviews</CardTitle>
                <CardDescription>Complete overview of all review submissions</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Same structure as pending/published but showing all reviews */}
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
                        
                        {review.media_url && (
                          <div className="mt-2">
                            {review.media_type === 'video' ? (
                              <div className="space-y-2">
                                <video 
                                  src={review.media_url_optimized || review.media_url} 
                                  className="max-w-xs rounded-lg"
                                  controls
                                  muted
                                />
                                {review.media_url_optimized && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-green-600">
                                      <Check className="h-3 w-3" />
                                      Optimized version active
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Using compressed version for better performance
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => reloadOriginalVideo(review)}
                                      className="text-xs bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                                    >
                                      <RotateCcw className="h-3 w-3 mr-1" />
                                      Reload Original
                                    </Button>
                                  </div>
                                )}
                                {!review.media_url_optimized && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedVideoReview(review);
                                      setMinimizeionDialogOpen(true);
                                    }}
                                    className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                  >
                                    <Minimize className="h-3 w-3 mr-1" />
                                    Minimize Video
                                  </Button>
                                )}
                              </div>
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

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-0">
            <div className="shadow-soft bg-gradient-to-br from-email-background to-background border-email-primary/20 rounded-lg border">
              {/* Settings Sub-Navigation */}
              <div className="border-b px-6 py-4">
                <div className="flex items-center gap-4">
                  <Settings className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Settings</h2>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant={settingsSubTab === "style" ? "default" : "outline"}
                    onClick={() => setSettingsSubTab("style")}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Palette className="h-4 w-4" />
                    Style & Branding
                  </Button>
                </div>
              </div>
              
              {/* Settings Content */}
              <div className="p-6">
                {settingsSubTab === "style" && <StyleGuide />}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Review Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Review</DialogTitle>
              <DialogDescription>
                Make changes to the review details
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
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
              
              <div>
                <Label htmlFor="rating">Rating</Label>
                <Select 
                  value={editingReview.rating?.toString() || '5'} 
                  onValueChange={(value) => setEditingReview(prev => ({ ...prev, rating: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map(num => (
                      <SelectItem key={num} value={num.toString()}>{num} Star{num > 1 ? 's' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="description">Review Text</Label>
                <Textarea
                  id="description"
                  value={editingReview.description || ''}
                  onChange={(e) => setEditingReview(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={editingReview.sort_order || 0}
                  onChange={(e) => setEditingReview(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={editingReview.is_active || false}
                  onCheckedChange={(checked) => setEditingReview(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Published</Label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSave}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Video Minimizeion Dialog */}
        <Dialog open={compressionDialogOpen} onOpenChange={setMinimizeionDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Minimize Video
              </DialogTitle>
              <DialogDescription>
                Optimize video for better performance and smaller file size
              </DialogDescription>
            </DialogHeader>
            
            {showVideoCompressor && selectedVideoReview ? (
              <VideoCompressor
                videoUrl={selectedVideoReview.media_url}
                onCompressed={handleCompressedVideo}
                onCancel={() => {
                  setShowVideoCompressor(false);
                  setMinimizeionDialogOpen(false);
                }}
                targetResolution={compressionSettings.targetResolution}
                maxFileSizeMB={compressionSettings.maxFileSizeMB}
                quality={compressionSettings.quality}
                compressionPreset={compressionSettings.compressionPreset}
              />
            ) : (
              <>
                <div className="space-y-4">
              <div>
                <Label htmlFor="compressionPreset">Compression Preset</Label>
                <select 
                  id="compressionPreset"
                  value={compressionSettings.compressionPreset} 
                  onChange={(e) => {
                    console.log('Preset changed to:', e.target.value);
                    setMinimizeionSettings(prev => ({ ...prev, compressionPreset: e.target.value }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ultra">Ultra (Max compression)</option>
                  <option value="aggressive">Aggressive (High compression)</option>
                  <option value="balanced">Balanced (Medium compression)</option>
                  <option value="light">Light (Minimal compression)</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="targetResolution">Target Resolution</Label>
                <Select 
                  value={compressionSettings.targetResolution} 
                  onValueChange={(value) => setMinimizeionSettings(prev => ({ ...prev, targetResolution: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="640x360">360p (640x360)</SelectItem>
                    <SelectItem value="854x480">480p (854x480)</SelectItem>
                    <SelectItem value="1280x720">720p (1280x720)</SelectItem>
                    <SelectItem value="1920x1080">1080p (1920x1080)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                <Input
                  id="maxFileSize"
                  type="number"
                  min="0.1"
                  max="50"
                  step="0.1"
                  value={compressionSettings.maxFileSizeMB}
                  onChange={(e) => setMinimizeionSettings(prev => ({ ...prev, maxFileSizeMB: parseFloat(e.target.value) || 10 }))}
                />
              </div>
              
              <div>
                <Label htmlFor="quality">Quality: {Math.round(compressionSettings.quality * 100)}%</Label>
                <input
                  id="quality"
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={compressionSettings.quality}
                  onChange={(e) => setMinimizeionSettings(prev => ({ ...prev, quality: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Smaller file</span>
                  <span>Better quality</span>
                </div>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Compression Preview</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <div>Preset: <span className="font-semibold">{compressionSettings.compressionPreset}</span></div>
                  <div>Resolution: {compressionSettings.targetResolution}</div>
                  <div>Max size: {compressionSettings.maxFileSizeMB}MB</div>
                  <div>Quality: {Math.round(compressionSettings.quality * 100)}%</div>
                </div>
                <div className="text-xs text-blue-600 mt-2">
                  Current preset value: "{compressionSettings.compressionPreset}"
                </div>
                <div className="mt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      console.log('Current compression settings:', compressionSettings);
                      setMinimizeionSettings(prev => ({ ...prev, compressionPreset: 'ultra' }));
                    }}
                  >
                    Test: Set to Ultra
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              {compressing && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Minimizeing Video...</span>
                    <span className="text-muted-foreground">{Math.round(compressionProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${compressionProgress}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-muted-foreground text-center">
                    {compressionStatus}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setMinimizeionDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => selectedVideoReview && compressVideo(selectedVideoReview)}
                disabled={compressing}
              >
                {compressing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Minimizeing...
                  </>
                ) : (
                  <>
                    <Minimize className="h-4 w-4 mr-2" />
                    Minimize Video
                  </>
                )}
              </Button>
            </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};