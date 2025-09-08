import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Mail, 
  Users, 
  Plus, 
  Eye, 
  Download, 
  Save, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  Zap,
  Filter,
  Search,
  RefreshCw,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_USER_ID } from '@/lib/demo-auth';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  sent_at: string | null;
  created_at: string;
  html_content: string;
  list_ids: string[];
  current_sender_sequence?: number;
  current_recipient?: string;
}

interface CampaignSend {
  id: string;
  campaign_id: string;
  contact_email: string;
  status: string;
  sent_at: string | null;
  error_message: string | null;
}

export const CampaignHistory: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignSends, setCampaignSends] = useState<CampaignSend[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCampaignDetails, setShowCampaignDetails] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  
  // Bulk selection state
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalSent: 0,
    successRate: 0
  });

  useEffect(() => {
    loadCampaigns();
    const interval = setInterval(loadCampaigns, 5000); // Auto-refresh every 5 seconds for real-time updates
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    calculateStats();
  }, [campaigns]);

  const calculateStats = () => {
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'sending' || c.status === 'paused').length;
    const totalSent = campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);
    const totalRecipients = campaigns.reduce((sum, c) => sum + (c.total_recipients || 0), 0);
    const successRate = totalRecipients > 0 ? (totalSent / totalRecipients) * 100 : 0;

    setStats({
      totalCampaigns,
      activeCampaigns,
      totalSent,
      successRate
    });
  };

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map database fields to expected Campaign interface
      const mappedCampaigns = (data || []).map(campaign => ({
        ...campaign,
        failed_count: 0 // Add missing field with default value
      }));
      
      setCampaigns(mappedCampaigns);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load campaigns');
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('user_id', DEMO_USER_ID);

      if (error) {
        console.error('Error deleting campaign:', error);
        toast.error('Failed to delete campaign');
        return;
      }

      toast.success('Campaign deleted successfully');
      loadCampaigns();
      setCampaignToDelete(null);
      
      // Close any open campaign details modal if the deleted campaign was being viewed
      if (selectedCampaign?.id === campaignId) {
        setSelectedCampaign(null);
        setShowCampaignDetails(false);
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign');
    }
  };

  const bulkDeleteCampaigns = async () => {
    if (selectedCampaigns.size === 0) return;
    
    setIsDeleting(true);
    try {
      const campaignIds = Array.from(selectedCampaigns);
      
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .in('id', campaignIds)
        .eq('user_id', DEMO_USER_ID);

      if (error) {
        console.error('Error deleting campaigns:', error);
        toast.error('Failed to delete campaigns');
        return;
      }

      toast.success(`Successfully deleted ${campaignIds.length} campaign(s)`);
      setSelectedCampaigns(new Set());
      setIsSelectionMode(false);
      loadCampaigns();
    } catch (error) {
      console.error('Error deleting campaigns:', error);
      toast.error('Failed to delete campaigns');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleCampaignSelection = (campaignId: string) => {
    const newSelection = new Set(selectedCampaigns);
    if (newSelection.has(campaignId)) {
      newSelection.delete(campaignId);
    } else {
      newSelection.add(campaignId);
    }
    setSelectedCampaigns(newSelection);
  };

  const selectAllCampaigns = () => {
    const allIds = new Set(filteredCampaigns.map(c => c.id));
    setSelectedCampaigns(allIds);
  };

  const clearSelection = () => {
    setSelectedCampaigns(new Set());
    setIsSelectionMode(false);
  };

  const loadCampaignSends = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('campaign_sends')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaignSends(data || []);
    } catch (error) {
      console.error('Error loading campaign sends:', error);
      toast.error('Failed to load campaign send details');
    }
  };

  const openCampaignDetails = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    loadCampaignSends(campaign.id);
    setShowCampaignDetails(true);
  };

  const createListFromCampaign = async () => {
    if (!selectedCampaign || !newListName.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    try {
      // Create the email list
      const { data: listData, error: listError } = await supabase
        .from('email_lists')
        .insert([{
          user_id: DEMO_USER_ID,
          name: newListName.trim(),
          description: newListDescription.trim() || `Created from campaign: ${selectedCampaign.name}`
        }])
        .select()
        .single();

      if (listError) throw listError;

      // Get successful sends from campaign
      const successfulSends = campaignSends.filter(send => send.status === 'sent');
      
      if (successfulSends.length === 0) {
        toast.error('No successful sends found in this campaign');
        return;
      }

      // Get contact IDs for successful sends
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id')
        .in('email', successfulSends.map(send => send.contact_email))
        .eq('user_id', DEMO_USER_ID);

      if (contactsError) throw contactsError;

      // Add contacts to the new list
      const contactListEntries = contacts.map(contact => ({
        contact_id: contact.id,
        list_id: listData.id
      }));

      const { error: insertError } = await supabase
        .from('contact_lists')
        .insert(contactListEntries);

      if (insertError) throw insertError;

      toast.success(`Created list "${newListName}" with ${contacts.length} contacts`);
      setShowCreateList(false);
      setNewListName('');
      setNewListDescription('');
    } catch (error) {
      console.error('Error creating list from campaign:', error);
      toast.error('Failed to create list from campaign');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'default';
      case 'draft': return 'secondary';
      case 'sending': return 'destructive';
      case 'paused': return 'outline';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sending': return <Zap className="h-3 w-3" />;
      case 'paused': return <Pause className="h-3 w-3" />;
      case 'sent': return <CheckCircle className="h-3 w-3" />;
      case 'failed': return <XCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const downloadCampaignData = (campaign: Campaign) => {
    const csvContent = [
      ['Email', 'Status', 'Sent At', 'Error'].join(','),
      ...campaignSends.map(send => [
        send.contact_email,
        send.status,
        send.sent_at || '',
        send.error_message || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${campaign.name}-data.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getProgress = (campaign: Campaign) => {
    if (!campaign.total_recipients || campaign.total_recipients === 0) return 0;
    return (campaign.sent_count / campaign.total_recipients) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-email-primary flex items-center">
            <BarChart3 className="h-6 w-6 lg:h-7 lg:w-7 mr-3" />
            Campaign Dashboard
          </h2>
          <p className="text-sm lg:text-base text-muted-foreground mt-1">
            Monitor and manage all your email campaigns
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              setIsRefreshing(true);
              loadCampaigns();
            }} 
            disabled={isRefreshing}
            variant="outline"
            className="w-full lg:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            onClick={() => setIsSelectionMode(!isSelectionMode)}
            variant={isSelectionMode ? "default" : "outline"}
            className="w-full lg:w-auto"
          >
            {isSelectionMode ? 'Exit Select' : 'Select Multiple'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-email-primary/10 to-email-primary/5 border-email-primary/20">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground">Total Campaigns</p>
                <p className="text-xl lg:text-2xl font-bold text-email-primary">{stats.totalCampaigns}</p>
              </div>
              <Mail className="h-6 w-6 lg:h-8 lg:w-8 text-email-primary/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-email-accent/10 to-email-accent/5 border-email-accent/20">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground">Active Campaigns</p>
                <p className="text-xl lg:text-2xl font-bold text-email-accent">{stats.activeCampaigns}</p>
              </div>
              <Zap className="h-6 w-6 lg:h-8 lg:w-8 text-email-accent/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-100 to-green-50 border-green-200">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground">Total Sent</p>
                <p className="text-xl lg:text-2xl font-bold text-green-600">{stats.totalSent.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-6 w-6 lg:h-8 lg:w-8 text-green-600/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-email-secondary/10 to-email-secondary/5 border-email-secondary/20">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-xl lg:text-2xl font-bold text-email-secondary">{stats.successRate.toFixed(1)}%</p>
              </div>
              <CheckCircle className="h-6 w-6 lg:h-8 lg:w-8 text-email-secondary/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-soft bg-gradient-to-br from-email-background to-background border-email-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg lg:text-xl text-email-primary">Campaign Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search campaigns by name or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-email-primary/30 focus:border-email-primary"
                />
              </div>
            </div>
            <div className="lg:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border border-email-primary/30 rounded-md focus:border-email-primary focus:ring-1 focus:ring-email-primary"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sending">Sending</option>
                <option value="paused">Paused</option>
                <option value="sent">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {isSelectionMode && (
        <Card className="bg-gradient-to-r from-email-primary/10 to-email-accent/10 border-email-primary/30">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-email-primary">
                  {selectedCampaigns.size} of {filteredCampaigns.length} campaigns selected
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectAllCampaigns}
                    disabled={selectedCampaigns.size === filteredCampaigns.length}
                  >
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearSelection}
                    disabled={selectedCampaigns.size === 0}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
              
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={selectedCampaigns.size === 0 || isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting ? 'Deleting...' : `Delete ${selectedCampaigns.size} Campaign(s)`}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Delete {selectedCampaigns.size} Campaign(s)
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedCampaigns.size} selected campaign(s)? 
                        This action cannot be undone and will permanently remove all campaign data including send history.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={bulkDeleteCampaigns}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Delete {selectedCampaigns.size} Campaign(s)
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaigns List */}
      <Card className="shadow-soft bg-gradient-to-br from-email-background to-background border-email-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center text-email-secondary">
            <Mail className="h-5 w-5 mr-2" />
            <span>All Campaigns ({filteredCampaigns.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredCampaigns.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  {campaigns.length === 0 
                    ? "No campaigns found. Create your first campaign in the Compose tab."
                    : "No campaigns match your current filters."}
                </p>
              </div>
            ) : (
              filteredCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className={`flex flex-col lg:flex-row items-start lg:items-center justify-between p-4 border rounded-lg transition-all duration-200 border-email-primary/10 hover:border-email-primary/30 ${
                    selectedCampaigns.has(campaign.id) ? 'bg-email-primary/10 border-email-primary/40' : 'hover:bg-gray-50'
                  } ${isSelectionMode ? '' : 'cursor-pointer'}`}
                  onClick={() => {
                    if (isSelectionMode) {
                      toggleCampaignSelection(campaign.id);
                    } else {
                      openCampaignDetails(campaign);
                    }
                  }}
                >
                  <div className="flex items-start space-x-4 w-full lg:w-auto mb-3 lg:mb-0">
                    {isSelectionMode && (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedCampaigns.has(campaign.id)}
                          onChange={() => toggleCampaignSelection(campaign.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-email-primary border-gray-300 rounded focus:ring-email-primary"
                        />
                      </div>
                    )}
                    <div className="w-12 h-12 bg-gradient-to-br from-email-primary to-email-accent rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-email-primary text-base lg:text-lg">{campaign.name}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        Subject: {campaign.subject}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Created: {new Date(campaign.created_at).toLocaleDateString()} at {new Date(campaign.created_at).toLocaleTimeString()}
                        {campaign.sent_at && ` • Completed: ${new Date(campaign.sent_at).toLocaleDateString()}`}
                      </div>
                      {campaign.current_recipient && campaign.status === 'sending' && (
                        <div className="text-xs text-blue-600 mt-1 font-medium">
                          Currently sending to: {campaign.current_recipient}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-3 lg:space-y-0 lg:space-x-4 w-full lg:w-auto">
                    {/* Progress for active campaigns */}
                    {(campaign.status === 'sending' || campaign.status === 'paused') && (
                      <div className="w-full lg:w-32">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{Math.round(getProgress(campaign))}%</span>
                        </div>
                        <Progress value={getProgress(campaign)} className="h-2" />
                      </div>
                    )}

                    <div className="flex items-center space-x-3">
                      <Badge variant={getStatusColor(campaign.status)} className="flex items-center space-x-1">
                        {getStatusIcon(campaign.status)}
                        <span className="capitalize">{campaign.status}</span>
                      </Badge>

                      <div className="text-right text-sm">
                        <div className="font-semibold text-email-primary">
                          {campaign.sent_count || 0}/{campaign.total_recipients || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {campaign.failed_count > 0 && (
                            <span className="text-red-600">{campaign.failed_count} failed</span>
                          )}
                          {campaign.current_sender_sequence && (
                            <div>Sender #{campaign.current_sender_sequence}</div>
                          )}
                        </div>
                      </div>

                      {!isSelectionMode && (
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCampaignDetails(campaign);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCampaignToDelete(campaign);
                                }}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                                  <AlertTriangle className="h-5 w-5" />
                                  Delete Campaign
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{campaign.name}"? This action cannot be undone and will permanently remove all campaign data including send history.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setCampaignToDelete(null)}>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCampaign(campaign.id);
                                  }}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete Campaign
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Details Dialog */}
      <Dialog open={showCampaignDetails} onOpenChange={setShowCampaignDetails}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-email-primary">
              Campaign Details: {selectedCampaign?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCampaign && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-email-primary font-semibold">Subject</Label>
                    <p className="text-sm mt-1 p-2 bg-email-muted/20 rounded">{selectedCampaign.subject}</p>
                  </div>
                  <div>
                    <Label className="text-email-primary font-semibold">Status</Label>
                    <div className="mt-1">
                      <Badge variant={getStatusColor(selectedCampaign.status)} className="flex items-center w-fit space-x-1">
                        {getStatusIcon(selectedCampaign.status)}
                        <span className="capitalize">{selectedCampaign.status}</span>
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-email-primary font-semibold">Total Recipients</Label>
                    <p className="text-2xl font-bold text-email-primary mt-1">{selectedCampaign.total_recipients}</p>
                  </div>
                  <div>
                    <Label className="text-email-primary font-semibold">Successfully Sent</Label>
                    <p className="text-2xl font-bold text-green-600 mt-1">{selectedCampaign.sent_count}</p>
                  </div>
                  <div>
                    <Label className="text-email-primary font-semibold">Failed</Label>
                    <p className="text-2xl font-bold text-red-600 mt-1">{selectedCampaign.failed_count || 0}</p>
                  </div>
                  <div>
                    <Label className="text-email-primary font-semibold">Success Rate</Label>
                    <p className="text-2xl font-bold text-email-accent mt-1">
                      {selectedCampaign.total_recipients > 0 
                        ? ((selectedCampaign.sent_count / selectedCampaign.total_recipients) * 100).toFixed(1) 
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress bar for active campaigns */}
              {(selectedCampaign.status === 'sending' || selectedCampaign.status === 'paused') && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Campaign Progress</span>
                    <span className="font-medium text-email-primary">{Math.round(getProgress(selectedCampaign))}%</span>
                  </div>
                  <Progress value={getProgress(selectedCampaign)} className="h-3" />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => downloadCampaignData(selectedCampaign)}
                  className="border-email-secondary text-email-secondary hover:bg-email-secondary/10"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Data
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateList(true)}
                  disabled={selectedCampaign.status !== 'sent'}
                  className="border-email-primary text-email-primary hover:bg-email-primary/10"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Create List from Recipients
                </Button>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-email-primary">Send Details</h3>
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent At</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaignSends.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                            No send details available
                          </TableCell>
                        </TableRow>
                      ) : (
                        campaignSends.map((send) => (
                          <TableRow key={send.id}>
                            <TableCell className="font-mono text-xs">{send.contact_email}</TableCell>
                            <TableCell>
                              <Badge variant={send.status === 'sent' ? 'default' : 'destructive'}>
                                {send.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {send.sent_at ? new Date(send.sent_at).toLocaleString() : '-'}
                            </TableCell>
                            <TableCell className="text-red-600 text-xs max-w-48 truncate">
                              {send.error_message || '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create List Dialog */}
      <Dialog open={showCreateList} onOpenChange={setShowCreateList}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-email-primary">Create List from Campaign Recipients</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="listName" className="text-email-primary font-medium">List Name *</Label>
              <Input
                id="listName"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Campaign Recipients List"
                className="border-email-primary/30 focus:border-email-primary"
              />
            </div>
            <div>
              <Label htmlFor="listDescription" className="text-email-primary font-medium">Description</Label>
              <Input
                id="listDescription"
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="Optional description..."
                className="border-email-primary/30 focus:border-email-primary"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateList(false)}>
                Cancel
              </Button>
              <Button 
                onClick={createListFromCampaign}
                className="bg-email-primary hover:bg-email-primary/90"
              >
                Create List
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};