import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings, Clock, Zap, Link, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_USER_ID } from "@/lib/demo-auth";

export const CampaignSettings = () => {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [sendingSpeed, setSendingSpeed] = useState([50]);
  const [batchSize, setBatchSize] = useState([10]);
  const [delayBetweenBatches, setDelayBetweenBatches] = useState([5]);
  const [enableRetries, setEnableRetries] = useState(true);
  const [maxRetries, setMaxRetries] = useState([3]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // For now, we'll just use local storage until the types are updated
    try {
      const savedSettings = localStorage.getItem('campaign_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setWebhookUrl(settings.webhook_url || "");
        setSendingSpeed([settings.sending_speed || 50]);
        setBatchSize([settings.batch_size || 10]);
        setDelayBetweenBatches([settings.delay_between_batches || 5]);
        setEnableRetries(settings.enable_retries !== false);
        setMaxRetries([settings.max_retries || 3]);
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
      const settings = {
        user_id: DEMO_USER_ID,
        webhook_url: webhookUrl,
        sending_speed: sendingSpeed[0],
        batch_size: batchSize[0],
        delay_between_batches: delayBetweenBatches[0],
        enable_retries: enableRetries,
        max_retries: maxRetries[0],
        updated_at: new Date().toISOString()
      };

      // Save to localStorage for now
      localStorage.setItem('campaign_settings', JSON.stringify(settings));

      toast.success("Campaign settings saved successfully!");
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestWebhook = () => {
    if (!webhookUrl.trim()) {
      toast.error("Please enter webhook URL first");
      return;
    }
    // Simulate webhook test
    toast.info("Webhook testing requires Supabase backend integration");
  };

  return (
    <div className="space-y-6">
      {/* Make.com Integration */}
      <Card className="shadow-soft border-email-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Link className="h-5 w-5 text-email-primary" />
            <span>Make.com Integration</span>
          </CardTitle>
          <CardDescription>
            Connect your Make.com webhook to send emails through your preferred service
          </CardDescription>
        </CardHeader>
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
              variant="outline"
              className="border-email-secondary hover:bg-email-secondary"
            >
              <Zap className="h-4 w-4 mr-2" />
              Test Connection
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
      </Card>

      {/* Sending Speed Control */}
      <Card className="shadow-soft border-email-secondary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-email-secondary" />
            <span>Sending Patterns</span>
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
        </CardContent>
      </Card>

      {/* Advanced Options */}
      <Card className="shadow-soft border-email-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-email-accent" />
            <span>Advanced Options</span>
          </CardTitle>
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