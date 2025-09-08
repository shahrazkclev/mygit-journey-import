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
  Mail
} from "lucide-react";

interface Review {
  id: string;
  user_email: string;
  user_name: string;
  media_url: string;
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

  // Update review
  const updateReview = async (reviewId: string, updates: Partial<Review>) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update(updates)
        .eq('id', reviewId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Review updated successfully",
      });
      
      fetchReviews(activeTab === 'pending' ? false : activeTab === 'published' ? true : undefined);
      fetchStats();
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

  // Function to create sample reviews for testing
  const createSampleReviews = async () => {
    console.log('Creating sample reviews...');
    
    const sampleReviews = [
      {
        user_email: 'test1@example.com',
        user_name: 'John Doe',
        user_instagram_handle: '@johndoe',
        rating: 5,
        description: 'Amazing product! The quality exceeded my expectations. Fast delivery and great customer service.',
        user_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        media_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop',
        media_type: 'image',
        is_active: false, // Pending
        sort_order: 0
      },
      {
        user_email: 'test2@example.com',
        user_name: 'Jane Smith',
        user_instagram_handle: '@janesmith',
        rating: 4,
        description: 'Great product overall. Good quality and fast shipping. Would recommend to others.',
        user_avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
        media_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop',
        media_type: 'image',
        is_active: false, // Pending
        sort_order: 0
      },
      {
        user_email: 'test3@example.com',
        user_name: 'Mike Johnson',
        user_instagram_handle: '@mikejohnson',
        rating: 3,
        description: 'Decent product but could be better. Delivery was slow but quality is okay.',
        user_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
        media_url: 'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=400&h=300&fit=crop',
        media_type: 'image',
        is_active: true, // Published
        sort_order: 1
      }
    ];
    
    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert(sampleReviews)
        .select();
      
      if (error) {
        console.error('Error creating sample reviews:', error);
        toast({
          title: "Error",
          description: "Failed to create sample reviews",
          variant: "destructive",
        });
        return;
      }
      
      console.log('Successfully created sample reviews:', data);
      toast({
        title: "Success",
        description: "Sample reviews created successfully",
      });
      
      // Refresh the current view
      if (activeTab === 'pending') {
        fetchReviews(false);
      } else if (activeTab === 'published') {
        fetchReviews(true);
      } else if (activeTab === 'all') {
        fetchReviews();
      }
      fetchStats();
    } catch (error) {
      console.error('Error creating sample reviews:', error);
      toast({
        title: "Error",
        description: "Failed to create sample reviews",
        variant: "destructive",
      });
    }
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
  (window as any).createSampleReviews = createSampleReviews;
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
            <div className="flex gap-2">
              <Button onClick={copySubmissionLink} variant="outline" size="sm">
                <Link className="h-4 w-4 mr-2" />
                Copy Submission Link
              </Button>
              <Button onClick={createSampleReviews} variant="outline" size="sm" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                <RefreshCw className="h-4 w-4 mr-2" />
                Create Sample Reviews
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Navigation Tabs */}
          <div className="bg-card rounded-lg border p-1 shadow-sm">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full bg-transparent gap-1 h-auto">
              <TabsTrigger value="pending" className="flex items-center justify-center gap-1.5 text-xs md:text-sm px-2 md:px-3 py-2.5">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Pending</span>
                {stats.pending_count > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-xs">
                    {stats.pending_count}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger value="published" className="flex items-center justify-center gap-1.5 text-xs md:text-sm px-2 md:px-3 py-2.5">
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Published</span>
                {stats.approved_count > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-xs">
                    {stats.approved_count}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger value="analytics" className="flex items-center justify-center gap-1.5 text-xs md:text-sm px-2 md:px-3 py-2.5">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
              
              <TabsTrigger value="all" className="flex items-center justify-center gap-1.5 text-xs md:text-sm px-2 md:px-3 py-2.5">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">All Reviews</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Pending Reviews Tab */}
          <TabsContent value="pending">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Pending Reviews
                  </CardTitle>
                  <CardDescription>
                    Review and approve incoming submissions
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchReviews(false)} disabled={loading}>
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
      </div>
    </div>
  );
};