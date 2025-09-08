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
  Video
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
    maxFileSizeMB: 10,
    quality: 0.7
  });
  const [compressing, setMinimizeing] = useState(false);
  const [compressionProgress, setMinimizeionProgress] = useState(0);
  const [compressionStatus, setMinimizeionStatus] = useState('');

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

    setMinimizeing(true);
    setMinimizeionProgress(0);
    setMinimizeionStatus('Starting compression...');
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setMinimizeionProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 1000);

      // Update status messages
      const statusUpdates = [
        { progress: 10, message: 'Downloading original video...' },
        { progress: 30, message: 'Analyzing video properties...' },
        { progress: 50, message: 'Minimizeing video with FFmpeg...' },
        { progress: 80, message: 'Uploading optimized video...' },
        { progress: 95, message: 'Updating database...' }
      ];

      let statusIndex = 0;
      const statusInterval = setInterval(() => {
        if (statusIndex < statusUpdates.length) {
          setMinimizeionStatus(statusUpdates[statusIndex].message);
          statusIndex++;
        }
      }, 2000);

      const { data, error } = await supabase.functions.invoke('compress-video', {
        body: {
          reviewId: review.id,
          targetResolution: compressionSettings.targetResolution,
          maxFileSizeMB: compressionSettings.maxFileSizeMB,
          quality: compressionSettings.quality
        }
      });

      clearInterval(progressInterval);
      clearInterval(statusInterval);

      if (error) throw error;

      setMinimizeionProgress(100);
      setMinimizeionStatus('Minimizeion completed!');

      toast({
        title: data.wasCompressed ? "Video compressed successfully!" : "Video uploaded successfully!",
        description: data.message || (data.wasCompressed ? 
          `Minimizeed from ${Math.round(data.originalSize / 1024 / 1024)}MB to ${Math.round(data.compressedSize / 1024 / 1024)}MB (${data.compressionRatio}% reduction)` : 
          `Uploaded ${Math.round(data.originalSize / 1024 / 1024)}MB video to optimized storage`),
      });

      // Refresh reviews to show updated data
      await fetchReviews(activeTab === 'published' ? true : activeTab === 'pending' ? false : undefined);
      
    } catch (error: any) {
      console.error('Minimizeion error:', error);
      setMinimizeionStatus('Minimizeion failed');
      toast({
        title: "Minimizeion failed",
        description: error.message || "Failed to compress video. Please try again.",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setMinimizeing(false);
        setMinimizeionProgress(0);
        setMinimizeionStatus('');
        setMinimizeionDialogOpen(false);
      }, 2000);
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
      <div className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 
                className="text-2xl md:text-3xl font-bold text-gray-900"
                style={{ 
                  color: `hsl(${themeColors.primary})`,
                  background: `linear-gradient(135deg, hsl(${themeColors.primary}), hsl(${themeColors.accent}))`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Reviews Manager
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage customer reviews and submissions
              </p>
            </div>
            <Button 
              onClick={copySubmissionLink} 
              className="bg-white hover:bg-gray-50 px-4 py-2 rounded-lg font-medium"
              style={{
                borderColor: `hsl(${themeColors.primary})`,
                color: `hsl(${themeColors.primary})`,
                backgroundColor: 'white',
                border: '1px solid'
              }}
            >
              <Link className="h-4 w-4 mr-2" />
              Copy Submission Link
            </Button>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Navigation Tabs */}
          <div className="bg-card rounded-lg border p-1 shadow-sm">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full bg-transparent gap-1 h-auto">
              <div 
                className="rounded-md transition-all"
                style={{
                  border: activeTab === 'pending' ? '2px solid hsl(var(--primary))' : '2px solid #e5e7eb',
                  backgroundColor: activeTab === 'pending' ? 'hsl(var(--primary))' : 'transparent'
                }}
              >
                <TabsTrigger 
                  value="pending" 
                  className="flex items-center justify-center gap-1.5 text-xs md:text-sm px-2 md:px-3 py-2.5 rounded-md transition-all w-full h-full"
                  style={activeTab === 'pending' ? {
                    backgroundColor: 'transparent !important',
                    color: 'hsl(var(--primary-foreground)) !important'
                  } : {
                    backgroundColor: 'transparent !important'
                  }}
                >
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Pending</span>
                {stats.pending_count > 0 && (
                  <Badge 
                    className="ml-1 h-5 min-w-[20px] px-1 text-xs"
                    style={{
                      backgroundColor: activeTab === 'pending' ? 'rgba(255, 255, 255, 0.2)' : 'hsl(var(--primary))',
                      color: 'white'
                    }}
                  >
                    {stats.pending_count}
                  </Badge>
                )}
                </TabsTrigger>
              </div>
              
              <div 
                className="rounded-md transition-all"
                style={{
                  border: activeTab === 'published' ? '2px solid hsl(var(--primary))' : '2px solid #e5e7eb',
                  backgroundColor: activeTab === 'published' ? 'hsl(var(--primary))' : 'transparent'
                }}
              >
                <TabsTrigger 
                  value="published" 
                  className="flex items-center justify-center gap-1.5 text-xs md:text-sm px-2 md:px-3 py-2.5 rounded-md transition-all w-full h-full"
                  style={activeTab === 'published' ? {
                    backgroundColor: 'transparent !important',
                    color: 'hsl(var(--primary-foreground)) !important'
                  } : {
                    backgroundColor: 'transparent !important'
                  }}
                >
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Published</span>
                {stats.approved_count > 0 && (
                  <Badge 
                    className="ml-1 h-5 min-w-[20px] px-1 text-xs"
                    style={{
                      backgroundColor: activeTab === 'published' ? 'rgba(255, 255, 255, 0.2)' : 'hsl(var(--primary))',
                      color: 'white'
                    }}
                  >
                    {stats.approved_count}
                  </Badge>
                )}
                </TabsTrigger>
              </div>
              
              <div 
                className="rounded-md transition-all"
                style={{
                  border: activeTab === 'analytics' ? '2px solid hsl(var(--primary))' : '2px solid #e5e7eb',
                  backgroundColor: activeTab === 'analytics' ? 'hsl(var(--primary))' : 'transparent'
                }}
              >
                <TabsTrigger 
                  value="analytics" 
                  className="flex items-center justify-center gap-1.5 text-xs md:text-sm px-2 md:px-3 py-2.5 rounded-md transition-all w-full h-full"
                  style={activeTab === 'analytics' ? {
                    backgroundColor: 'transparent !important',
                    color: 'hsl(var(--primary-foreground)) !important'
                  } : {
                    backgroundColor: 'transparent !important'
                  }}
                >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
              </div>
              
              <div 
                className="rounded-md transition-all"
                style={{
                  border: activeTab === 'all' ? '2px solid hsl(var(--primary))' : '2px solid #e5e7eb',
                  backgroundColor: activeTab === 'all' ? 'hsl(var(--primary))' : 'transparent'
                }}
              >
                <TabsTrigger 
                  value="all" 
                  className="flex items-center justify-center gap-1.5 text-xs md:text-sm px-2 md:px-3 py-2.5 rounded-md transition-all w-full h-full"
                  style={activeTab === 'all' ? {
                    backgroundColor: 'transparent !important',
                    color: 'hsl(var(--primary-foreground)) !important'
                  } : {
                    backgroundColor: 'transparent !important'
                  }}
                >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">All Reviews</span>
                </TabsTrigger>
              </div>
            </TabsList>
          </div>

          {/* Pending Reviews Tab */}
          <TabsContent value="pending">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
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
                                  <div className="flex items-center gap-2 text-xs text-green-600">
                                    <Check className="h-3 w-3" />
                                    Optimized version active
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
            <Card>
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
                                  <div className="flex items-center gap-2 text-xs text-green-600">
                                    <Check className="h-3 w-3" />
                                    Optimized version active
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
            <Card>
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
                                  <div className="flex items-center gap-2 text-xs text-green-600">
                                    <Check className="h-3 w-3" />
                                    Optimized version active
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
            
            <div className="space-y-4">
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
                    <SelectItem value="854x480">480p (854x480)</SelectItem>
                    <SelectItem value="1280x720">720p (1280x720)</SelectItem>
                    <SelectItem value="1920x1080">1080p (1920x1080)</SelectItem>
                    <SelectItem value="2560x1440">1440p (2560x1440)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                <Input
                  id="maxFileSize"
                  type="number"
                  min="1"
                  max="50"
                  value={compressionSettings.maxFileSizeMB}
                  onChange={(e) => setMinimizeionSettings(prev => ({ ...prev, maxFileSizeMB: parseInt(e.target.value) || 10 }))}
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
                <h4 className="font-medium text-blue-900 mb-2">Minimizeion Preview</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <div>Resolution: {compressionSettings.targetResolution}</div>
                  <div>Max size: {compressionSettings.maxFileSizeMB}MB</div>
                  <div>Quality: {Math.round(compressionSettings.quality * 100)}%</div>
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
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};