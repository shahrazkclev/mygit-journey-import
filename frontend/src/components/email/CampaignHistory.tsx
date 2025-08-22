import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, Mail, Users, Plus, Eye, Download, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_USER_ID } from '@/lib/demo-auth';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  sent_at: string | null;
  created_at: string;
  html_content: string;
  list_ids: string[];
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

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load campaigns');
    }
  };

  const loadCampaignSends = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('campaign_sends')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setCampaignSends(data || []);
    } catch (error) {
      console.error('Error loading campaign sends:', error);
      toast.error('Failed to load campaign details');
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
      default: return 'outline';
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Campaign History</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="h-5 w-5 mr-2" />
            All Campaigns ({campaigns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No campaigns found. Create your first campaign in the Compose tab.
              </p>
            ) : (
              campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                  onClick={() => openCampaignDetails(campaign)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{campaign.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {campaign.subject}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Created: {new Date(campaign.created_at).toLocaleDateString()}
                        {campaign.sent_at && ` • Sent: ${new Date(campaign.sent_at).toLocaleDateString()}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                    <div className="text-right text-sm">
                      <div className="font-medium">
                        {campaign.sent_count || 0}/{campaign.total_recipients || 0}
                      </div>
                      <div className="text-muted-foreground">recipients</div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Details Dialog */}
      <Dialog open={showCampaignDetails} onOpenChange={setShowCampaignDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Campaign Details: {selectedCampaign?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCampaign && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Subject</Label>
                  <p className="text-sm">{selectedCampaign.subject}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge variant={getStatusColor(selectedCampaign.status)}>
                    {selectedCampaign.status}
                  </Badge>
                </div>
                <div>
                  <Label>Recipients</Label>
                  <p className="text-sm">{selectedCampaign.total_recipients}</p>
                </div>
                <div>
                  <Label>Sent Count</Label>
                  <p className="text-sm">{selectedCampaign.sent_count}</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => downloadCampaignData(selectedCampaign)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Data
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateList(true)}
                  disabled={selectedCampaign.status !== 'sent'}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Create List from Recipients
                </Button>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Send Details</h3>
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
                      {campaignSends.map((send) => (
                        <TableRow key={send.id}>
                          <TableCell>{send.contact_email}</TableCell>
                          <TableCell>
                            <Badge variant={send.status === 'sent' ? 'default' : 'destructive'}>
                              {send.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {send.sent_at ? new Date(send.sent_at).toLocaleString() : '-'}
                          </TableCell>
                          <TableCell className="text-red-600 text-xs">
                            {send.error_message || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
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
            <DialogTitle>Create List from Campaign Recipients</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="listName">List Name *</Label>
              <Input
                id="listName"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Campaign Recipients List"
              />
            </div>
            <div>
              <Label htmlFor="listDescription">Description</Label>
              <Input
                id="listDescription"
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="Optional description..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateList(false)}>
                Cancel
              </Button>
              <Button onClick={createListFromCampaign}>
                Create List
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};