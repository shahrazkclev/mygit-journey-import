import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Send, Pause, Play, CheckCircle, XCircle, Users, Clock, Mail } from 'lucide-react';
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

interface RecipientDetails {
  email: string;
  name?: string;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  timestamp?: string;
  error?: string;
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
  const [currentRecipient, setCurrentRecipient] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  
  // Enhanced recipient tracking
  const [recipientDetails, setRecipientDetails] = useState<RecipientDetails[]>([]);
  const [listNames, setListNames] = useState<string[]>([]);

  // Load list details on modal open
  useEffect(() => {
    if (isOpen && selectedLists.length > 0) {
      loadListDetails();
    }
  }, [isOpen, selectedLists]);

  const loadListDetails = async () => {
    try {
      const { data: lists, error } = await supabase
        .from('email_lists')
        .select('name')
        .in('id', selectedLists);

      if (error) throw error;
      
      setListNames(lists.map(list => list.name));
      
      // For now, set a mock recipient count since the backend uses mock data
      // In a real implementation, this would query the actual contact lists
      setTotalRecipients(5); // matches the mock data in backend

      // Calculate estimated time (assuming 1 email per 2 seconds)
      const estimatedSeconds = 5 * 2;
      const minutes = Math.floor(estimatedSeconds / 60);
      const seconds = estimatedSeconds % 60;
      setEstimatedTime(minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`);

    } catch (error) {
      console.error('Error loading list details:', error);
    }
  };

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
    setStartTime(new Date());

    try {
      // Create campaign record via our FastAPI backend
      const backendUrl = import.meta.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
      
      const campaignResponse = await fetch(`${backendUrl}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: campaignName,
          subject: campaignTitle,
          html_content: htmlContent,
          selected_lists: selectedLists,
          sender_sequence: senderSequence,
          webhook_url: webhookUrl
        })
      });

      if (!campaignResponse.ok) {
        throw new Error(`Failed to create campaign: ${campaignResponse.statusText}`);
      }

      const campaign = await campaignResponse.json();
      setCampaignId(campaign.id);

      setStatus('sending');
      toast.success('Campaign started! Sending in background...');

      // Start monitoring progress
      monitorProgress(campaign.id);

    } catch (error: any) {
      console.error('Error starting campaign:', error);
      toast.error(error.message || 'Failed to start campaign');
      setStatus('failed');
      setErrorMessage(error.message || 'Unknown error occurred');
    } finally {
      setIsStarting(false);
    }
  };

  const monitorProgress = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const backendUrl = import.meta.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
        
        const response = await fetch(`${backendUrl}/api/campaigns/${id}`);
        
        if (!response.ok) {
          console.error('Error monitoring campaign:', response.statusText);
          clearInterval(interval);
          return;
        }

        const campaign = await response.json();

        if (campaign) {
          setTotalRecipients(campaign.total_recipients || 0);
          setSentCount(campaign.sent_count || 0);
          setFailedCount(campaign.failed_count || 0);
          setCurrentSenderSequence(campaign.current_sender_sequence || 1);
          setCurrentRecipient(campaign.current_recipient || '');
          setStatus(campaign.status as any);
          setErrorMessage(campaign.error_message);
          
          if (campaign.total_recipients > 0) {
            setProgress((campaign.sent_count / campaign.total_recipients) * 100);
          }

          if (campaign.status === 'sent' || campaign.status === 'failed') {
            clearInterval(interval);
            const message = campaign.status === 'sent' 
              ? `✅ Campaign completed! Sent to ${campaign.sent_count} recipients.`
              : `❌ Campaign failed. Sent to ${campaign.sent_count} out of ${campaign.total_recipients} recipients.`;
            
            toast.success(message);
          }
        }
      } catch (error) {
        console.error('Error monitoring campaign:', error);
        clearInterval(interval);
      }
    }, 2000); // Check every 2 seconds for more responsive updates

    // Clean up on component unmount
    return () => clearInterval(interval);
  };

  const pauseResumeCampaign = async () => {
    if (!campaignId) return;

    try {
      const backendUrl = import.meta.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
      const newStatus = status === 'sending' ? 'paused' : 'sending';
      
      const endpoint = newStatus === 'paused' 
        ? `${backendUrl}/api/campaigns/${campaignId}/pause`
        : `${backendUrl}/api/campaigns/${campaignId}/resume`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to ${newStatus === 'paused' ? 'pause' : 'resume'} campaign`);
      }

      setStatus(newStatus as any);
      toast.success(newStatus === 'paused' ? 'Campaign paused' : 'Campaign resumed');
    } catch (error: any) {
      toast.error(`Failed to update campaign status: ${error.message}`);
    }
  };

  const resetModal = () => {
    setStatus('idle');
    setProgress(0);
    setCampaignId(null);
    setTotalRecipients(0);
    setSentCount(0);
    setFailedCount(0);
    setCurrentRecipient('');
    setErrorMessage(null);
    setStartTime(null);
    setRecipientDetails([]);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const getElapsedTime = () => {
    if (!startTime) return '';
    const elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getRemainingTime = () => {
    if (!startTime || sentCount === 0) return estimatedTime;
    
    const elapsed = (new Date().getTime() - startTime.getTime()) / 1000;
    const rate = sentCount / elapsed; // emails per second
    const remaining = (totalRecipients - sentCount) / rate;
    
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-email-primary">
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
                  className="border-email-primary/30 focus:border-email-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Enter campaign name..."
                  className="border-email-primary/30 focus:border-email-primary"
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
                  className="border-email-primary/30 focus:border-email-primary"
                />
              </div>

              {/* Campaign Summary */}
              <div className="bg-gradient-to-r from-email-primary/10 to-email-accent/10 border border-email-primary/20 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-email-primary flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Campaign Summary
                </h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-email-accent" />
                    <div>
                      <div className="font-medium text-email-primary">{totalRecipients}</div>
                      <div className="text-xs text-muted-foreground">Recipients</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-email-secondary" />
                    <div>
                      <div className="font-medium text-email-primary">{estimatedTime}</div>
                      <div className="text-xs text-muted-foreground">Est. Time</div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-email-primary/10">
                  <div className="text-xs text-muted-foreground">Target Lists:</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {listNames.map((name, index) => (
                      <Badge key={index} variant="outline" className="text-xs border-email-primary/30 text-email-primary">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Background Processing</p>
                    <p>This campaign will run in the background using the webhook URL from Settings. You can monitor progress in real-time.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleClose} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={startCampaign} 
                  disabled={isStarting || totalRecipients === 0}
                  className="flex-1 bg-email-primary hover:bg-email-primary/90 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isStarting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Starting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Start Campaign
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {(status === 'sending' || status === 'paused' || status === 'sent' || status === 'failed') && (
            <div className="space-y-4">
              {/* Status Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-email-primary">Campaign Progress</h3>
                <div className="flex items-center gap-2">
                  {status === 'sending' && (
                    <Badge className="bg-email-accent/20 text-email-accent animate-pulse">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-email-accent rounded-full mr-2 animate-pulse"></div>
                        Sending...
                      </div>
                    </Badge>
                  )}
                  {status === 'paused' && <Badge variant="outline" className="border-orange-500 text-orange-600">Paused</Badge>}
                  {status === 'sent' && <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>}
                  {status === 'failed' && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium text-email-primary">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{sentCount} of {totalRecipients} sent</span>
                  <span>{status === 'sending' ? 'Time remaining: ' + getRemainingTime() : getElapsedTime()}</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="bg-email-muted/20 rounded-lg p-3 border border-email-primary/10">
                  <div className="text-2xl font-bold text-email-primary">{totalRecipients}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="text-2xl font-bold text-green-600">{sentCount}</div>
                  <div className="text-xs text-muted-foreground">Sent</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="bg-email-accent/10 rounded-lg p-3 border border-email-accent/20">
                  <div className="text-2xl font-bold text-email-accent">{currentSenderSequence}</div>
                  <div className="text-xs text-muted-foreground">Sender #</div>
                </div>
              </div>

              {/* Current Activity */}
              {currentRecipient && status === 'sending' && (
                <div className="bg-gradient-to-r from-blue-50 to-email-accent/10 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      <Send className="h-4 w-4 text-blue-600 animate-pulse" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-blue-800">Currently sending to:</div>
                      <div className="text-blue-600 font-mono text-xs break-all">{currentRecipient}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Campaign Info */}
              <div className="bg-email-background/50 border border-email-primary/10 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-2">Campaign Details</div>
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">Subject:</span> {campaignTitle}</div>
                  <div><span className="font-medium">Started:</span> {startTime?.toLocaleTimeString()}</div>
                  <div><span className="font-medium">Lists:</span> {listNames.join(', ')}</div>
                </div>
              </div>

              {/* Error Display */}
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-red-800">
                      <p className="font-medium">Error Details:</p>
                      <p className="mt-1 text-xs">{errorMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
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
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                )}
                
                {(status === 'sending' || status === 'paused') && (
                  <Button onClick={handleClose} variant="outline" className="flex-1">
                    Close & Run in Background
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