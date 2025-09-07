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
  TrendingUp
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

interface ReviewStats {
  total_submissions: number;
  pending_count: number;
  approved_count: number;
  average_rating: number;
  total_published: number;
}

export const ReviewsManager = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    total_submissions: 0,
    pending_count: 0,
    approved_count: 0,
    average_rating: 0,
    total_published: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Partial<Review>>({});
  const { toast } = useToast();

  // Fetch reviews using direct query approach to bypass types
  const fetchReviews = async (filterActive?: boolean) => {
    setLoading(true);
    try {
      const SUPABASE_URL = "https://mixifcnokcmxarpzwfiy.supabase.co";
      const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peGlmY25va2NteGFycHp3Zml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NjYwNTEsImV4cCI6MjA2OTA0MjA1MX0.-4uIuzcHcDGS20-dtKbjVFOtpBSmwYhT9Bgt6KA-dXI";
      
      let url = `${SUPABASE_URL}/rest/v1/reviews?select=*&order=sort_order.desc`;
      
      if (filterActive !== undefined) {
        url += `&is_active=eq.${filterActive}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch reviews');
      const data = await response.json();
      setReviews(data || []);
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
      const SUPABASE_URL = "https://mixifcnokcmxarpzwfiy.supabase.co";
      const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peGlmY25va2NteGFycHp3Zml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NjYwNTEsImV4cCI6MjA2OTA0MjA1MX0.-4uIuzcHcDGS20-dtKbjVFOtpBSmwYhT9Bgt6KA-dXI";
      
      const url = `${SUPABASE_URL}/rest/v1/reviews?id=eq.${reviewId}`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update review');
      
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

  useEffect(() => {
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
            <Button onClick={copySubmissionLink} variant="outline" size="sm">
              <Link className="h-4 w-4 mr-2" />
              Copy Submission Link
            </Button>
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
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <img 
                              src={review.user_avatar} 
                              alt="User avatar"
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div>
                              <div className="font-medium">{review.user_name}</div>
                              <div className="text-sm text-muted-foreground">@{review.user_instagram_handle}</div>
                              <div className="text-xs text-muted-foreground">{review.user_email}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(review.created_at)}
                              </div>
                            </div>
                          </div>
                          <Badge variant={review.is_active ? "default" : "secondary"}>
                            {review.is_active ? "Published" : "Pending"}
                          </Badge>
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
                            <img 
                              src={review.user_avatar} 
                              alt="User avatar"
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div>
                              <div className="font-medium">{review.user_name}</div>
                              <div className="text-sm text-muted-foreground">@{review.user_instagram_handle}</div>
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
                            <img 
                              src={review.user_avatar} 
                              alt="User avatar"
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div>
                              <div className="font-medium">{review.user_name}</div>
                              <div className="text-sm text-muted-foreground">@{review.user_instagram_handle}</div>
                              <div className="text-xs text-muted-foreground">{review.user_email}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(review.created_at)}
                              </div>
                            </div>
                          </div>
                          <Badge variant={review.is_active ? "default" : "secondary"}>
                            {review.is_active ? "Published" : "Pending"}
                          </Badge>
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