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
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('webhook_url')
        .eq('user_id', DEMO_USER_ID)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
        return;
      }

      if (data) {
        setWebhookUrl(data.webhook_url || "");
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
        webhook_url: webhookUrl
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

      toast.success("Webhook URL saved successfully!");
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
      {/* Make.com Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Link className="h-5 w-5" />
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
            />
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={handleTestWebhook}
              disabled={isTestingWebhook}
              variant="outline"
            >
              <Zap className="h-4 w-4 mr-2" />
              {isTestingWebhook ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button 
              onClick={handleSaveSettings}
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};