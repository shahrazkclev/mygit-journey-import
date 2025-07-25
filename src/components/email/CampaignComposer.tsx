import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Sparkles, Send, Eye, Wand2, MessageSquare, Palette } from "lucide-react";
import { toast } from "sonner";

export const CampaignComposer = () => {
  const [subject, setSubject] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generatedTemplate, setGeneratedTemplate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedList, setSelectedList] = useState("");
  const [isEditingWithAI, setIsEditingWithAI] = useState(false);
  const [aiEditPrompt, setAiEditPrompt] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [senderCycleCount, setSenderCycleCount] = useState([10]);
  const [currentEmailCount, setCurrentEmailCount] = useState(0);
  
  // Theme colors
  const [primaryColor, setPrimaryColor] = useState("#684cff");
  const [secondaryColor, setSecondaryColor] = useState("#22d3ee");
  const [accentColor, setAccentColor] = useState("#34d399");

  const handleGenerateTemplate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt for your email");
      return;
    }

    setIsGenerating(true);
    
    // Simulate AI generation (replace with actual Claude API call)
    setTimeout(() => {
      const template = `
        <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #f8f6ff, #e8f4f8); margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(104, 76, 255, 0.1); }
              .header { background: linear-gradient(135deg, #ddd6fe, #bae6fd); padding: 40px 30px; text-align: center; }
              .content { padding: 30px; line-height: 1.6; color: #374151; }
              .footer { background: #f9fafb; padding: 20px 30px; text-align: center; font-size: 12px; color: #6b7280; }
              .cta { background: linear-gradient(135deg, #ddd6fe, #a7f3d0); color: #1f2937; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; color: #1f2937; font-size: 28px;">Hello {{name}}!</h1>
              </div>
              <div class="content">
                <p>We hope this message finds you well. Based on your prompt: "${prompt}"</p>
                <p>This is a beautifully crafted email template that follows your style guide. It's designed to be engaging, personal, and effective.</p>
                <a href="#" class="cta">Take Action Now</a>
                <p>Thank you for being part of our community!</p>
              </div>
              <div class="footer">
                <p>You received this email because you subscribed to our updates.</p>
                <a href="{{unsubscribe_url}}" style="color: #6b7280;">Unsubscribe</a>
              </div>
            </div>
          </body>
        </html>
      `;
      setGeneratedTemplate(template);
      setIsGenerating(false);
      toast.success("Email template generated successfully!");
    }, 2000);
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

  const handleSendCampaign = () => {
    if (!generatedTemplate || !selectedList) {
      toast.error("Please generate a template and select an email list");
      return;
    }
    
    const senderNumber = getCurrentSenderNumber();
    setCurrentEmailCount(prev => prev + 1);
    
    // Example webhook payload
    const webhookData = {
      emailSender: senderNumber,
      subject: subject,
      htmlContent: generatedTemplate,
      emailTitle: subject,
      timestamp: new Date().toISOString(),
      list: selectedList
    };
    
    console.log("Webhook payload:", webhookData);
    toast.info(`Campaign setup ready! Using email sender ${senderNumber}. Connect Supabase to enable sending via Make.com webhook`);
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
          <Label htmlFor="list">Email List</Label>
          <select 
            className="w-full px-3 py-2 border border-email-primary/30 rounded-md focus:border-email-primary focus:outline-none focus:ring-2 focus:ring-email-primary/20"
            value={selectedList}
            onChange={(e) => setSelectedList(e.target.value)}
          >
            <option value="">Select a list...</option>
            <option value="newsletter">Newsletter Subscribers</option>
            <option value="customers">Customer List</option>
            <option value="prospects">Prospects</option>
          </select>
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
            <span>Theme Colors</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-8 rounded border"
                />
                <span className="text-sm text-muted-foreground">{primaryColor}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Secondary Color</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-12 h-8 rounded border"
                />
                <span className="text-sm text-muted-foreground">{secondaryColor}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accent Color</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-12 h-8 rounded border"
                />
                <span className="text-sm text-muted-foreground">{accentColor}</span>
              </div>
            </div>
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