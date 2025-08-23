import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Settings, Clock, Zap, Link, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_USER_ID } from "@/lib/demo-auth";

export const CampaignSettings = () => {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [sendingSpeed, setSendingSpeed] = useState([50]);
  const [batchSize, setBatchSize] = useState([10]);
  const [delayBetweenBatches, setDelayBetweenBatches] = useState([5]);
  const [delayBetweenEmails, setDelayBetweenEmails] = useState([2]);
  const [enableRetries, setEnableRetries] = useState(true);
  const [maxRetries, setMaxRetries] = useState([3]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMakeIntegrationOpen, setIsMakeIntegrationOpen] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  
  // Sender rotation settings
  const [emailsPerSender, setEmailsPerSender] = useState(50);
  const [maxSenderSequence, setMaxSenderSequence] = useState(3);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
        return;
      }

      if (data) {
        setWebhookUrl(data.webhook_url || "");
        setSendingSpeed([data.sending_speed || 50]);
        setBatchSize([data.batch_size || 10]);
        setDelayBetweenBatches([data.delay_between_batches || 5]);
        setDelayBetweenEmails([data.delay_between_emails || 2]);
        setEnableRetries(data.enable_retries !== false);
        setMaxRetries([data.max_retries || 3]);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!webhookUrl.trim()) {
      toast.error("Please enter your Make.com webhook URL");
      return;
    }

    setIsLoading(true);
    try {
      const settingsData = {
        user_id: DEMO_USER_ID,
        webhook_url: webhookUrl,
        sending_speed: sendingSpeed[0],
        batch_size: batchSize[0],
        delay_between_batches: delayBetweenBatches[0],
        delay_between_emails: delayBetweenEmails[0],
        enable_retries: enableRetries,
        max_retries: maxRetries[0],
        emails_per_sender: emailsPerSender,
        max_sender_sequence: maxSenderSequence
      };

      const { error } = await supabase
        .from('user_settings')
        .upsert(settingsData, { 
          onConflict: 'user_id' 
        });

      if (error) {
        console.error('Error saving settings:', error);
        toast.error("Failed to save settings. Please try again.");
        return;
      }

      toast.success("Campaign settings saved successfully!");
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast.error('Please enter a webhook URL first');
      return;
    }

    setIsTestingWebhook(true);

    try {
      const testPayload = {
        to: "test@example.com",
        name: "Test User",
        subject: "Webhook Test Email",
        html: "<h1>This is a test email from your Email Campaign Manager</h1><p>If you receive this, your webhook is working correctly!</p>",
        timestamp: new Date().toISOString(),
        test: true
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        toast.success(`Webhook test successful! Response: ${response.status}`);
      } else {
        toast.error(`Webhook test failed: ${response.status} - ${response.statusText}`);
      }

    } catch (error: any) {
      console.error('Webhook test error:', error);
      toast.error(`Webhook test failed: ${error.message}`);
    } finally {
      setIsTestingWebhook(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sender Rotation Settings */}
      <Card className="shadow-soft bg-gradient-to-br from-email-background to-background border-email-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-email-accent" />
            <span className="text-email-accent">Sender Rotation</span>
          </CardTitle>
          <CardDescription>
            Control how sender sequence numbers rotate to use different email addresses in Make.com
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emails-per-sender">Emails per Sender Sequence</Label>
              <Input
                id="emails-per-sender"
                type="number"
                min="1"
                max="1000"
                value={emailsPerSender}
                onChange={(e) => setEmailsPerSender(parseInt(e.target.value) || 50)}
                className="border-email-primary/30 focus:border-email-primary"
              />
              <p className="text-xs text-muted-foreground">
                How many emails to send before switching to next sequence number
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max-sequence">Max Sender Sequence</Label>
              <Input
                id="max-sequence"
                type="number"
                min="1"
                max="10"
                value={maxSenderSequence}
                onChange={(e) => setMaxSenderSequence(parseInt(e.target.value) || 3)}
                className="border-email-primary/30 focus:border-email-primary"
              />
              <p className="text-xs text-muted-foreground">
                Highest sequence number before rolling back to 1
              </p>
            </div>
          </div>
          
          <div className="bg-email-muted/30 p-4 rounded-lg border border-email-primary/10">
            <h4 className="font-medium text-email-primary mb-2">Rotation Example:</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Emails 1-{emailsPerSender}: Sender Sequence = 1</p>
              <p>• Emails {emailsPerSender + 1}-{emailsPerSender * 2}: Sender Sequence = 2</p>
              <p>• Emails {emailsPerSender * 2 + 1}-{emailsPerSender * 3}: Sender Sequence = 3</p>
              {maxSenderSequence > 3 && <p>• ... (continues to {maxSenderSequence})</p>}
              <p>• Then rolls back to Sequence 1</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Make.com Integration */}
      <Card className="shadow-soft border-email-primary/20 bg-gradient-to-br from-email-background to-background">
        <Collapsible open={isMakeIntegrationOpen} onOpenChange={setIsMakeIntegrationOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-email-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Link className="h-5 w-5 text-email-primary" />
                  <span className="text-email-primary">Make.com Integration</span>
                </div>
                {isMakeIntegrationOpen ? (
                  <ChevronDown className="h-4 w-4 text-email-primary" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-email-primary" />
                )}
              </CardTitle>
              <CardDescription>
                Connect your Make.com webhook to send emails through your preferred service
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook">Webhook URL</Label>
                <Input
                  id="webhook"
                  placeholder="https://hook.eu1.make.com/your-webhook-url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="border-email-primary/30 focus:border-email-primary"
                />
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={handleTestWebhook}
                  disabled={isTestingWebhook}
                  variant="outline"
                  className="border-email-secondary hover:bg-email-secondary/10 text-email-secondary"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {isTestingWebhook ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button 
                  onClick={handleSaveSettings}
                  disabled={isLoading}
                  className="bg-email-primary hover:bg-email-primary/80 text-primary-foreground"
                >
                  {isLoading ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Sending Speed Control */}
      <Card className="shadow-soft bg-gradient-to-br from-email-background to-background border-email-secondary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-email-secondary" />
            <span className="text-email-secondary">Sending Patterns</span>
          </CardTitle>
          <CardDescription>
            Control how your emails are sent to avoid being marked as spam
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Sending Speed</Label>
              <Badge variant="outline" className="border-email-secondary text-email-secondary">
                {sendingSpeed[0]} emails/hour
              </Badge>
            </div>
            <Slider
              value={sendingSpeed}
              onValueChange={setSendingSpeed}
              max={500}
              min={10}
              step={10}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 50-100 emails per hour for best deliverability
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Batch Size</Label>
              <Badge variant="outline" className="border-email-accent text-email-accent">
                {batchSize[0]} emails per batch
              </Badge>
            </div>
            <Slider
              value={batchSize}
              onValueChange={setBatchSize}
              max={50}
              min={1}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Delay Between Batches</Label>
              <Badge variant="outline" className="border-email-warning text-email-warning">
                {delayBetweenBatches[0]} minutes
              </Badge>
            </div>
            <Slider
              value={delayBetweenBatches}
              onValueChange={setDelayBetweenBatches}
              max={60}
              min={1}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Delay Between Individual Emails</Label>
              <Badge variant="outline" className="border-primary text-primary">
                {delayBetweenEmails[0]} seconds
              </Badge>
            </div>
            <Slider
              value={delayBetweenEmails}
              onValueChange={setDelayBetweenEmails}
              max={30}
              min={1}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Time to wait between sending individual emails for better deliverability
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Options */}
      <Card className="shadow-soft bg-gradient-to-br from-email-background to-background border-email-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-email-accent" />
            <span className="text-email-accent">Advanced Options</span>
          </CardTitle>
          <CardDescription>
            Advanced settings for handling failures and retries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Retry on Failure</Label>
              <p className="text-xs text-muted-foreground">
                Automatically retry failed email sends
              </p>
            </div>
            <Switch 
              checked={enableRetries} 
              onCheckedChange={setEnableRetries}
            />
          </div>

          {enableRetries && (
            <div className="space-y-3 pl-4 border-l-2 border-email-accent/20">
              <div className="flex items-center justify-between">
                <Label>Maximum Retries</Label>
                <Badge variant="outline" className="border-email-accent text-email-accent">
                  {maxRetries[0]} attempts
                </Badge>
              </div>
              <Slider
                value={maxRetries}
                onValueChange={setMaxRetries}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
          )}

          <div className="bg-email-warning/10 p-4 rounded-lg border border-email-warning/20">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-email-warning mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-email-warning">Deliverability Tips</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Keep sending speed moderate to avoid spam filters</li>
                  <li>• Use authentic sender domains</li>
                  <li>• Include proper unsubscribe links</li>
                  <li>• Monitor bounce rates and unsubscribes</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};