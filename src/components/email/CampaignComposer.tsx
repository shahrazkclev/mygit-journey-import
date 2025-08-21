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
import { DEMO_USER_ID } from "@/lib/demo-auth";

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
  const [colorsInitialized, setColorsInitialized] = useState(false);

  const { toast } = useToast();

  const DRAFT_KEY = 'campaign_draft';

  // Load draft from localStorage on mount (before fetching lists/styles)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (typeof d.subject === 'string') setSubject(d.subject);
        if (typeof d.prompt === 'string') setPrompt(d.prompt);
        if (typeof d.generatedTemplate === 'string') setGeneratedTemplate(d.generatedTemplate);
        if (Array.isArray(d.selectedLists)) setSelectedLists(d.selectedLists);
        if (d.themeColors) { setThemeColors(d.themeColors); setColorsInitialized(true); }
      }
    } catch {}
  }, []);

  // Persist draft locally so switching tabs doesn't lose progress
  useEffect(() => {
    const draft = { subject, prompt, generatedTemplate, selectedLists, themeColors };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [subject, prompt, generatedTemplate, selectedLists, themeColors]);

  useEffect(() => {
    loadEmailLists();
    loadStyleGuide();
  }, []);

  const loadEmailLists = async () => {
    try {
      const { data, error } = await supabase
        .from('email_lists')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmailLists(data || []);
    } catch (error) {
      console.error('Error loading email lists:', error);
    }
  };

  const loadStyleGuide = async () => {
    try {
      const { data, error } = await supabase
        .from('style_guides')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const guide = data[0];
        setStyleGuide(guide);

        // Only initialize theme colors from style guide if not already set from draft/user
        let hasDraftColors = false;
        try {
          const raw = localStorage.getItem(DRAFT_KEY);
          if (raw) {
            const d = JSON.parse(raw);
            hasDraftColors = !!d?.themeColors;
          }
        } catch {}

        if (!colorsInitialized && !hasDraftColors) {
          setThemeColors({
            primary: guide.primary_color,
            secondary: guide.secondary_color,
            accent: guide.accent_color,
          });
          setColorsInitialized(true);
        }
      }
    } catch (error) {
      console.error('Error loading style guide:', error);
    }
  };

  // Clean code fences and extraneous markdown around returned HTML
  const cleanHtmlContent = (raw: string) => {
    try {
      let s = raw.trim();
      // Remove ```html ... ``` fences if present
      if (s.startsWith("```")) {
        s = s.replace(/^```[a-zA-Z]*\n?/i, "");
        s = s.replace(/```\s*$/i, "");
      }
      return s.trim();
    } catch {
      return raw;
    }
  };

  // Apply simple in-app edits without external AI
  const applyInstructionToHtml = (html: string, instruction: string) => {
    let out = html;
    const instr = instruction.toLowerCase();

    const injectOverride = (css: string) => {
      if (out.includes('</head>')) {
        out = out.replace('</head>', `<style id="lovable-overrides">${css}</style></head>`);
      } else {
        out = `<!DOCTYPE html><html><head><style id="lovable-overrides">${css}</style></head>` + out.replace(/^<!DOCTYPE[^>]*>/i, '').replace(/^<html[^>]*>/i, '').replace(/<\/html>$/i, '') + '</html>';
      }
    };

    // Background removal / neutralize
    if (instr.includes('background') || instr.includes('bg')) {
      // strip inline background styles on body
      out = out.replace(/<body([^>]*)style="([^"]*)"([^>]*)>/i, (_m, pre, style, post) => {
        const cleaned = style
          .replace(/background[^;]*;?/gi, '')
          .replace(/background-image[^;]*;?/gi, '')
          .trim();
        const newStyle = cleaned ? ` style="${cleaned}"` : '';
        return `<body${pre}${newStyle}${post}>`;
      });
      // add strong override
      injectOverride('body{background:#ffffff !important;background-image:none !important;} .container{background:#ffffff !important;}');
    }

    // Theme color nudge when user mentions color/theme
    if (instr.includes('color') || instr.includes('theme')) {
      injectOverride(`:root{--primary:${themeColors.primary};--secondary:${themeColors.secondary};--accent:${themeColors.accent}} .btn,.button{background:${themeColors.accent} !important;color:#fff !important}`);
    }

    return out;
  };

  // Apply color changes to template in real-time
  const applyColorChangesToTemplate = (primary: string, secondary: string, accent: string) => {
    if (!generatedTemplate) return;

    let updatedTemplate = generatedTemplate;
    
    // Replace color values in the HTML
    updatedTemplate = updatedTemplate
      .replace(/background:\s*linear-gradient\([^)]+\)/gi, `background: linear-gradient(135deg, ${primary}, ${secondary})`)
      .replace(/background-color:\s*#[0-9a-fA-F]{6}/gi, `background-color: ${primary}`)
      .replace(/background:\s*#[0-9a-fA-F]{6}/gi, `background: ${primary}`)
      .replace(/"Take Action"[^>]*style="[^"]*background-color:[^;"]*;?/gi, (match) => {
        return match.replace(/background-color:[^;"]*;?/gi, `background-color: ${accent};`);
      });

    // Update CSS custom properties if they exist
    if (updatedTemplate.includes(':root')) {
      updatedTemplate = updatedTemplate.replace(
        /:root\s*{[^}]*}/gi,
        `:root { --primary: ${primary}; --secondary: ${secondary}; --accent: ${accent}; }`
      );
    }

    setGeneratedTemplate(updatedTemplate);
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
          regenId: Date.now(),
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
        const cleaned = cleanHtmlContent(data.htmlContent);
        setGeneratedTemplate(cleaned);
        toast({
          title: "Template Generated",
          description: "Your email template has been generated successfully!",
        });
      } else {
        throw new Error("No content received from AI generator");
      }
    } catch (error) {
      console.error('Error generating template:', error);
      
      // Beautiful fallback HTML generation with modern design
      const fallbackHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                @media only screen and (max-width: 600px) {
                    .container { width: 100% !important; margin: 10px !important; }
                    .header { padding: 30px 20px !important; }
                    .content { padding: 30px 20px !important; }
                    .hero-title { font-size: 24px !important; }
                    .button { width: 90% !important; }
                }
            </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); min-height: 100vh;">
            <div style="padding: 30px 15px;">
                <table class="container" role="presentation" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; margin: 0 auto; background: #ffffff; border-radius: 20px; box-shadow: 0 25px 50px rgba(0,0,0,0.1); overflow: hidden;">
                    
                    <!-- Gradient Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%); padding: 0; height: 6px;"></td>
                    </tr>
                    
                    <!-- Hero Section -->
                    <tr>
                        <td class="header" style="background: linear-gradient(135deg, ${themeColors.primary}12 0%, ${themeColors.secondary}08 100%); padding: 50px 40px; text-align: center; position: relative;">
                            <div style="position: absolute; top: 20px; right: 30px; width: 32px; height: 32px; background: ${themeColors.accent}25; border-radius: 50%; opacity: 0.6;"></div>
                            
                            <h1 style="margin: 0 0 10px 0; color: #1e293b; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">${styleGuide?.brand_name || 'Your Brand'}</h1>
                            <div style="width: 60px; height: 3px; background: linear-gradient(90deg, ${themeColors.primary}, ${themeColors.accent}); margin: 16px auto; border-radius: 2px;"></div>
                            <h2 class="hero-title" style="margin: 20px 0 0 0; color: #334155; font-size: 28px; font-weight: 600; line-height: 1.3; letter-spacing: -0.3px;">${subject}</h2>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td class="content" style="padding: 40px; background: #ffffff;">
                            
                            <!-- Welcome Box -->
                            <div style="background: linear-gradient(135deg, ${themeColors.primary}08 0%, ${themeColors.accent}05 100%); border-radius: 16px; padding: 30px; margin-bottom: 35px; border: 1px solid ${themeColors.primary}15;">
                                <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px; font-weight: 600;">Hello there! 👋</h3>
                                <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #475569;">${prompt}</p>
                            </div>
                            
                            <!-- Value Proposition -->
                            <div style="margin-bottom: 40px;">
                                <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: #475569;">We're excited to share this with you and believe it will make a meaningful impact. Our team has carefully crafted this experience with you in mind.</p>
                                
                                <div style="display: flex; gap: 15px; margin: 25px 0;">
                                    <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #e2e8f0;">
                                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, ${themeColors.primary}, ${themeColors.accent}); border-radius: 10px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;">
                                            <span style="color: white; font-size: 16px;">✨</span>
                                        </div>
                                        <h4 style="margin: 0 0 6px 0; color: #334155; font-size: 13px; font-weight: 600;">Premium</h4>
                                        <p style="margin: 0; color: #64748b; font-size: 12px;">Quality first</p>
                                    </div>
                                    <div style="flex: 1; background: #f8fafc; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #e2e8f0;">
                                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, ${themeColors.accent}, ${themeColors.secondary}); border-radius: 10px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;">
                                            <span style="color: white; font-size: 16px;">🚀</span>
                                        </div>
                                        <h4 style="margin: 0 0 6px 0; color: #334155; font-size: 13px; font-weight: 600;">Fast</h4>
                                        <p style="margin: 0; color: #64748b; font-size: 12px;">Built for speed</p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- CTA Section -->
                            <div style="text-align: center; margin: 40px 0; padding: 35px 20px; background: linear-gradient(135deg, ${themeColors.primary}05 0%, ${themeColors.secondary}03 100%); border-radius: 18px; border: 1px solid ${themeColors.primary}10;">
                                <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 18px; font-weight: 600;">Ready to dive in?</h3>
                                <p style="margin: 0 0 28px 0; color: #64748b; font-size: 14px; line-height: 1.6;">Take the next step and discover what we have to offer.</p>
                                
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                    <tr>
                                        <td style="border-radius: 50px; background: linear-gradient(135deg, ${themeColors.accent} 0%, ${themeColors.primary} 100%); box-shadow: 0 10px 20px ${themeColors.accent}40;">
                                            <a href="#" class="button" style="display: inline-block; padding: 16px 32px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 50px; letter-spacing: 0.3px;">
                                                Take Action Now →
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="margin: 20px 0 0 0; color: #94a3b8; font-size: 12px;">No spam, unsubscribe anytime</p>
                            </div>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 35px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <div style="margin-bottom: 20px;">
                                <pre style="margin: 0; font-family: 'Inter', sans-serif; font-size: 14px; color: #475569; white-space: pre-line; font-weight: 500;">${styleGuide?.email_signature || 'Best regards,\nThe Team'}</pre>
                            </div>
                            
                            <div style="border-top: 1px solid #d1d5db; padding-top: 20px;">
                                <p style="margin: 0 0 10px 0; font-size: 13px; color: #64748b; font-weight: 500;">© 2024 ${styleGuide?.brand_name || 'Your Brand'}. All rights reserved.</p>
                                <div style="margin-top: 12px;">
                                    <a href="#" style="color: #6366f1; text-decoration: none; font-size: 12px; font-weight: 500; margin: 0 10px;">Preferences</a>
                                    <span style="color: #cbd5e1;">|</span>
                                    <a href="#" style="color: #6366f1; text-decoration: none; font-size: 12px; font-weight: 500; margin: 0 10px;">Unsubscribe</a>
                                </div>
                            </div>
                        </td>
                    </tr>
                </table>
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
      const { data, error } = await supabase.functions.invoke('edit-email', {
        body: {
          htmlContent: generatedTemplate,
          editInstruction: aiEditPrompt,
          themeColors: themeColors
        }
      });

      if (error) throw error;

      if (data?.htmlContent) {
        const cleaned = cleanHtmlContent(data.htmlContent);
        setGeneratedTemplate(cleaned);
        setAiEditPrompt("");
        toast({
          title: "AI Edit Applied",
          description: "Your email has been updated successfully!",
        });
      } else {
        throw new Error("No content received from AI editor");
      }
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
      // Calculate current sender number
      const senderNumber = getCurrentSenderNumber();
      
      // Save campaign to database
      const { data, error } = await supabase
        .from('campaigns')
        .insert([
          {
            user_id: DEMO_USER_ID,
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
      try { localStorage.removeItem(DRAFT_KEY); } catch {}

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

          {/* Quick Color Theme Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Campaign Colors</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (styleGuide) {
                    setThemeColors({
                      primary: styleGuide.primary_color,
                      secondary: styleGuide.secondary_color,
                      accent: styleGuide.accent_color,
                    });
                    if (generatedTemplate) {
                      applyColorChangesToTemplate(styleGuide.primary_color, styleGuide.secondary_color, styleGuide.accent_color);
                    }
                  }
                }}
                className="text-xs"
              >
                Reset to Brand
              </Button>
            </div>
            <div className="flex space-x-4 items-center">
              <div className="flex items-center space-x-2">
                <Label htmlFor="primary-color" className="text-sm">Primary</Label>
                <ColorPicker
                  value={themeColors.primary}
                  onChange={(color) => {
                    setThemeColors(prev => ({ ...prev, primary: color }));
                    if (generatedTemplate) {
                      applyColorChangesToTemplate(color, themeColors.secondary, themeColors.accent);
                    }
                  }}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="secondary-color" className="text-sm">Secondary</Label>
                <ColorPicker
                  value={themeColors.secondary}
                  onChange={(color) => {
                    setThemeColors(prev => ({ ...prev, secondary: color }));
                    if (generatedTemplate) {
                      applyColorChangesToTemplate(themeColors.primary, color, themeColors.accent);
                    }
                  }}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="accent-color" className="text-sm">Accent</Label>
                <ColorPicker
                  value={themeColors.accent}
                  onChange={(color) => {
                    setThemeColors(prev => ({ ...prev, accent: color }));
                    if (generatedTemplate) {
                      applyColorChangesToTemplate(themeColors.primary, themeColors.secondary, color);
                    }
                  }}
                />
              </div>
            </div>
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

          {/* AI Generated Template Preview */}
          {generatedTemplate && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center">
                <Label>Generated Template</Label>
                <div className="flex space-x-2">
                  <Dialog open={showPreview} onOpenChange={setShowPreview}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto" aria-describedby="email-preview-desc">
                      <DialogHeader>
                        <div className="flex justify-between items-center">
                          <DialogTitle>Email Preview</DialogTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewMode(viewMode === 'desktop' ? 'mobile' : 'desktop')}
                          >
                            {viewMode === 'desktop' ? <Smartphone className="h-4 w-4 mr-2" /> : <Monitor className="h-4 w-4 mr-2" />}
                            {viewMode === 'desktop' ? 'Mobile View' : 'Desktop View'}
                          </Button>
                        </div>
                      </DialogHeader>
                      <p id="email-preview-desc" className="sr-only">Full email preview content in an isolated iframe.</p>
                      <div className={`mx-auto ${viewMode === 'mobile' ? 'max-w-sm' : 'w-full'}`}>
                        <iframe
                          title="Email full preview"
                          srcDoc={generatedTemplate}
                          className={`w-full border rounded ${viewMode === 'mobile' ? 'h-[60vh]' : 'h-[70vh]'}`}
                          sandbox="allow-same-origin"
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedTemplate);
                      toast({
                        title: "Copied!",
                        description: "HTML template copied to clipboard.",
                      });
                    }}
                  >
                    Copy HTML
                  </Button>
                </div>
              </div>
              
              {/* Inline Email Preview */}
              <div className="border rounded-lg bg-white overflow-hidden">
                <iframe
                  title="Email inline preview"
                  srcDoc={generatedTemplate}
                  className="w-full h-[600px] border-0"
                  sandbox="allow-same-origin"
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
            </div>
          )}
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