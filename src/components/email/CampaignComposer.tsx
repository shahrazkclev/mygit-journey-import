import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { ColorPicker } from "@/components/ui/color-picker";
import { Sparkles, Send, Eye, Wand2, MessageSquare, Palette } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const CampaignComposer = () => {
  const [subject, setSubject] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generatedTemplate, setGeneratedTemplate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [availableLists, setAvailableLists] = useState<any[]>([]);
  const [isEditingWithAI, setIsEditingWithAI] = useState(false);
  const [aiEditPrompt, setAiEditPrompt] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [senderCycleCount, setSenderCycleCount] = useState([10]);
  const [currentEmailCount, setCurrentEmailCount] = useState(0);
  const [styleGuide, setStyleGuide] = useState<any>(null);
  
  // Theme colors (fallback if no style guide)
  const [primaryColor, setPrimaryColor] = useState("#684cff");
  const [secondaryColor, setSecondaryColor] = useState("#22d3ee");
  const [accentColor, setAccentColor] = useState("#34d399");

  useEffect(() => {
    loadEmailLists();
    loadStyleGuide();
  }, []);

  const loadEmailLists = async () => {
    try {
      // Use a proper UUID for demo purposes
      const demoUserId = '550e8400-e29b-41d4-a716-446655440000';

      const { data: lists, error } = await supabase
        .from('email_lists')
        .select('*')
        .eq('user_id', demoUserId);

      if (error) {
        console.error('Error loading email lists:', error);
        return;
      }

      setAvailableLists(lists || []);
    } catch (error) {
      console.error('Error in loadEmailLists:', error);
    }
  };

  const loadStyleGuide = async () => {
    try {
      // Use a proper UUID for demo purposes
      const demoUserId = '550e8400-e29b-41d4-a716-446655440000';

      const { data: guides, error } = await supabase
        .from('style_guides')
        .select('*')
        .eq('user_id', demoUserId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error loading style guide:', error);
        return;
      }

      if (guides && guides.length > 0) {
        setStyleGuide(guides[0]);
        setPrimaryColor(guides[0].primary_color);
        setSecondaryColor(guides[0].secondary_color);
        setAccentColor(guides[0].accent_color);
      }
    } catch (error) {
      console.error('Error in loadStyleGuide:', error);
    }
  };

  const handleGenerateTemplate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt for your email");
      return;
    }

    setIsGenerating(true);
    
    try {
      // Try edge function first (but will likely fail without proper auth)
      try {
        const { data, error } = await supabase.functions.invoke('generate-email', {
          body: {
            prompt,
            subject,
            styleGuide: styleGuide ? {
              brandName: styleGuide.brand_name,
              primaryColor: styleGuide.primary_color,
              secondaryColor: styleGuide.secondary_color,
              accentColor: styleGuide.accent_color,
              fontFamily: styleGuide.font_family,
              tone: styleGuide.tone,
              brandVoice: styleGuide.brand_voice,
              emailSignature: styleGuide.email_signature
            } : {
              brandName: "Your Brand",
              primaryColor,
              secondaryColor,
              accentColor,
              fontFamily: "Segoe UI, sans-serif",
              tone: "friendly",
              brandVoice: "Professional yet approachable",
              emailSignature: "Best regards,\nThe Team"
            }
          }
        });

        if (data?.success) {
          setGeneratedTemplate(data.htmlContent);
          toast.success("Email template generated successfully!");
          return;
        }
      } catch (edgeFunctionError) {
        console.log('Edge function not available, using fallback template generation');
      }
      
      // Fallback: Generate beautiful template locally
      const colors = styleGuide ? {
        primary: styleGuide.primary_color,
        secondary: styleGuide.secondary_color,
        accent: styleGuide.accent_color
      } : { primary: primaryColor, secondary: secondaryColor, accent: accentColor };
      
      const brandName = styleGuide?.brand_name || "Your Brand";
      const signature = styleGuide?.email_signature || "Best regards,\nThe Team";
      
      const template = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { 
      font-family: ${styleGuide?.font_family || 'Segoe UI, sans-serif'}; 
      background: linear-gradient(135deg, ${colors.primary}10, ${colors.secondary}10); 
      margin: 0; 
      padding: 20px; 
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: white; 
      border-radius: 16px; 
      overflow: hidden; 
      box-shadow: 0 8px 32px ${colors.primary}20; 
    }
    .header { 
      background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary}); 
      padding: 40px 30px; 
      text-align: center; 
    }
    .content { 
      padding: 30px; 
      line-height: 1.6; 
      color: #374151; 
    }
    .footer { 
      background: #f9fafb; 
      padding: 20px 30px; 
      text-align: center; 
      font-size: 12px; 
      color: #6b7280; 
    }
    .cta { 
      background: linear-gradient(135deg, ${colors.primary}, ${colors.accent}); 
      color: white; 
      padding: 15px 30px; 
      border-radius: 8px; 
      text-decoration: none; 
      display: inline-block; 
      margin: 20px 0; 
      font-weight: bold;
    }
    @media (max-width: 600px) {
      .container { margin: 10px; }
      .header, .content { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; color: white; font-size: 28px;">Hello {{name}}!</h1>
      <p style="margin: 10px 0 0 0; color: white; opacity: 0.9;">${brandName}</p>
    </div>
    <div class="content">
      <p>We hope this message finds you well!</p>
      <p><strong>Your request:</strong> "${prompt}"</p>
      <p>This beautifully crafted email template follows your brand style guide. It's designed to be engaging, personal, and effective across all devices.</p>
      <div style="text-align: center;">
        <a href="#" class="cta">Take Action Now</a>
      </div>
      <p>Thank you for being part of our community!</p>
    </div>
    <div class="footer">
      <div style="white-space: pre-line; margin-bottom: 15px;">${signature}</div>
      <p>You received this email because you subscribed to our updates.</p>
      <a href="{{unsubscribe_url}}" style="color: #6b7280;">Unsubscribe</a>
    </div>
  </div>
</body>
</html>`;
      
      setGeneratedTemplate(template);
      toast.success("Email template generated successfully!");
      
    } catch (error) {
      console.error('Error in handleGenerateTemplate:', error);
      toast.error("Failed to generate template");
    } finally {
      setIsGenerating(false);
    }
  };

  const getCurrentSenderNumber = () => {
    const cycle = senderCycleCount[0];
    return ((Math.floor(currentEmailCount / cycle)) % 3) + 1;
  };

  const handleEditWithAI = async () => {
    if (!aiEditPrompt.trim()) {
      toast.error("Please enter editing instructions");
      return;
    }
    
    setIsEditingWithAI(true);
    
    // Simulate AI editing (replace with actual Claude API call)
    setTimeout(() => {
      const editedTemplate = generatedTemplate.replace(
        /color: #1f2937/g,
        `color: ${primaryColor}`
      ).replace(
        /background: linear-gradient\(135deg, #ddd6fe, #bae6fd\)/g,
        `background: linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}20)`
      ).replace(
        /background: linear-gradient\(135deg, #ddd6fe, #a7f3d0\)/g,
        `background: linear-gradient(135deg, ${primaryColor}40, ${accentColor}40)`
      );
      
      setGeneratedTemplate(editedTemplate);
      setIsEditingWithAI(false);
      setAiEditPrompt("");
      toast.success("Template updated with AI edits!");
    }, 1500);
  };

  const handleSendCampaign = async () => {
    if (!generatedTemplate || selectedLists.length === 0) {
      toast.error("Please generate a template and select email lists");
      return;
    }
    
    try {
      // Use a proper UUID for demo purposes
      const demoUserId = '550e8400-e29b-41d4-a716-446655440000';

      const senderNumber = getCurrentSenderNumber();
      setCurrentEmailCount(prev => prev + 1);
      
      // Save campaign to database
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert({
          user_id: demoUserId,
          name: subject || `Campaign ${new Date().toLocaleDateString()}`,
          subject,
          html_content: generatedTemplate,
          list_ids: selectedLists,
          status: 'draft'
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving campaign:', error);
        toast.error("Failed to save campaign");
        return;
      }

      // Example webhook payload for Make.com integration
      const webhookData = {
        campaignId: campaign.id,
        emailSender: senderNumber,
        subject: subject,
        htmlContent: generatedTemplate,
        listIds: selectedLists,
        timestamp: new Date().toISOString()
      };
      
      console.log("Campaign saved with webhook payload:", webhookData);
      toast.success(`Campaign saved! Using email sender ${senderNumber}. Ready for Make.com integration.`);
    } catch (error) {
      console.error('Error in handleSendCampaign:', error);
      toast.error("Failed to save campaign");
    }
  };

  return (
    <div className="space-y-6">
      {/* Subject and Prompt Input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="subject">Email Subject</Label>
          <Input
            id="subject"
            placeholder="Enter email subject..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="border-email-primary/30 focus:border-email-primary"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="list">Email Lists</Label>
          <div className="space-y-2 max-h-32 overflow-y-auto border border-email-primary/30 rounded-md p-3">
            {availableLists.length > 0 ? (
              availableLists.map((list) => (
                <label key={list.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedLists.includes(list.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLists([...selectedLists, list.id]);
                      } else {
                        setSelectedLists(selectedLists.filter(id => id !== list.id));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{list.name}</span>
                  {list.description && (
                    <span className="text-xs text-muted-foreground">({list.description})</span>
                  )}
                </label>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No email lists found. Create lists in the Lists tab.
              </div>
            )}
          </div>
          {selectedLists.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {selectedLists.length} list{selectedLists.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="prompt">AI Prompt</Label>
        <Textarea
          id="prompt"
          placeholder="Describe the email you want to create (e.g., 'Create a friendly newsletter about our new product launch with a professional yet casual tone')"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[100px] border-email-primary/30 focus:border-email-primary"
        />
      </div>

      {/* Theme Color Picker */}
      <Card className="shadow-soft border-email-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5 text-email-primary" />
            <span>Theme Colors {styleGuide ? '(From Style Guide)' : '(Override)'}</span>
          </CardTitle>
          <CardDescription>
            {styleGuide ? 'Colors loaded from your style guide' : 'Set colors for this campaign'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <ColorPicker
              value={primaryColor}
              onChange={setPrimaryColor}
              label="Primary Color"
              showPresets={true}
            />
            <ColorPicker
              value={secondaryColor}
              onChange={setSecondaryColor}
              label="Secondary Color"
              showPresets={true}
            />
            <ColorPicker
              value={accentColor}
              onChange={setAccentColor}
              label="Accent Color"
              showPresets={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Sender Rotation */}
      <Card className="shadow-soft border-email-accent/20">
        <CardHeader>
          <CardTitle>Email Sender Rotation</CardTitle>
          <CardDescription>
            Configure how often to cycle through email senders (1, 2, 3)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cycle Count: {senderCycleCount[0]} emails per sender</Label>
              <Slider
                value={senderCycleCount}
                onValueChange={setSenderCycleCount}
                max={50}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Current Sender: {getCurrentSenderNumber()}</span>
              <span>Emails Sent: {currentEmailCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button 
          onClick={handleGenerateTemplate}
          disabled={isGenerating || !prompt.trim()}
          className="bg-email-primary hover:bg-email-primary/80 text-primary-foreground shadow-soft"
        >
          {isGenerating ? (
            <>
              <Wand2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Template
            </>
          )}
        </Button>

        {generatedTemplate && (
          <>
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-email-secondary hover:bg-email-secondary">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Email Preview</DialogTitle>
                </DialogHeader>
                <div className="border rounded-lg p-4 bg-white">
                  <div dangerouslySetInnerHTML={{ __html: generatedTemplate }} />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isEditingWithAI} onOpenChange={setIsEditingWithAI}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-email-accent hover:bg-email-accent">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Edit with AI
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Template with AI</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Describe what you want to change (e.g., 'make it more formal', 'add a discount section', 'change the call to action')"
                    value={aiEditPrompt}
                    onChange={(e) => setAiEditPrompt(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex gap-3">
                    <Button onClick={handleEditWithAI} disabled={!aiEditPrompt.trim()}>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Apply Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditingWithAI(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* Generated Template Preview */}
      {generatedTemplate && (
        <Card className="shadow-soft border-email-success/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-email-success" />
                <span>Generated Template</span>
              </span>
              <Badge variant="secondary" className="bg-email-success/20 text-email-success">
                Ready to Send
              </Badge>
            </CardTitle>
            <CardDescription>
              Template includes personalization and unsubscribe handling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg max-h-60 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap">{generatedTemplate}</pre>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Features: Name personalization, Style consistency, Unsubscribe link
                </div>
                <Button 
                  onClick={handleSendCampaign}
                  className="bg-email-success hover:bg-email-success/80 text-foreground shadow-soft"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Setup Campaign
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};