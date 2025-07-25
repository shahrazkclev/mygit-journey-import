import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, Type, Image, Sparkles, Save, Eye } from "lucide-react";
import { toast } from "sonner";

export const StyleGuide = () => {
  const [brandName, setBrandName] = useState("Your Brand");
  const [primaryColor, setPrimaryColor] = useState("#ddd6fe");
  const [secondaryColor, setSecondaryColor] = useState("#bae6fd");
  const [accentColor, setAccentColor] = useState("#a7f3d0");
  const [fontFamily, setFontFamily] = useState("Segoe UI, sans-serif");
  const [tone, setTone] = useState("friendly");
  const [brandVoice, setBrandVoice] = useState("Professional yet approachable, with a focus on helping our community grow and succeed.");
  const [logoUrl, setLogoUrl] = useState("");
  const [emailSignature, setEmailSignature] = useState("Best regards,\nThe Team");

  // Page theme colors
  const [pageTheme, setPageTheme] = useState({
    primary: "#684cff",
    secondary: "#22d3ee", 
    accent: "#34d399"
  });

  const applyPageTheme = () => {
    const root = document.documentElement;
    root.style.setProperty('--email-primary', pageTheme.primary);
    root.style.setProperty('--email-secondary', pageTheme.secondary);
    root.style.setProperty('--email-accent', pageTheme.accent);
    toast.success("Page theme applied!");
  };

  const handleSaveStyleGuide = () => {
    applyPageTheme();
    toast.success("Style guide saved and theme applied!");
  };

  const handlePreviewStyle = () => {
    toast.info("Style preview will be implemented with Supabase integration");
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pageThemePrimary">Primary Theme</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="pageThemePrimary"
                  type="color"
                  value={pageTheme.primary}
                  onChange={(e) => setPageTheme({...pageTheme, primary: e.target.value})}
                  className="w-16 h-10 p-1 border-email-primary/30"
                />
                <Input
                  value={pageTheme.primary}
                  onChange={(e) => setPageTheme({...pageTheme, primary: e.target.value})}
                  className="flex-1 border-email-primary/30 focus:border-email-primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pageThemeSecondary">Secondary Theme</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="pageThemeSecondary"
                  type="color"
                  value={pageTheme.secondary}
                  onChange={(e) => setPageTheme({...pageTheme, secondary: e.target.value})}
                  className="w-16 h-10 p-1 border-email-secondary/30"
                />
                <Input
                  value={pageTheme.secondary}
                  onChange={(e) => setPageTheme({...pageTheme, secondary: e.target.value})}
                  className="flex-1 border-email-secondary/30 focus:border-email-secondary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pageThemeAccent">Accent Theme</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="pageThemeAccent"
                  type="color"
                  value={pageTheme.accent}
                  onChange={(e) => setPageTheme({...pageTheme, accent: e.target.value})}
                  className="w-16 h-10 p-1 border-email-accent/30"
                />
                <Input
                  value={pageTheme.accent}
                  onChange={(e) => setPageTheme({...pageTheme, accent: e.target.value})}
                  className="flex-1 border-email-accent/30 focus:border-email-accent"
                />
              </div>
            </div>
          </div>
          <Button onClick={applyPageTheme} className="mt-4">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-10 p-1 border-email-primary/30"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#ddd6fe"
                  className="flex-1 border-email-primary/30 focus:border-email-primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-16 h-10 p-1 border-email-secondary/30"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#bae6fd"
                  className="flex-1 border-email-secondary/30 focus:border-email-secondary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accentColor">Accent Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="accentColor"
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-16 h-10 p-1 border-email-accent/30"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#a7f3d0"
                  className="flex-1 border-email-accent/30 focus:border-email-accent"
                />
              </div>
            </div>
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
          className="bg-email-success hover:bg-email-success/80 text-foreground shadow-soft"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Style Guide
        </Button>
      </div>
    </div>
  );
};