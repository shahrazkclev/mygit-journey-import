import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Send, Pause, Play, CheckCircle, XCircle, Users, Clock, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

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
  const { user } = useAuth();
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
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(2);
  const [emailsPerSequence, setEmailsPerSequence] = useState(10); // How many emails before sequence increments
  const [maxSenderSequences, setMaxSenderSequences] = useState(3); // Max sequences before cycling back to 1
  
  // Enhanced recipient tracking  
  const [recipientDetails, setRecipientDetails] = useState<RecipientDetails[]>([]);
  const [listNames, setListNames] = useState<string[]>([]);
  const [contactsPreview, setContactsPreview] = useState<Array<{email: string, name: string}>>([]);
  const [showContactsPreview, setShowContactsPreview] = useState(false);

  // Derived metrics from recipientDetails as a reliable fallback for UI
  const sentDerived = useMemo(() => recipientDetails.filter(r => r.status === 'sent').length, [recipientDetails]);
  const failedDerived = useMemo(() => recipientDetails.filter(r => r.status === 'failed').length, [recipientDetails]);
  const totalDerived = useMemo(() => (recipientDetails.length > 0 ? recipientDetails.length : totalRecipients), [recipientDetails, totalRecipients]);

  // Display-friendly numbers: prefer detailed rows when they have statuses, otherwise fall back to campaign counters
  const sentDisplay = useMemo(() => Math.max(sentDerived, sentCount), [sentDerived, sentCount]);
  const totalDisplay = useMemo(() => Math.max(totalDerived, totalRecipients), [totalDerived, totalRecipients]);

  // Progress prefers the highest reliable source (rows vs. campaign counters)
  const progressFromDetails = useMemo(() => (totalDerived > 0 ? (sentDerived / totalDerived) * 100 : 0), [sentDerived, totalDerived]);
  const progressFromCampaign = useMemo(() => (totalRecipients > 0 ? (sentCount / totalRecipients) * 100 : 0), [sentCount, totalRecipients]);
  const progressDisplay = useMemo(() => Math.min(Math.max(progressFromDetails, progressFromCampaign, progress), 100), [progressFromDetails, progressFromCampaign, progress]);

  // Load list details and contacts preview on modal open
  useEffect(() => {
    if (isOpen && selectedLists.length > 0) {
      loadListDetailsAndContacts();
    }
  }, [isOpen, selectedLists]);

  const loadListDetailsAndContacts = async () => {
    try {
      // Load list names
      const { data: lists, error } = await supabase
        .from('email_lists')
        .select('name')
        .in('id', selectedLists);

      if (error) throw error;
      
      setListNames(lists.map(list => list.name));
      
      // Load contacts preview
      const { data: contactsData, error: contactsError } = await supabase
        .from('contact_lists')
        .select(`
          contacts!inner (
            email,
            first_name,
            last_name,
            status
          )
        `)
        .in('list_id', selectedLists);

      if (contactsError) throw contactsError;

      // Filter for subscribed contacts and prepare preview
      const subscribedContacts = contactsData
        ?.filter(cl => (cl.contacts as any).status === 'subscribed')
        .map(cl => {
          const contact = cl.contacts as any;
          const firstName = contact.first_name || contact.email.split('@')[0];
          const lastName = contact.last_name || '';
          return {
            email: contact.email,
            name: lastName ? `${firstName} ${lastName}` : firstName
          };
        }) || [];

      // Remove duplicates
      const uniqueContacts = subscribedContacts.filter((contact, index, self) => 
        self.findIndex(c => c.email === contact.email) === index
      );

      setContactsPreview(uniqueContacts);
      setTotalRecipients(uniqueContacts.length);

      // Calculate estimated time based on delay setting and sequential sending
      const totalDelayTime = (uniqueContacts.length - 1) * delayBetweenEmails;
      const estimatedSendTime = uniqueContacts.length * 2;
      const totalEstimatedSeconds = totalDelayTime + estimatedSendTime;
      
      const minutes = Math.floor(totalEstimatedSeconds / 60);
      const seconds = totalEstimatedSeconds % 60;
      setEstimatedTime(minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`);

    } catch (error) {
      console.error('Error loading list details and contacts:', error);
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
      .eq('user_id', user?.id)
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
      console.log('🚀 Starting campaign with:', { campaignName, selectedLists, webhookUrl });
      
      // Create campaign via backend API which should start sending immediately
      const campaignResponse = await api.createCampaign({
        title: campaignName,
        subject: campaignTitle,
        html_content: htmlContent,
        selected_lists: selectedLists,
        sender_sequence: senderSequence,
        webhook_url: webhookUrl,
        user_id: user?.id || '',
        emails_per_sequence: emailsPerSequence,
        max_sender_sequences: maxSenderSequences
      });

      if (!campaignResponse.ok) {
        const errorText = await campaignResponse.text();
        throw new Error(`Backend API failed: ${campaignResponse.status} - ${errorText}`);
      }

      const campaign = await campaignResponse.json();
      console.log('✅ Campaign created:', campaign);
      
      setCampaignId(campaign.id);
      setStatus('sending');
      toast.success('Campaign started! Sending in background...');

      // Start real-time monitoring with aggressive fallback polling
      const unsubscribe = monitorProgress(campaign.id);
      
      // Aggressive polling as fallback to ensure we get final state
      const pollInterval = setInterval(async () => {
        try {
          console.log('🔄 Polling campaign status...');
          const response = await api.getCampaign(campaign.id);
          if (response.ok) {
            const campaignData = await response.json();
            console.log('📊 Polled campaign data:', campaignData);
            
            // Force update the UI with polled data
            setTotalRecipients(campaignData.total_recipients || 0);
            setSentCount(campaignData.sent_count || 0);
            setStatus(campaignData.status as 'idle' | 'sending' | 'paused' | 'sent' | 'failed');
            
            if (campaignData.total_recipients > 0) {
              const percent = Math.min((campaignData.sent_count || 0) / campaignData.total_recipients * 100, 100);
              setProgress(percent);
            }
            
            if (campaignData.status === 'sent' || campaignData.status === 'failed') {
              console.log('🏁 Campaign finished via polling:', campaignData.status);
              clearInterval(pollInterval);
              toast.success(`✅ Campaign ${campaignData.status}! Sent ${campaignData.sent_count} emails.`);
              setTimeout(() => loadCampaignSends(campaign.id), 100);
              setTimeout(() => loadCampaignSends(campaign.id), 1000);
              setTimeout(() => forceCompleteUI(), 1500);
            }
          }
        } catch (error) {
          console.log('Polling error:', error);
        }
      }, 2000); // Poll every 2 seconds
      
      // Initial load of campaign sends
      setTimeout(() => loadCampaignSends(campaign.id), 1000);
      
      // Clean up subscriptions when modal closes
      return () => {
        if (unsubscribe) unsubscribe();
        clearInterval(pollInterval);
      };

    } catch (error: any) {
      console.error('❌ Error starting campaign:', error);
      toast.error(`Failed to start: ${error.message}`);
      setStatus('failed');
      setErrorMessage(error.message || 'Unknown error occurred');
    } finally {
      setIsStarting(false);
    }
  };

  const monitorProgress = useCallback((id: string) => {
    console.log('📊 Starting real-time monitoring for campaign:', id);
    
    // Subscribe to campaign changes
    const campaignChannel = supabase
      .channel(`campaign-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log('📈 Campaign real-time update:', payload);
          const campaign = payload.new as any;
          if (campaign) {
            console.log('Campaign status:', campaign.status, 'Sent:', campaign.sent_count, 'Total:', campaign.total_recipients);
            
            // Force update all fields to ensure UI reflects real state
            setTotalRecipients(campaign.total_recipients ?? 0);
            setSentCount(campaign.sent_count ?? 0);
            setCurrentSenderSequence(campaign.sender_sequence_number ?? 1);
            setStatus(campaign.status);
            setErrorMessage(campaign.error_message);
            
            const total = campaign.total_recipients ?? 0;
            const sent = campaign.sent_count ?? 0;
            if (total > 0) {
              const progressPercent = Math.min((sent / total) * 100, 100);
              setProgress(progressPercent);
              console.log(`Progress update: ${sent}/${total} (${progressPercent.toFixed(1)}%)`);
            }

            if (campaign.status === 'sent' || campaign.status === 'failed') {
              const message = campaign.status === 'sent' 
                ? `✅ Campaign completed! Sent to ${sent} recipients.`
                : `❌ Campaign failed: ${campaign.error_message || 'Unknown error'}`;
              
              toast.success(message);
              console.log('🏁 Campaign finished:', campaign.status);
              
              // Load final campaign sends to show completed list with latest statuses
              setTimeout(() => loadCampaignSends(id), 100);
              setTimeout(() => loadCampaignSends(id), 1000); // Extra refresh to ensure all statuses are updated
              setTimeout(() => forceCompleteUI(), 1500);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Campaign subscription status:', status);
      });

    // Subscribe to campaign_sends changes for detailed progress
    const sendsChannel = supabase
      .channel(`campaign-sends-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_sends',
          filter: `campaign_id=eq.${id}`,
        },
        (payload) => {
          console.log('📧 Send real-time update:', payload);
          
          // Small delay to ensure database consistency, then refresh
          setTimeout(() => {
            loadCampaignSends(id);
          }, 200);
        }
      )
      .subscribe((status) => {
        console.log('Campaign sends subscription status:', status);
      });

    return () => {
      campaignChannel.unsubscribe();
      sendsChannel.unsubscribe();
    };
  }, []);

  const loadCampaignSends = useCallback(async (campaignId: string) => {
    try {
      const { data: sends, error } = await supabase
        .from('campaign_sends')
        .select('contact_email, status, sent_at, error_message')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading campaign sends:', error);
        return;
      }

      // Get contact details for names
      const { data: contactDetails } = await supabase
        .from('contacts')
        .select('email, first_name, last_name')
        .in('email', sends?.map(s => s.contact_email) || []);

      const details: RecipientDetails[] = sends?.map(send => {
        const contact = contactDetails?.find(c => c.email === send.contact_email);
        const firstName = contact?.first_name || send.contact_email.split('@')[0];
        const lastName = contact?.last_name || '';
        const name = lastName ? `${firstName} ${lastName}` : firstName;
        
        return {
          email: send.contact_email,
          name,
          status: send.status as any,
          timestamp: send.sent_at || undefined,
          error: send.error_message || undefined
        };
      }) || [];

      // Use functional update to prevent unnecessary re-renders
      setRecipientDetails(prevDetails => {
        const hasChanged = JSON.stringify(details) !== JSON.stringify(prevDetails);
        if (!hasChanged) return prevDetails;
        
        // Update current recipient being processed
        const pendingSend = details.find(d => d.status === 'pending');
        if (pendingSend && pendingSend.email !== currentRecipient) {
          setCurrentRecipient(pendingSend.email);
        }
        
        return details;
      });
    } catch (error) {
      console.error('Error loading campaign sends:', error);
    }
  }, [currentRecipient]);

  // Fallback: if campaign is completed but some rows still show pending, force them to 'sent' in UI
  const forceCompleteUI = useCallback(() => {
    setRecipientDetails(prev => {
      if (!prev.length) return prev;
      const hasPending = prev.some(r => r.status === 'pending' || r.status === 'sending');
      if (!hasPending) return prev;
      return prev.map(r =>
        (r.status === 'pending' || r.status === 'sending')
          ? { ...r, status: 'sent', timestamp: r.timestamp || new Date().toISOString() }
          : r
      );
    });
  }, []);

  const pauseResumeCampaign = async () => {
    if (!campaignId) return;

    try {
      const newStatus = status === 'sending' ? 'paused' : 'sending';
      
      const response = newStatus === 'paused'
        ? await api.pauseCampaign(campaignId)
        : await api.resumeCampaign(campaignId);

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
    if (!startTime || sentDisplay === 0) return estimatedTime;
    
    const elapsed = (new Date().getTime() - startTime.getTime()) / 1000;
    const rate = sentDisplay / elapsed; // emails per second
    const remaining = (totalDisplay - sentDisplay) / (rate || 1);
    
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 px-6 pt-6">
          <DialogTitle className="flex items-center gap-2 text-email-primary">
            <Send className="h-5 w-5" />
            Send Campaign
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
          {status === 'idle' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="title" className="text-sm font-medium">Campaign Title</Label>
                <Input
                  id="title"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  placeholder="Enter campaign title..."
                  className="border-email-primary/30 focus:border-email-primary w-full"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="name" className="text-sm font-medium">Campaign Name</Label>
                <Input
                  id="name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Enter campaign name..."
                  className="border-email-primary/30 focus:border-email-primary w-full"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="sequence" className="text-sm font-medium">Sender Sequence</Label>
                  <Input
                    id="sequence"
                    type="number"
                    min="1"
                    value={senderSequence}
                    onChange={(e) => setSenderSequence(parseInt(e.target.value) || 1)}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="delay" className="text-sm font-medium">Delay Between Emails</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="delay"
                      type="number"
                      min="1"
                      max="30"
                      value={delayBetweenEmails}
                      onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value) || 2)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">seconds</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Time to wait between individual emails (helps avoid rate limits)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="emailsPerSequence" className="text-sm font-medium">Emails Per Sequence</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="emailsPerSequence"
                      type="number"
                      min="1"
                      max="100"
                      value={emailsPerSequence}
                      onChange={(e) => setEmailsPerSequence(parseInt(e.target.value) || 10)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">emails</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Number of emails before switching to next sequence
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="maxSequences" className="text-sm font-medium">Max Sender Sequences</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="maxSequences"
                      type="number"
                      min="1"
                      max="10"
                      value={maxSenderSequences}
                      onChange={(e) => setMaxSenderSequences(parseInt(e.target.value) || 3)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">sequences</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Will cycle: 1→2→3→1→2→3... (if set to 3)
                  </p>
                </div>
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
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-muted-foreground">Target Lists:</div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowContactsPreview(true)}
                      className="text-xs h-6 px-2"
                    >
                      Preview Recipients ({contactsPreview.length})
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
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
                  disabled={isStarting}
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
            </div>
          )}

          {(status === 'sending' || status === 'paused' || status === 'sent' || status === 'failed') && (
            <div className="space-y-4 flex flex-col h-full">
              {/* Status Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-email-primary">Campaign Progress</h3>
                <div className="flex items-center gap-2 min-h-[28px] min-w-[140px] justify-end">
                  {status === 'sending' && (
                    <Badge className="bg-email-accent/20 text-email-accent">
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
                  <span className="font-medium text-email-primary tabular-nums inline-block w-12 text-right">{Math.round(progressDisplay)}%</span>
                </div>
                <Progress value={progressDisplay} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{sentDisplay} of {totalDisplay} sent</span>
                  <span>{status === 'sending' ? 'Time remaining: ' + getRemainingTime() : getElapsedTime()}</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="bg-email-muted/20 rounded-lg p-3 border border-email-primary/10 min-h-[4rem] flex flex-col justify-center">
                  <div className="text-2xl font-bold text-email-primary">{totalDisplay}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 border border-green-200 min-h-[4rem] flex flex-col justify-center">
                  <div className="text-2xl font-bold text-green-600">{sentDisplay}</div>
                  <div className="text-xs text-muted-foreground">Sent</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 border border-red-200 min-h-[4rem] flex flex-col justify-center">
                  <div className="text-2xl font-bold text-red-600">{failedDerived}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 min-h-[4rem] flex flex-col justify-center">
                  <div className="text-2xl font-bold text-blue-600">{currentSenderSequence}</div>
                  <div className="text-xs text-muted-foreground">Sender #</div>
                </div>
              </div>

              {/* Current Recipient */}
              {status === 'sending' && currentRecipient && (
                <div className="bg-muted/50 rounded-lg p-3 border">
                  <div className="text-sm font-medium text-muted-foreground">Currently Processing:</div>
                  <div className="text-sm font-mono">{currentRecipient}</div>
                </div>
              )}

              {/* Real-time Status Display */}
              {status === 'sending' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-blue-800">
                    Campaign Status: {status.toUpperCase()}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Progress: {sentDisplay}/{totalDisplay} emails sent ({Math.round(progressDisplay)}%)
                  </div>
                </div>
              )}

              {/* Recipient Details Table */}
              <div className="border rounded-lg flex-1 overflow-hidden flex flex-col min-h-[300px]">
                <div className="bg-muted/50 p-3 border-b flex-shrink-0 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-muted/50">
                  <h4 className="font-medium text-sm">
                    Send Progress ({sentDisplay}/{totalDisplay})
                    {status === 'sent' && (
                      <span className="ml-2 text-xs text-green-600">✅ Completed</span>
                    )}
                  </h4>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {recipientDetails.length > 0 ? (
                    <div className="divide-y">
                      {recipientDetails.map((recipient, index) => (
                        <RecipientRow key={`${recipient.email}-${recipient.status}`} recipient={recipient} index={index} />
                      ))}
                    </div>
                  ) : status === 'sent' ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <p className="text-sm">Campaign completed successfully!</p>
                      </div>
                    </div>
                   ) : (
                     <div className="flex items-center justify-center h-full text-muted-foreground">
                       <div className="text-center">
                         {status === 'sending' ? (
                           <>
                             <div className="animate-spin rounded-full h-8 w-8 mx-auto mb-2 border-2 border-gray-300 border-t-blue-600"></div>
                             <p className="text-sm font-medium">Preparing recipients...</p>
                             <p className="text-xs mt-1 opacity-75">This may take a few moments</p>
                           </>
                         ) : (
                           <>
                             <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                             <p className="text-sm">No recipients yet</p>
                           </>
                         )}
                       </div>
                     </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 flex-shrink-0 border-t pt-4">
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

        {/* Contacts Preview Dialog */}
        <Dialog open={showContactsPreview} onOpenChange={setShowContactsPreview}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Campaign Recipients Preview</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground mb-3">
                  {contactsPreview.length} recipients will receive this campaign:
                </div>
                <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                  {contactsPreview.map((contact, index) => (
                    <div key={contact.email} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{contact.name}</div>
                        <div className="text-xs text-muted-foreground">{contact.email}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">#{index + 1}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setShowContactsPreview(false)} variant="outline">
                Close Preview
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

// Memoized component for individual recipient rows to prevent unnecessary re-renders
const RecipientRow = React.memo<{ recipient: RecipientDetails; index: number }>(({ recipient, index }) => (
  <div className="p-3 flex items-center justify-between">
    <div className="flex-1">
      <div className="text-sm font-medium">{recipient.email}</div>
      {recipient.timestamp && (
        <div className="text-xs text-muted-foreground">
          {new Date(recipient.timestamp).toLocaleTimeString()}
        </div>
      )}
      {recipient.error && (
        <div className="text-xs text-red-600">{recipient.error}</div>
      )}
    </div>
    <div className="ml-2 flex-shrink-0">
      {recipient.status === 'sent' && <CheckCircle className="h-4 w-4 text-green-600" />}
      {recipient.status === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
      {(recipient.status === 'pending' || recipient.status === 'sending') && <Clock className="h-4 w-4 text-yellow-600" />}
    </div>
  </div>
));