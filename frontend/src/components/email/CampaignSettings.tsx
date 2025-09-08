import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Settings, Clock, Zap, Link, AlertCircle, ChevronDown, ChevronRight, Bot } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_USER_ID } from "@/lib/demo-auth";

export const CampaignSettings = () => {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [isSavingAi, setIsSavingAi] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('webhook_url, ai_instructions')
        .eq('user_id', DEMO_USER_ID)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
        return;
      }

      if (data) {
        setWebhookUrl(data.webhook_url || "");
        setAiInstructions(data.ai_instructions || getDefaultAiInstructions());
      } else {
        setAiInstructions(getDefaultAiInstructions());
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const getDefaultAiInstructions = () => {
    return `You are an expert email content creator. Create clean, professional email content that follows these guidelines:

1. STRUCTURE - Keep it simple and clean:
   - Start with "Hey {{name}}," as the greeting
   - Use minimal sections with proper spacing
   - Avoid excessive decorative elements or highlights
   - End with a signature section

2. CONTENT REQUIREMENTS:
   - Write in a professional yet friendly tone
   - Be specific and actionable
   - Include relevant details and clear calls-to-action
   - End with "Best regards," followed by the sender's name on a new line

3. STYLING - Keep it minimal and professional:
   - Use simple paragraph structure for most content
   - Only use <div class="content-section"> for main content blocks when absolutely needed
   - Use <a href="#" class="button"> only for actual call-to-action buttons
   - Avoid excessive highlighting or decorative containers

4. VISUAL ELEMENTS:
   - Use emojis very sparingly (0-1 per email maximum)
   - Create clean visual hierarchy with simple headers
   - Focus on readability over decoration

EXAMPLE CLEAN STRUCTURE:
Hey {{name}},

Thank you for your purchase!

Your order details and download instructions are provided below.

<a href="#" class="button">Download Files</a>

Best regards,
Your Name

Return ONLY the clean email content.`;
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

  const handleSaveAiInstructions = async () => {
    if (!aiInstructions.trim()) {
      toast.error("AI instructions cannot be empty");
      return;
    }

    setIsSavingAi(true);
    try {
      const settingsData = {
        user_id: DEMO_USER_ID,
        ai_instructions: aiInstructions
      };

      const { error } = await supabase
        .from('user_settings')
        .upsert(settingsData, { 
          onConflict: 'user_id' 
        });

      if (error) {
        console.error('Error saving AI instructions:', error);
        toast.error("Failed to save AI instructions. Please try again.");
        return;
      }

      toast.success("AI instructions saved successfully!");
    } catch (error) {
      console.error('Error saving AI instructions:', error);
      toast.error("Failed to save AI instructions. Please try again.");
    } finally {
      setIsSavingAi(false);
    }
  };

  const resetToDefaults = () => {
    setAiInstructions(getDefaultAiInstructions());
    toast.success("Reset to default AI instructions");
  };

  const generateFullPromptPreview = (subject = "Your Subject", prompt = "Your email content") => {
    return `${aiInstructions}

CONTENT REQUIREMENTS:
- Subject: "${subject}"
- Content: ${prompt}

Return ONLY the email content following the instructions above.`;
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

      {/* AI Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span>AI Email Generation Instructions</span>
          </CardTitle>
          <CardDescription>
            Customize how the AI generates email content. These instructions guide the AI's writing style and structure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-instructions">AI Instructions</Label>
            <Textarea
              id="ai-instructions"
              placeholder="Enter your custom AI instructions..."
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          </div>
          
          {/* Full Prompt Preview */}
          <Collapsible open={showFullPrompt} onOpenChange={setShowFullPrompt}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <span className="text-sm text-muted-foreground">
                  {showFullPrompt ? "Hide" : "Show"} Complete AI Prompt (What Claude Actually Sees)
                </span>
                {showFullPrompt ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-xs text-muted-foreground">COMPLETE PROMPT SENT TO CLAUDE:</Label>
                <pre className="text-xs whitespace-pre-wrap font-mono mt-2 max-h-60 overflow-y-auto">
                  {generateFullPromptPreview()}
                </pre>
              </div>
              <div className="text-xs text-muted-foreground">
                ⚠️ The AI gets your custom instructions above PLUS additional dynamic content requirements (subject, prompt) and formatting rules.
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex gap-3">
            <Button 
              onClick={resetToDefaults}
              variant="outline"
            >
              Reset to Defaults
            </Button>
            <Button 
              onClick={handleSaveAiInstructions}
              disabled={isSavingAi}
            >
              {isSavingAi ? "Saving..." : "Save AI Instructions"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};