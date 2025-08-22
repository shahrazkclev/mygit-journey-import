import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Send, Pause, Play, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  const [failedCount, setFailedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [currentSenderSequence, setCurrentSenderSequence] = useState(1);

  const startCampaign = async () => {
    if (selectedLists.length === 0) {
      toast.error('Please select at least one email list');
      return;
    }

    // Get webhook URL from user_settings
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('webhook_url')
      .eq('user_id', DEMO_USER_ID)
      .maybeSingle();

    if (settingsError) {
      console.error('Failed to load settings', settingsError);
      toast.error('Failed to load settings');
      return;
    }

    const webhookUrl = settings?.webhook_url || undefined;
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
          .select('status, total_recipients, sent_count, current_sender_sequence')
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
          setCurrentSenderSequence(campaign.current_sender_sequence || 1);
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-email-primary">Campaign Progress</h3>
                <div className="flex items-center gap-2">
                  {status === 'sending' && <Badge className="bg-email-accent/20 text-email-accent">Sending...</Badge>}
                  {status === 'paused' && <Badge variant="outline" className="border-orange-500 text-orange-600">Paused</Badge>}
                  {status === 'sent' && <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>}
                  {status === 'failed' && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium text-email-primary">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-email-primary">{totalRecipients}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-green-600">{sentCount}</div>
                  <div className="text-xs text-muted-foreground">Sent</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-email-accent">{currentSenderSequence}</div>
                  <div className="text-xs text-muted-foreground">Sender #</div>
                </div>
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-red-800">
                      <p className="font-medium">Error Details:</p>
                      <p>{errorMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {status === 'sending' && (
                  <Button onClick={pauseResumeCampaign} variant="outline" className="flex-1 border-orange-500 text-orange-600 hover:bg-orange-50">
                    <Pause className="h-4 w-4 mr-2" />
                    Pause Campaign
                  </Button>
                )}
                
                {status === 'paused' && (
                  <Button onClick={pauseResumeCampaign} className="flex-1 bg-email-accent hover:bg-email-accent/80">
                    <Play className="h-4 w-4 mr-2" />
                    Resume Campaign
                  </Button>
                )}
                
                {(status === 'sent' || status === 'failed') && (
                  <Button onClick={handleClose} className="flex-1 bg-email-primary hover:bg-email-primary/80">
                    Close
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};