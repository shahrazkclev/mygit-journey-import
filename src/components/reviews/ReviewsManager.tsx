import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Star, Settings, FileText, Clock, Users, Shield, Eye, Check, X, Trash2, Edit, RefreshCw } from "lucide-react";

interface Review {
  id: string;
  user_email: string;
  media_url: string;
  media_type: string;
  rating: number;
  description: string;
  user_avatar: string;
  user_instagram_handle: string;
  status: string;
  is_active: boolean;
  submitted_at: string;
  reviewed_at?: string;
  admin_notes?: string;
}

interface ReviewStats {
  total_submissions: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  average_rating: number;
  total_published: number;
}

interface ReviewSettings {
  link_expiry_hours: number;
  max_submissions_per_email: number;
  auto_approve: boolean;
  require_media: boolean;
  require_instagram: boolean;
}

export const ReviewsManager = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    total_submissions: 0,
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    average_rating: 0,
    total_published: 0
  });
  const [settings, setSettings] = useState<ReviewSettings>({
    link_expiry_hours: 24,
    max_submissions_per_email: 1,
    auto_approve: false,
    require_media: true,
    require_instagram: true
  });
  const [loading, setLoading] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const { toast } = useToast();

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

  // Fetch reviews based on active tab
  const fetchReviews = async (status?: string) => {
    setLoading(true);
    try {
      const statusParam = status ? `?status=${status}` : '';
      const response = await fetch(`${API_BASE}/reviews${statusParam}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      const data = await response.json();
      setReviews(data);
    } catch (error) {
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
      const response = await fetch(`${API_BASE}/reviews/stats/overview`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Fetch settings
  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/reviews/settings`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  // Update review status
  const updateReview = async (reviewId: string, updates: Partial<Review>) => {
    try {
      const response = await fetch(`${API_BASE}/reviews/${reviewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update review');
      
      toast({
        title: "Success",
        description: "Review updated successfully",
      });
      
      fetchReviews(activeTab === 'pending' ? 'pending' : activeTab === 'published' ? 'approved' : undefined);
      fetchStats();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update review",
        variant: "destructive",
      });
    }
  };

  // Delete review
  const deleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to permanently delete this review?')) return;
    
    try {
      const response = await fetch(`${API_BASE}/reviews/${reviewId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete review');
      
      toast({
        title: "Success",
        description: "Review deleted successfully",
      });
      
      fetchReviews(activeTab === 'pending' ? 'pending' : activeTab === 'published' ? 'approved' : undefined);
      fetchStats();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive",
      });
    }
  };

  // Save settings
  const saveSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/reviews/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!response.ok) throw new Error('Failed to save settings');
      
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
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

  useEffect(() => {
    fetchStats();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchReviews('pending');
    } else if (activeTab === 'published') {
      fetchReviews('approved');
    } else if (activeTab === 'analytics') {
      fetchStats();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

export const ReviewsManager = () => {
  const [activeTab, setActiveTab] = useState("pending");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center space-y-1">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
              Reviews Manager
            </h1>
            <p className="text-xs md:text-sm lg:text-base text-muted-foreground">
              Manage customer reviews and submission settings
            </p>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto p-4 md:p-6">
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
              </TabsTrigger>
              
              <TabsTrigger 
                value="published" 
                className="flex items-center justify-center gap-1.5 text-xs md:text-sm px-2 md:px-3 py-2.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Published</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="analytics" 
                className="flex items-center justify-center gap-1.5 text-xs md:text-sm px-2 md:px-3 py-2.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
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

          {/* Tab Contents */}
          <TabsContent value="pending" className="space-y-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pending Review Requests
                </CardTitle>
                <CardDescription>
                  Review and manage incoming review submissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pending reviews</h3>
                  <p className="text-muted-foreground mb-4">
                    Review submissions will appear here for your approval
                  </p>
                  <Button variant="outline">
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="published" className="space-y-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Published Reviews
                </CardTitle>
                <CardDescription>
                  Manage your approved and published reviews
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No published reviews</h3>
                  <p className="text-muted-foreground">
                    Approved reviews will be displayed here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Review Analytics
                </CardTitle>
                <CardDescription>
                  Track review submissions and engagement metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-sm text-muted-foreground">Total Submissions</div>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-sm text-muted-foreground">Published Reviews</div>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold">0.0</div>
                    <div className="text-sm text-muted-foreground">Average Rating</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Review Submission Settings
                </CardTitle>
                <CardDescription>
                  Configure review submission rules and limitations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Submission Link Management</h4>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Review submission URL:</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-background px-2 py-1 rounded text-sm flex-1">
                        {window.location.origin}/submitreview
                      </code>
                      <Button variant="outline" size="sm">
                        Copy Link
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Link Expiry (hours)</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 border rounded-md" 
                      placeholder="24" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max submissions per email</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 border rounded-md" 
                      placeholder="1" 
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button>Save Settings</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};