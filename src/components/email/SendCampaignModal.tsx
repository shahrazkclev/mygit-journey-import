import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Send, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_USER_ID } from '@/lib/demo-auth';

interface SendCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  htmlContent: string;
  selectedLists: string[];
}

export const SendCampaignModal: React.FC<SendCampaignModalProps> = ({
  isOpen,
  onClose,
  subject,
  htmlContent,
  selectedLists
}) => {
  const [campaignTitle, setCampaignTitle] = useState(subject);
  const [campaignName, setCampaignName] = useState('Campaign ' + new Date().toLocaleDateString());
  const [senderSequence, setSenderSequence] = useState(1);
  const [isStarting, setIsStarting] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'sending' | 'paused' | 'sent' | 'failed'>('idle');
  const [totalRecipients, setTotalRecipients] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  const startCampaign = async () => {
    if (selectedLists.length === 0) {
      toast.error('Please select at least one email list');
      return;
    }

    // Get webhook URL from settings
    const { data: settings, error: settingsError } = await supabase
      .from('style_guides')
      .select('*')
      .eq('user_id', DEMO_USER_ID)
      .order('created_at', { ascending: false })
      .limit(1);

    if (settingsError) {
      toast.error('Failed to load settings');
      return;
    }

    const webhookUrl = settings?.[0]?.webhook_url;
    if (!webhookUrl) {
      toast.error('Please set webhook URL in Settings first');
      return;
    }

    setIsStarting(true);

    try {
      // Create campaign record
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: DEMO_USER_ID,
          name: campaignName,
          subject: campaignTitle,
          html_content: htmlContent,
          list_ids: selectedLists,
          status: 'draft',
          webhook_url: webhookUrl,
          sender_sequence_number: senderSequence
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      setCampaignId(campaign.id);

      // Start the background sending process
      const { error: sendError } = await supabase.functions.invoke('send-campaign', {
        body: {
          campaignId: campaign.id,
          webhookUrl,
          title: campaignTitle,
          html: htmlContent,
          name: campaignName,
          senderSequenceNumber: senderSequence
        }
      });

      if (sendError) throw sendError;

      setStatus('sending');
      toast.success('Campaign started! Sending in background...');

      // Start monitoring progress
      monitorProgress(campaign.id);

    } catch (error: any) {
      console.error('Error starting campaign:', error);
      toast.error(error.message || 'Failed to start campaign');
      setStatus('failed');
    } finally {
      setIsStarting(false);
    }
  };

  const monitorProgress = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const { data: campaign, error } = await supabase
          .from('campaigns')
          .select('status, total_recipients, sent_count')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error monitoring campaign:', error);
          clearInterval(interval);
          return;
        }

        if (campaign) {
          setTotalRecipients(campaign.total_recipients || 0);
          setSentCount(campaign.sent_count || 0);
          setStatus(campaign.status as any);
          
          if (campaign.total_recipients > 0) {
            setProgress((campaign.sent_count / campaign.total_recipients) * 100);
          }

          if (campaign.status === 'sent' || campaign.status === 'failed') {
            clearInterval(interval);
            toast.success(
              campaign.status === 'sent' 
                ? `Campaign completed! Sent to ${campaign.sent_count} recipients.`
                : `Campaign failed. Sent to ${campaign.sent_count} out of ${campaign.total_recipients} recipients.`
            );
          }
        }
      } catch (error) {
        console.error('Error monitoring campaign:', error);
        clearInterval(interval);
      }
    }, 3000); // Check every 3 seconds

    // Clean up on component unmount
    return () => clearInterval(interval);
  };

  const pauseResumeCampaign = async () => {
    if (!campaignId) return;

    try {
      const newStatus = status === 'sending' ? 'paused' : 'sending';
      
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaignId);

      if (error) throw error;

      setStatus(newStatus as any);
      toast.success(newStatus === 'paused' ? 'Campaign paused' : 'Campaign resumed');
    } catch (error: any) {
      toast.error('Failed to update campaign status');
    }
  };

  const resetModal = () => {
    setStatus('idle');
    setProgress(0);
    setCampaignId(null);
    setTotalRecipients(0);
    setSentCount(0);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Campaign
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {status === 'idle' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Campaign Title</Label>
                <Input
                  id="title"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  placeholder="Enter campaign title..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Enter campaign name..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sequence">Sender Sequence Number</Label>
                <Input
                  id="sequence"
                  type="number"
                  min="1"
                  value={senderSequence}
                  onChange={(e) => setSenderSequence(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Background Processing</p>
                    <p>This campaign will run in the background using the webhook URL from Settings.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleClose} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={startCampaign} 
                  disabled={isStarting}
                  className="flex-1"
                >
                  {isStarting ? 'Starting...' : 'Start Campaign'}
                </Button>
              </div>
            </>
          )}

          {(status === 'sending' || status === 'paused' || status === 'sent' || status === 'failed') && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Status: <span className="capitalize">{status}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {sentCount} / {totalRecipients} sent
                  </span>
                </div>

                <Progress value={progress} className="w-full" />

                <div className="text-sm text-muted-foreground text-center">
                  {status === 'sending' && 'Sending emails in background...'}
                  {status === 'paused' && 'Campaign is paused'}
                  {status === 'sent' && 'Campaign completed successfully!'}
                  {status === 'failed' && 'Campaign failed'}
                </div>
              </div>

              <div className="flex gap-2">
                {(status === 'sending' || status === 'paused') && (
                  <Button 
                    onClick={pauseResumeCampaign}
                    variant="outline"
                    className="flex-1"
                  >
                    {status === 'sending' ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Resume
                      </>
                    )}
                  </Button>
                )}
                <Button onClick={handleClose} className="flex-1">
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};