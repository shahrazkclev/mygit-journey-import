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
import { Settings, Clock, Zap, AlertCircle, ChevronDown, ChevronRight, Bot } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const CampaignSettings = () => {
  const { user } = useAuth();
  const [aiInstructions, setAiInstructions] = useState("");
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [isSavingAi, setIsSavingAi] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('ai_instructions')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
        return;
      }

      if (data) {
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


  const handleSaveAiInstructions = async () => {
    if (!aiInstructions.trim()) {
      toast.error("AI instructions cannot be empty");
      return;
    }

    setIsSavingAi(true);
    try {
      const settingsData = {
        user_id: user?.id,
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


  return (
    <div className="space-y-8">
      {/* AI Instructions */}
      <Card className="border border-border/50 shadow-sm rounded-2xl">
        <CardHeader className="p-6">
          <CardTitle className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-semibold">AI Email Generation Instructions</span>
          </CardTitle>
          <CardDescription className="text-sm">
            Customize how the AI generates email content. These instructions guide the AI's writing style and structure.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
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

          <div className="flex gap-3 pt-2">
            <Button 
              onClick={resetToDefaults}
              variant="outline"
              className="rounded-xl"
            >
              Reset to Defaults
            </Button>
            <Button 
              onClick={handleSaveAiInstructions}
              disabled={isSavingAi}
              className="rounded-xl"
            >
              {isSavingAi ? "Saving..." : "Save AI Instructions"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};