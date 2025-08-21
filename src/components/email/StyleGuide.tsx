import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ColorPicker } from "@/components/ui/color-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Type, Image, Sparkles, Save, Eye, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_USER_ID } from "@/lib/demo-auth";

interface BrandIdentity {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  font: string;
  voice: string;
  brandVoice: string;
  logo: string;
  signature: string;
}

interface PageThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

export const StyleGuide = () => {
  const [loading, setLoading] = useState(false);
  const [brandIdentity, setBrandIdentity] = useState<BrandIdentity>({
    name: "Your Brand",
    primaryColor: "#684cff",
    secondaryColor: "#22d3ee",
    accentColor: "#34d399",
    font: "Segoe UI, sans-serif",
    voice: "friendly",
    brandVoice: "Professional yet approachable, with a focus on helping our community grow and succeed.",
    logo: "",
    signature: "Best regards,\nThe Team"
  });

  // Page theme colors (separate from brand colors)
  const [pageThemeColors, setPageThemeColors] = useState<PageThemeColors>({
    primary: "#684cff",
    secondary: "#22d3ee",
    accent: "#34d399"
  });

  const { toast } = useToast();

  // Load existing style guide on component mount
  useEffect(() => {
    loadStyleGuide();
  }, []);

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
        setBrandIdentity({
          name: guide.brand_name,
          primaryColor: guide.primary_color,
          secondaryColor: guide.secondary_color,
          accentColor: guide.accent_color,
          font: guide.font_family,
          voice: guide.tone,
          brandVoice: guide.brand_voice || '',
          logo: guide.logo_url || '',
          signature: guide.email_signature,
        });

        setPageThemeColors({
          primary: guide.page_theme_primary,
          secondary: guide.page_theme_secondary,
          accent: guide.page_theme_accent,
        });

        // Apply the theme immediately
        applyPageTheme(guide.page_theme_primary, guide.page_theme_secondary, guide.page_theme_accent);
      }
    } catch (error) {
      console.error('Error loading style guide:', error);
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

    return [
      Math.round(h * 360),
      Math.round(s * 100),
      Math.round(l * 100)
    ];
  };

  const applyPageTheme = (primary?: string, secondary?: string, accent?: string) => {
    const root = document.documentElement;
    
    if (primary) {
      const [h, s, l] = hexToHsl(primary);
      root.style.setProperty('--primary', `${h} ${s}% ${l}%`);
    }
    
    if (secondary) {
      const [h, s, l] = hexToHsl(secondary);
      root.style.setProperty('--secondary', `${h} ${s}% ${l}%`);
    }
    
    if (accent) {
      const [h, s, l] = hexToHsl(accent);
      root.style.setProperty('--accent', `${h} ${s}% ${l}%`);
    }
  };

  const handleSaveStyleGuide = async () => {
    try {
      // Check if a style guide already exists for this user
      const { data: existingData, error: checkError } = await supabase
        .from('style_guides')
        .select('id')
        .eq('user_id', DEMO_USER_ID)
        .limit(1);

      if (checkError) throw checkError;

      const styleGuideData = {
        user_id: DEMO_USER_ID,
        brand_name: brandIdentity.name,
        primary_color: brandIdentity.primaryColor,
        secondary_color: brandIdentity.secondaryColor,
        accent_color: brandIdentity.accentColor,
        font_family: brandIdentity.font,
        tone: brandIdentity.voice,
        brand_voice: brandIdentity.brandVoice,
        logo_url: brandIdentity.logo,
        email_signature: brandIdentity.signature,
        page_theme_primary: pageThemeColors.primary,
        page_theme_secondary: pageThemeColors.secondary,
        page_theme_accent: pageThemeColors.accent,
      };

      let result;
      if (existingData && existingData.length > 0) {
        // Update existing style guide
        result = await supabase
          .from('style_guides')
          .update(styleGuideData)
          .eq('id', existingData[0].id);
      } else {
        // Insert new style guide
        result = await supabase
          .from('style_guides')
          .insert([styleGuideData]);
      }

      if (result.error) throw result.error;

      // Apply page theme
      applyPageTheme(pageThemeColors.primary, pageThemeColors.secondary, pageThemeColors.accent);

      toast({
        title: "Style Guide Saved",
        description: "Your brand style guide has been saved successfully.",
      });

    } catch (error) {
      console.error('Error saving style guide:', error);
      toast({
        title: "Error",
        description: "Failed to save style guide. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePreviewStyle = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-email', {
        body: {
          prompt: "Create a preview email showcasing the brand style",
          subject: "Style Guide Preview Email",
          styleGuide: {
            brandName: brandIdentity.name,
            primaryColor: brandIdentity.primaryColor,
            secondaryColor: brandIdentity.secondaryColor,
            accentColor: brandIdentity.accentColor,
            fontFamily: brandIdentity.font,
            tone: brandIdentity.voice,
            brandVoice: brandIdentity.brandVoice,
            logoUrl: brandIdentity.logo,
            emailSignature: brandIdentity.signature,
          }
        }
      });

      if (error) throw error;

      if (data?.htmlContent) {
        const previewWindow = window.open('', '_blank');
        if (previewWindow) {
          previewWindow.document.write(data.htmlContent);
          previewWindow.document.close();
        }
      } else {
        toast({
          title: "Preview Error",
          description: "Unable to generate preview content.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: "Preview Error",
        description: "Failed to generate email preview. Using fallback.",
        variant: "destructive",
      });
      
      // Fallback preview
      const fallbackHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: ${brandIdentity.font}; margin: 20px; }
              .header { background: ${brandIdentity.primaryColor}; color: white; padding: 20px; border-radius: 8px; }
              .content { margin: 20px 0; }
              .button { background: ${brandIdentity.accentColor}; color: white; padding: 12px 24px; border: none; border-radius: 6px; }
              .footer { margin-top: 40px; padding: 20px; background: ${brandIdentity.secondaryColor}20; border-radius: 6px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${brandIdentity.name}</h1>
              <p>Style Guide Preview Email</p>
            </div>
            <div class="content">
              <p>This is a preview of your brand style guide in action.</p>
              <p>Brand Voice: ${brandIdentity.brandVoice}</p>
              <button class="button">Call to Action</button>
            </div>
            <div class="footer">
              <pre>${brandIdentity.signature}</pre>
            </div>
          </body>
        </html>
      `;
      
      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(fallbackHTML);
        previewWindow.document.close();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Theme Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Page Theme Control</span>
          </CardTitle>
          <CardDescription>
            Control the color theme of this application interface (separate from email brand colors)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Primary Theme Color</Label>
              <ColorPicker
                value={pageThemeColors.primary}
                onChange={(color) => {
                  setPageThemeColors({...pageThemeColors, primary: color});
                  applyPageTheme(color, undefined, undefined);
                }}
                label="Primary"
              />
            </div>
            <div className="space-y-2">
              <Label>Secondary Theme Color</Label>
              <ColorPicker
                value={pageThemeColors.secondary}
                onChange={(color) => {
                  setPageThemeColors({...pageThemeColors, secondary: color});
                  applyPageTheme(undefined, color, undefined);
                }}
                label="Secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>Accent Theme Color</Label>
              <ColorPicker
                value={pageThemeColors.accent}
                onChange={(color) => {
                  setPageThemeColors({...pageThemeColors, accent: color});
                  applyPageTheme(undefined, undefined, color);
                }}
                label="Accent"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5" />
            <span>Brand Identity</span>
          </CardTitle>
          <CardDescription>
            Define your brand colors and identity for AI-generated emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brandName">Brand Name</Label>
              <Input
                id="brandName"
                value={brandIdentity.name}
                onChange={(e) => setBrandIdentity({...brandIdentity, name: e.target.value})}
                placeholder="Your Brand Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL (optional)</Label>
              <Input
                id="logoUrl"
                value={brandIdentity.logo}
                onChange={(e) => setBrandIdentity({...brandIdentity, logo: e.target.value})}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Primary Brand Color</Label>
              <ColorPicker
                value={brandIdentity.primaryColor}
                onChange={(color) => setBrandIdentity({...brandIdentity, primaryColor: color})}
                label="Primary"
              />
            </div>
            <div className="space-y-2">
              <Label>Secondary Brand Color</Label>
              <ColorPicker
                value={brandIdentity.secondaryColor}
                onChange={(color) => setBrandIdentity({...brandIdentity, secondaryColor: color})}
                label="Secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>Accent Brand Color</Label>
              <ColorPicker
                value={brandIdentity.accentColor}
                onChange={(color) => setBrandIdentity({...brandIdentity, accentColor: color})}
                label="Accent"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography & Voice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Type className="h-5 w-5" />
            <span>Typography & Voice</span>
          </CardTitle>
          <CardDescription>
            Set the tone and style for your email communications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fontFamily">Font Family</Label>
              <Select value={brandIdentity.font} onValueChange={(value) => setBrandIdentity({...brandIdentity, font: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Segoe UI, sans-serif">Segoe UI</SelectItem>
                  <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                  <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                  <SelectItem value="Georgia, serif">Georgia</SelectItem>
                  <SelectItem value="Times New Roman, serif">Times New Roman</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">Brand Tone</Label>
              <Select value={brandIdentity.voice} onValueChange={(value) => setBrandIdentity({...brandIdentity, voice: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="authoritative">Authoritative</SelectItem>
                  <SelectItem value="empathetic">Empathetic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brandVoice">Brand Voice Description</Label>
            <Textarea
              id="brandVoice"
              value={brandIdentity.brandVoice}
              onChange={(e) => setBrandIdentity({...brandIdentity, brandVoice: e.target.value})}
              placeholder="Describe your brand's personality and communication style..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signature">Email Signature</Label>
            <Textarea
              id="signature"
              value={brandIdentity.signature}
              onChange={(e) => setBrandIdentity({...brandIdentity, signature: e.target.value})}
              placeholder="Best regards,&#10;The Team"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Style Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Style Preview</span>
          </CardTitle>
          <CardDescription>
            Preview how your brand style will look in emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="p-6 rounded-lg border-2"
            style={{
              fontFamily: brandIdentity.font,
              background: `linear-gradient(135deg, ${brandIdentity.primaryColor}15, ${brandIdentity.secondaryColor}15)`
            }}
          >
            <div 
              className="text-center p-4 rounded-md mb-4"
              style={{ backgroundColor: brandIdentity.primaryColor, color: 'white' }}
            >
              <h3 className="text-xl font-bold">{brandIdentity.name}</h3>
              <p className="opacity-90">Sample Email Header</p>
            </div>
            
            <div className="space-y-3">
              <p>Hello [Name],</p>
              <p>This is how your emails will look with the current brand settings. The tone is <Badge variant="secondary">{brandIdentity.voice}</Badge>.</p>
              <p>{brandIdentity.brandVoice}</p>
              
              <div className="flex space-x-2">
                <button 
                  className="px-4 py-2 rounded text-white font-medium"
                  style={{ backgroundColor: brandIdentity.accentColor }}
                >
                  Call to Action
                </button>
                <button 
                  className="px-4 py-2 rounded border font-medium"
                  style={{ 
                    borderColor: brandIdentity.secondaryColor,
                    color: brandIdentity.secondaryColor
                  }}
                >
                  Secondary Action
                </button>
              </div>
              
              <div 
                className="mt-6 p-3 rounded border-l-4"
                style={{ borderLeftColor: brandIdentity.secondaryColor, backgroundColor: `${brandIdentity.secondaryColor}10` }}
              >
                <pre className="text-sm whitespace-pre-wrap">{brandIdentity.signature}</pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button onClick={handlePreviewStyle} variant="outline" className="flex items-center space-x-2">
          <Eye className="h-4 w-4" />
          <span>Generate Test Email</span>
        </Button>
        <Button onClick={handleSaveStyleGuide} className="flex items-center space-x-2">
          <Save className="h-4 w-4" />
          <span>Save Style Guide</span>
        </Button>
      </div>
    </div>
  );
};