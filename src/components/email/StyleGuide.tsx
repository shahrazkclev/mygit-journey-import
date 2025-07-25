import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ColorPicker } from "@/components/ui/color-picker";
import { Palette, Type, Image, Sparkles, Save, Eye, Settings } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const StyleGuide = () => {
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  
  // Brand identity state
  const [brandName, setBrandName] = useState("Your Brand");
  const [primaryColor, setPrimaryColor] = useState("#684cff");
  const [secondaryColor, setSecondaryColor] = useState("#22d3ee");
  const [accentColor, setAccentColor] = useState("#34d399");
  const [fontFamily, setFontFamily] = useState("Segoe UI, sans-serif");
  const [tone, setTone] = useState("friendly");
  const [brandVoice, setBrandVoice] = useState("Professional yet approachable, with a focus on helping our community grow and succeed.");
  const [logoUrl, setLogoUrl] = useState("");
  const [emailSignature, setEmailSignature] = useState("Best regards,\nThe Team");

  // Page theme colors (separate from brand colors)
  const [pageTheme, setPageTheme] = useState({
    primary: "#684cff",
    secondary: "#22d3ee", 
    accent: "#34d399"
  });

  // Load existing style guide on component mount
  useEffect(() => {
    loadStyleGuide();
  }, []);

  const loadStyleGuide = async () => {
    try {
      setLoading(true);
      
      // Use a proper UUID for demo purposes
      const demoUserId = '550e8400-e29b-41d4-a716-446655440000';

      const { data: styleGuides, error } = await supabase
        .from('style_guides')
        .select('*')
        .eq('user_id', demoUserId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error loading style guide:', error);
        return;
      }

      if (styleGuides && styleGuides.length > 0) {
        const guide = styleGuides[0];
        setBrandName(guide.brand_name);
        setPrimaryColor(guide.primary_color);
        setSecondaryColor(guide.secondary_color);
        setAccentColor(guide.accent_color);
        setFontFamily(guide.font_family);
        setTone(guide.tone);
        setBrandVoice(guide.brand_voice || "");
        setLogoUrl(guide.logo_url || "");
        setEmailSignature(guide.email_signature);
        setPageTheme({
          primary: guide.page_theme_primary,
          secondary: guide.page_theme_secondary,
          accent: guide.page_theme_accent
        });
        
        // Apply the loaded theme immediately
        applyPageTheme(guide.page_theme_primary, guide.page_theme_secondary, guide.page_theme_accent);
      }
    } catch (error) {
      console.error('Error in loadStyleGuide:', error);
    } finally {
      setLoading(false);
    }
  };

  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  };

  const applyPageTheme = (primary?: string, secondary?: string, accent?: string) => {
    const root = document.documentElement;
    const p = primary || pageTheme.primary;
    const s = secondary || pageTheme.secondary;
    const a = accent || pageTheme.accent;
    
    // Convert hex to HSL for CSS variables
    const [pH, pS, pL] = hexToHsl(p);
    const [sH, sS, sL] = hexToHsl(s);
    const [aH, aS, aL] = hexToHsl(a);
    
    root.style.setProperty('--theme-primary', `${pH} ${pS}% ${pL}%`);
    root.style.setProperty('--theme-secondary', `${sH} ${sS}% ${sL}%`);
    root.style.setProperty('--theme-accent', `${aH} ${aS}% ${aL}%`);
    
    // Also update the email-specific colors
    root.style.setProperty('--email-primary', `${pH} ${pS}% ${pL}%`);
    root.style.setProperty('--email-secondary', `${sH} ${sS}% ${sL}%`);
    root.style.setProperty('--email-accent', `${aH} ${aS}% ${aL}%`);
    
    if (!primary && !secondary && !accent) {
      toast.success("Page theme applied!");
    }
  };

  const handleSaveStyleGuide = async () => {
    try {
      setSaveLoading(true);
      
      // Use a proper UUID for demo purposes
      const demoUserId = '550e8400-e29b-41d4-a716-446655440000';

      // First check if a style guide exists
      const { data: existingGuides } = await supabase
        .from('style_guides')
        .select('id')
        .eq('user_id', demoUserId)
        .limit(1);

      const styleGuideData = {
        user_id: demoUserId,
        brand_name: brandName,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        font_family: fontFamily,
        tone,
        brand_voice: brandVoice,
        logo_url: logoUrl,
        email_signature: emailSignature,
        page_theme_primary: pageTheme.primary,
        page_theme_secondary: pageTheme.secondary,
        page_theme_accent: pageTheme.accent
      };

      if (existingGuides && existingGuides.length > 0) {
        // Update existing style guide
        const { error } = await supabase
          .from('style_guides')
          .update(styleGuideData)
          .eq('id', existingGuides[0].id);

        if (error) throw error;
      } else {
        // Create new style guide
        const { error } = await supabase
          .from('style_guides')
          .insert(styleGuideData);

        if (error) throw error;
      }

      applyPageTheme();
      toast.success("Style guide saved and theme applied!");
    } catch (error) {
      console.error('Error saving style guide:', error);
      toast.error("Failed to save style guide");
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePreviewStyle = async () => {
    try {
      // Use a proper UUID for demo purposes
      const demoUserId = '550e8400-e29b-41d4-a716-446655440000';

      toast.info("Generating test email with your style guide...");
      
      // Call the edge function to generate a test email
      const { data, error } = await supabase.functions.invoke('generate-email', {
        body: {
          prompt: "Create a welcome email for new subscribers with a warm, engaging tone.",
          subject: "Welcome to our community!",
          styleGuide: {
            brandName,
            primaryColor,
            secondaryColor,
            accentColor,
            fontFamily,
            tone,
            brandVoice,
            emailSignature
          }
        }
      });

      if (error) {
        console.error('Error generating test email:', error);
        toast.error("Failed to generate test email");
        return;
      }

      if (data?.success) {
        // Open the generated HTML in a new window for preview
        const previewWindow = window.open('', '_blank');
        if (previewWindow) {
          previewWindow.document.write(data.htmlContent);
          previewWindow.document.close();
          toast.success("Test email generated! Check the new window.");
        }
      } else {
        toast.error(data?.error || "Failed to generate test email");
      }
    } catch (error) {
      console.error('Error in handlePreviewStyle:', error);
      toast.error("Failed to generate test email");
    }
  };

  const toneOptions = [
    { value: "professional", label: "Professional" },
    { value: "friendly", label: "Friendly" },
    { value: "casual", label: "Casual" },
    { value: "formal", label: "Formal" },
    { value: "playful", label: "Playful" },
    { value: "authoritative", label: "Authoritative" }
  ];

  return (
    <div className="space-y-6">
      {/* Page Theme Control */}
      <Card className="shadow-soft border-email-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5 text-email-primary" />
            <span>Page Theme Control</span>
          </CardTitle>
          <CardDescription>
            Control the theme colors of the entire application interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ColorPicker
              value={pageTheme.primary}
              onChange={(color) => setPageTheme({...pageTheme, primary: color})}
              label="Primary Theme"
              showPresets={true}
            />
            <ColorPicker
              value={pageTheme.secondary}
              onChange={(color) => setPageTheme({...pageTheme, secondary: color})}
              label="Secondary Theme"
              showPresets={true}
            />
            <ColorPicker
              value={pageTheme.accent}
              onChange={(color) => setPageTheme({...pageTheme, accent: color})}
              label="Accent Theme"
              showPresets={true}
            />
          </div>
          <Button onClick={() => applyPageTheme()} className="mt-4">
            Apply Page Theme
          </Button>
        </CardContent>
      </Card>

      {/* Brand Identity */}
      <Card className="shadow-soft border-email-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5 text-email-primary" />
            <span>Brand Identity</span>
          </CardTitle>
          <CardDescription>
            Define your brand colors and visual identity for consistent AI-generated emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brandName">Brand Name</Label>
              <Input
                id="brandName"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="border-email-primary/30 focus:border-email-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL (optional)</Label>
              <Input
                id="logoUrl"
                placeholder="https://your-domain.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="border-email-primary/30 focus:border-email-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      {/* Typography & Voice */}
      <Card className="shadow-soft border-email-secondary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Type className="h-5 w-5 text-email-secondary" />
            <span>Typography & Voice</span>
          </CardTitle>
          <CardDescription>
            Set your preferred fonts and brand voice for AI content generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fontFamily">Font Family</Label>
              <select 
                className="w-full px-3 py-2 border border-email-secondary/30 rounded-md focus:border-email-secondary focus:outline-none focus:ring-2 focus:ring-email-secondary/20"
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
              >
                <option value="Segoe UI, sans-serif">Segoe UI (Modern)</option>
                <option value="Helvetica, Arial, sans-serif">Helvetica (Classic)</option>
                <option value="Georgia, serif">Georgia (Serif)</option>
                <option value="Inter, sans-serif">Inter (Clean)</option>
                <option value="Roboto, sans-serif">Roboto (Google)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">Brand Tone</Label>
              <select 
                className="w-full px-3 py-2 border border-email-secondary/30 rounded-md focus:border-email-secondary focus:outline-none focus:ring-2 focus:ring-email-secondary/20"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                {toneOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brandVoice">Brand Voice Description</Label>
            <Textarea
              id="brandVoice"
              placeholder="Describe your brand's personality and communication style..."
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value)}
              className="min-h-[100px] border-email-secondary/30 focus:border-email-secondary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailSignature">Email Signature</Label>
            <Textarea
              id="emailSignature"
              placeholder="Your email signature..."
              value={emailSignature}
              onChange={(e) => setEmailSignature(e.target.value)}
              className="border-email-secondary/30 focus:border-email-secondary"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Style Preview */}
      <Card className="shadow-soft border-email-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5 text-email-accent" />
            <span>Style Preview</span>
          </CardTitle>
          <CardDescription>
            Preview how your style guide will look in generated emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="p-6 rounded-lg border-2 border-dashed border-email-accent/30"
            style={{
              backgroundColor: `${primaryColor}20`,
              fontFamily: fontFamily
            }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold" style={{ color: primaryColor }}>
                  {brandName}
                </h3>
                {logoUrl && (
                  <Badge variant="outline" className="border-email-accent text-email-accent">
                    <Image className="h-3 w-3 mr-1" />
                    Logo
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                <p style={{ color: secondaryColor }}>Hello John,</p>
                <p className="text-foreground">
                  This is a preview of how your emails will look with your style guide. 
                  The AI will use these colors, fonts, and tone to create consistent, 
                  on-brand email campaigns.
                </p>
                <div 
                  className="inline-block px-4 py-2 rounded-lg text-foreground"
                  style={{ backgroundColor: accentColor }}
                >
                  Call to Action Button
                </div>
              </div>
              <div className="pt-4 border-t border-email-accent/20">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {emailSignature}
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button 
          onClick={handlePreviewStyle}
          variant="outline"
          className="border-email-accent hover:bg-email-accent"
        >
          <Eye className="h-4 w-4 mr-2" />
          Generate Test Email
        </Button>
        <Button 
          onClick={handleSaveStyleGuide}
          disabled={saveLoading}
          className="bg-email-success hover:bg-email-success/80 text-foreground shadow-soft"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveLoading ? "Saving..." : "Save Style Guide"}
        </Button>
      </div>
    </div>
  );
};