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
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Send, Eye, Wand2, MessageSquare, Palette, Monitor, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const CampaignComposer = () => {
  const [subject, setSubject] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generatedTemplate, setGeneratedTemplate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [emailLists, setEmailLists] = useState<any[]>([]);
  const [isEditingWithAI, setIsEditingWithAI] = useState(false);
  const [aiEditPrompt, setAiEditPrompt] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [senderCycleCount, setSenderCycleCount] = useState([10]);
  const [currentEmailCount, setCurrentEmailCount] = useState(0);
  const [styleGuide, setStyleGuide] = useState<any>(null);
  
  // Theme colors (can override style guide colors)
  const [themeColors, setThemeColors] = useState({
    primary: "#684cff",
    secondary: "#22d3ee",
    accent: "#34d399"
  });
  
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  const { toast } = useToast();

  useEffect(() => {
    loadEmailLists();
    loadStyleGuide();
  }, []);

  const loadEmailLists = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('email_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmailLists(data || []);
    } catch (error) {
      console.error('Error loading email lists:', error);
    }
  };

  const loadStyleGuide = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('style_guides')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const guide = data[0];
        setStyleGuide(guide);
        setThemeColors({
          primary: guide.primary_color,
          secondary: guide.secondary_color,
          accent: guide.accent_color,
        });
      }
    } catch (error) {
      console.error('Error loading style guide:', error);
    }
  };

  const handleGenerateTemplate = async () => {
    if (!subject.trim() || !prompt.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a subject and prompt for the email.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-email', {
        body: {
          prompt: prompt,
          subject: subject,
          styleGuide: styleGuide ? {
            brandName: styleGuide.brand_name,
            primaryColor: themeColors.primary,
            secondaryColor: themeColors.secondary,
            accentColor: themeColors.accent,
            fontFamily: styleGuide.font_family,
            tone: styleGuide.tone,
            brandVoice: styleGuide.brand_voice,
            logoUrl: styleGuide.logo_url,
            emailSignature: styleGuide.email_signature,
          } : {
            brandName: "Your Brand",
            primaryColor: themeColors.primary,
            secondaryColor: themeColors.secondary,
            accentColor: themeColors.accent,
            fontFamily: "Segoe UI, sans-serif",
            tone: "friendly",
            brandVoice: "Professional yet approachable",
            logoUrl: "",
            emailSignature: "Best regards,\nThe Team",
          }
        }
      });

      if (error) throw error;

      if (data?.htmlContent) {
        setGeneratedTemplate(data.htmlContent);
        toast({
          title: "Template Generated",
          description: "Your email template has been generated successfully!",
        });
      } else {
        throw new Error("No content received from AI generator");
      }
    } catch (error) {
      console.error('Error generating template:', error);
      
      // Fallback HTML generation
      const fallbackHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
            <style>
              body { 
                font-family: ${styleGuide?.font_family || 'Segoe UI, sans-serif'}; 
                margin: 0; 
                padding: 20px; 
                background-color: #f5f5f5; 
              }
              .container { 
                max-width: 600px; 
                margin: 0 auto; 
                background: white; 
                border-radius: 8px; 
                overflow: hidden; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
              }
              .header { 
                background: ${themeColors.primary}; 
                color: white; 
                padding: 30px; 
                text-align: center; 
              }
              .content { 
                padding: 30px; 
                line-height: 1.6; 
              }
              .button { 
                display: inline-block; 
                background: ${themeColors.accent}; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 6px; 
                margin: 20px 0; 
              }
              .footer { 
                background: #f8f9fa; 
                padding: 20px; 
                text-align: center; 
                border-top: 1px solid #e9ecef; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${styleGuide?.brand_name || 'Your Brand'}</h1>
                <h2>${subject}</h2>
              </div>
              <div class="content">
                <p>Dear Valued Customer,</p>
                <p>${prompt}</p>
                <p>We hope this message finds you well and we look forward to serving you better.</p>
                <a href="#" class="button">Take Action</a>
              </div>
              <div class="footer">
                <pre>${styleGuide?.email_signature || 'Best regards,\\nThe Team'}</pre>
              </div>
            </div>
          </body>
        </html>
      `;
      
      setGeneratedTemplate(fallbackHTML);
      toast({
        title: "Template Generated",
        description: "Used fallback template generator. Your email is ready!",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getCurrentSenderNumber = () => {
    const cycleSize = senderCycleCount[0];
    return Math.floor(currentEmailCount / cycleSize) % 3 + 1; // Assuming 3 senders
  };

  const handleEditWithAI = async () => {
    if (!aiEditPrompt.trim() || !generatedTemplate) {
      toast({
        title: "Missing Information", 
        description: "Please provide editing instructions and ensure you have a generated template.",
        variant: "destructive",
      });
      return;
    }

    setIsEditingWithAI(true);

    try {
      // Simulate AI editing - in a real app, this would call an AI service
      toast({
        title: "AI Edit Applied",
        description: `Applied edit: "${aiEditPrompt}". This is a simulation - integrate with your preferred AI service.`,
      });
      setAiEditPrompt("");
    } catch (error) {
      console.error('Error editing with AI:', error);
      toast({
        title: "Edit Failed",
        description: "Failed to apply AI edits. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEditingWithAI(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!subject.trim() || !generatedTemplate || selectedLists.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please ensure you have a subject, generated template, and selected email lists.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to save campaigns.",
          variant: "destructive",
        });
        return;
      }

      // Calculate current sender number
      const senderNumber = getCurrentSenderNumber();
      
      // Save campaign to database
      const { data, error } = await supabase
        .from('campaigns')
        .insert([
          {
            user_id: user.id,
            name: `Campaign: ${subject}`,
            subject: subject,
            html_content: generatedTemplate,
            list_ids: selectedLists,
            status: 'draft',
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Generate webhook payload for Make.com integration
      const webhookPayload = {
        campaign_id: data.id,
        subject: subject,
        html_content: generatedTemplate,
        list_ids: selectedLists,
        sender_number: senderNumber,
        theme_colors: themeColors,
        created_at: new Date().toISOString(),
      };

      toast({
        title: "Campaign Saved",
        description: `Your campaign "${subject}" has been saved and is ready for sending.`,
      });

      // Reset form
      setSubject("");
      setPrompt("");
      setGeneratedTemplate("");
      setSelectedLists([]);

    } catch (error) {
      console.error('Error saving campaign:', error);
      toast({
        title: "Error",
        description: "Failed to save campaign. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleListSelection = (listId: string) => {
    setSelectedLists(prev => 
      prev.includes(listId) 
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Email Content Form */}
      <Card>
        <CardHeader>
          <CardTitle>Email Content</CardTitle>
          <CardDescription>
            Create your email campaign with AI assistance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter your email subject line..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">AI Prompt</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the email you want to create (e.g., 'Write a promotional email about our new product launch with a 20% discount offer')"
              rows={4}
            />
          </div>

          <Button 
            onClick={handleGenerateTemplate}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Email Template
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Email Lists Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Target Email Lists</CardTitle>
          <CardDescription>
            Select which email lists to send this campaign to
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailLists.length === 0 ? (
            <p className="text-muted-foreground">
              No email lists found. Create some email lists in the Lists tab first.
            </p>
          ) : (
            <div className="space-y-2">
              {emailLists.map(list => (
                <div key={list.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={list.id}
                    checked={selectedLists.includes(list.id)}
                    onCheckedChange={() => toggleListSelection(list.id)}
                  />
                  <Label htmlFor={list.id} className="flex-1">
                    {list.name}
                    {list.description && (
                      <span className="text-muted-foreground text-sm ml-2">
                        - {list.description}
                      </span>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Theme Colors Override */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5" />
            <span>Campaign Theme Colors</span>
          </CardTitle>
          <CardDescription>
            Override brand colors for this specific campaign (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <ColorPicker
                value={themeColors.primary}
                onChange={(color) => setThemeColors({...themeColors, primary: color})}
                label="Primary"
              />
            </div>
            <div className="space-y-2">
              <Label>Secondary Color</Label>
              <ColorPicker
                value={themeColors.secondary}
                onChange={(color) => setThemeColors({...themeColors, secondary: color})}
                label="Secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>Accent Color</Label>
              <ColorPicker
                value={themeColors.accent}
                onChange={(color) => setThemeColors({...themeColors, accent: color})}
                label="Accent"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sender Rotation */}
      <Card>
        <CardHeader>
          <CardTitle>Email Sender Rotation</CardTitle>
          <CardDescription>
            Configure how many emails each sender handles before rotating
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Cycle Count: {senderCycleCount[0]} emails per sender</Label>
            <Slider
              value={senderCycleCount}
              onValueChange={setSenderCycleCount}
              max={50}
              min={5}
              step={5}
              className="w-full"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Current sender: Sender {getCurrentSenderNumber()} (sent {currentEmailCount} emails)
          </div>
        </CardContent>
      </Card>

      {/* Generated Template Preview */}
      {generatedTemplate && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Generated Email Template</CardTitle>
                <CardDescription>
                  Preview and edit your AI-generated email
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'desktop' ? 'mobile' : 'desktop')}
                >
                  {viewMode === 'desktop' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                  {viewMode === 'desktop' ? 'Mobile' : 'Desktop'}
                </Button>
                <Dialog open={showPreview} onOpenChange={setShowPreview}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Full Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                    <DialogHeader>
                      <DialogTitle>Email Preview</DialogTitle>
                    </DialogHeader>
                    <div dangerouslySetInnerHTML={{ __html: generatedTemplate }} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div 
              className={`border rounded-lg overflow-hidden bg-white ${
                viewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
              }`}
            >
              <div 
                dangerouslySetInnerHTML={{ __html: generatedTemplate }}
                className="min-h-[200px]"
              />
            </div>

            {/* AI Edit Controls */}
            <div className="mt-4 space-y-2">
              <Label htmlFor="aiEdit">Edit with AI</Label>
              <div className="flex space-x-2">
                <Input
                  id="aiEdit"
                  value={aiEditPrompt}
                  onChange={(e) => setAiEditPrompt(e.target.value)}
                  placeholder="Describe changes you want to make..."
                  className="flex-1"
                />
                <Button
                  onClick={handleEditWithAI}
                  disabled={isEditingWithAI}
                  variant="outline"
                >
                  {isEditingWithAI ? (
                    <>
                      <Wand2 className="h-4 w-4 mr-2 animate-spin" />
                      Editing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Apply Edit
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Send Campaign */}
      {generatedTemplate && (
        <Card>
          <CardHeader>
            <CardTitle>Send Campaign</CardTitle>
            <CardDescription>
              Review and send your email campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Subject:</strong> {subject}
                </div>
                <div>
                  <strong>Selected Lists:</strong> {selectedLists.length}
                </div>
                <div>
                  <strong>Current Sender:</strong> Sender {getCurrentSenderNumber()}
                </div>
                <div>
                  <strong>Theme:</strong> 
                  <div className="flex space-x-1 mt-1">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: themeColors.primary }}
                    />
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: themeColors.secondary }}
                    />
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: themeColors.accent }}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSendCampaign} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Save & Setup Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};