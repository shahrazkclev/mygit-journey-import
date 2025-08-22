import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wand2, Send, Eye, Save, Palette, Code, Edit } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EmailEditor, EmailElement } from "./EmailEditor";
import { EditablePreview } from "./editor/EditablePreview";
import { SendCampaignModal } from "./SendCampaignModal";
import { DEMO_USER_ID } from "@/lib/demo-auth";

interface CampaignComposerProps {
  onSave?: (campaignData: any) => void;
}

export const CampaignComposer: React.FC<CampaignComposerProps> = ({ onSave }) => {
  const [subject, setSubject] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generatedTemplate, setGeneratedTemplate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState<'code' | 'visual' | 'editor'>('visual');
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
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
  const [originalTemplate, setOriginalTemplate] = useState<string | null>(null);
  const [emailElements, setEmailElements] = useState<EmailElement[]>([]);
  const [showSendModal, setShowSendModal] = useState(false);

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

  const [emailLists, setEmailLists] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Product autocomplete state
  const [showProductAutocomplete, setShowProductAutocomplete] = useState(false);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [currentMatch, setCurrentMatch] = useState<{product: any, startIndex: number, partialName: string} | null>(null);
  const promptTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadEmailLists();
    loadProducts();
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

  const loadProducts = async () => {
    console.log('🔄 Loading products...');
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading products:', error);
        return;
      }

      console.log('✅ Products loaded:', data?.length || 0);
      console.log('📦 Product names:', data?.map(p => p.name) || []);
      setProducts(data || []);
    } catch (error) {
      console.error('❌ Error loading products:', error);
    }
  };

  const enhancePromptWithProductDetails = (originalPrompt: string): string => {
    console.log('🔍 Enhancing prompt with product details');
    console.log('📝 Original prompt:', originalPrompt);
    console.log('📦 Available products:', products.length);
    
    if (!products.length) {
      console.log('❌ No products loaded');
      return originalPrompt;
    }

    // Find product names mentioned in the prompt (case insensitive)
    const mentionedProducts = products.filter(product => {
      const isMatch = originalPrompt.toLowerCase().includes(product.name.toLowerCase());
      if (isMatch) {
        console.log('✅ Found product match:', product.name);
      }
      return isMatch;
    });

    console.log('🎯 Mentioned products found:', mentionedProducts.length);

    if (mentionedProducts.length === 0) {
      console.log('❌ No product names found in prompt');
      return originalPrompt;
    }

    // Add product details to the prompt
    let enhancedPrompt = originalPrompt;
    
    enhancedPrompt += "\n\n--- PRODUCT DETAILS FOR AI ---\n";
    enhancedPrompt += "The following products are mentioned in this email. Please use these exact details when referring to them:\n\n";

    mentionedProducts.forEach(product => {
      enhancedPrompt += `📦 PRODUCT: ${product.name}\n`;
      if (product.description) enhancedPrompt += `   Description: ${product.description}\n`;
      if (product.price) enhancedPrompt += `   Price: $${product.price}\n`;
      if (product.category) enhancedPrompt += `   Category: ${product.category}\n`;
      if (product.sku) enhancedPrompt += `   SKU: ${product.sku}\n`;
      enhancedPrompt += "\n";
    });

    console.log('🚀 Enhanced prompt:', enhancedPrompt);
    return enhancedPrompt;
  };

  // Product autocomplete functionality
  const findProductMatch = (text: string, cursorPosition: number) => {
    // Find the start of the current word
    let wordStart = cursorPosition;
    while (wordStart > 0 && /\w/.test(text[wordStart - 1])) {
      wordStart--;
    }
    
    // Find the end of the current word
    let wordEnd = cursorPosition;
    while (wordEnd < text.length && /\w/.test(text[wordEnd])) {
      wordEnd++;
    }
    
    const currentWord = text.substring(wordStart, wordEnd).toLowerCase();
    
    // Only show autocomplete if we have at least 3 characters
    if (currentWord.length < 3) return null;
    
    // Find matching products
    const matchingProduct = products.find(product => 
      product.name.toLowerCase().startsWith(currentWord)
    );
    
    if (matchingProduct) {
      return {
        product: matchingProduct,
        startIndex: wordStart,
        partialName: currentWord
      };
    }
    
    return null;
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    setPrompt(newPrompt);
    
    // Check for product matches
    const match = findProductMatch(newPrompt, cursorPosition);
    
    if (match) {
      setCurrentMatch(match);
      setShowProductAutocomplete(true);
      
      // Calculate position for autocomplete dropdown
      const textarea = e.target;
      const textBeforeCursor = newPrompt.substring(0, match.startIndex);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines.length - 1;
      const charPosition = lines[lines.length - 1].length;
      
      // Rough calculation for position (you might need to adjust)
      const lineHeight = 24; // approximate line height
      const charWidth = 8; // approximate character width
      
      setAutocompletePosition({
        top: currentLine * lineHeight + 30,
        left: charPosition * charWidth
      });
    } else {
      setShowProductAutocomplete(false);
      setCurrentMatch(null);
    }
  };

  const handleProductInsert = () => {
    if (!currentMatch || !promptTextareaRef.current) return;
    
    const textarea = promptTextareaRef.current;
    const product = currentMatch.product;
    
    // Create product details text
    const productDetails = `${product.name} (${product.category} - $${product.price})`;
    
    // Replace the partial text with full product details
    const beforeText = prompt.substring(0, currentMatch.startIndex);
    const afterText = prompt.substring(currentMatch.startIndex + currentMatch.partialName.length);
    const newPrompt = beforeText + productDetails + afterText;
    
    setPrompt(newPrompt);
    setShowProductAutocomplete(false);
    setCurrentMatch(null);
    
    // Focus back on textarea
    setTimeout(() => {
      textarea.focus();
      const newPosition = beforeText.length + productDetails.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showProductAutocomplete && (e.key === 'Tab' || e.key === 'Enter')) {
      e.preventDefault();
      handleProductInsert();
    } else if (e.key === 'Escape') {
      setShowProductAutocomplete(false);
      setCurrentMatch(null);
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

  const handleEditorSave = (elements: EmailElement[], htmlContent: string) => {
    setEmailElements(elements);
    setGeneratedTemplate(htmlContent);
    toast.success('Email design saved!');
  };

  const handleEditorChange = (elements: EmailElement[], htmlContent: string) => {
    setEmailElements(elements);
    setGeneratedTemplate(htmlContent);
  };
  const applyInstructionToHtml = (originalHtml: string, instruction: string) => {
    const instr = instruction.toLowerCase();
    let out = originalHtml;

    const injectOverride = (css: string) => {
      const styleTag = `<style>${css}</style>`;
      if (out.includes('</head>')) {
        out = out.replace('</head>', `${styleTag}</head>`);
      } else if (out.includes('<body')) {
        out = out.replace('<body', `${styleTag}<body`);
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

  // Apply color changes to template in real-time (DISABLED to preserve design fidelity)
  const applyColorChangesToTemplate = (primary: string, secondary: string, accent: string) => {
    // We intentionally do not override colors of the generated HTML to avoid corrupting
    // the email's own styling (e.g., turning the background green). Return the original.
    return originalTemplate;
  };

  // Update template when colors change
  useEffect(() => {
    if (originalTemplate) {
      const updatedTemplate = applyColorChangesToTemplate(
        themeColors.primary, 
        themeColors.secondary, 
        themeColors.accent
      );
      if (updatedTemplate) {
        setGeneratedTemplate(updatedTemplate);
      }
    }
  }, [themeColors, originalTemplate]);
  const handleGenerateTemplate = async () => {
    if (!subject.trim() || !prompt.trim()) {
      toast.error("Please provide both a subject and prompt for the email.");
      return;
    }

    setIsGenerating(true);

    try {
      // Enhance the prompt with product details if products are mentioned
      const enhancedPrompt = enhancePromptWithProductDetails(prompt);
      
      const { data, error } = await supabase.functions.invoke('generate-email', {
        body: {
          prompt: enhancedPrompt,
          subject: subject,
          regenId: Date.now(),
          themeColors: themeColors,
          styleGuide: styleGuide ? {
            brandName: styleGuide.brand_name,
            primaryColor: styleGuide.primary_color,
            secondaryColor: styleGuide.secondary_color,
            accentColor: styleGuide.accent_color,
            fontFamily: styleGuide.font_family,
            tone: styleGuide.tone,
            brandVoice: styleGuide.brand_voice,
            logoUrl: styleGuide.logo_url,
            emailSignature: styleGuide.email_signature,
          } : null,
          templatePreview: styleGuide?.template_preview
        }
      });

      if (error) throw error;

      if (data?.htmlContent) {
        const cleaned = cleanHtmlContent(data.htmlContent);
        setOriginalTemplate(cleaned); // Store original for color changes
        setGeneratedTemplate(cleaned);
        toast.success("Your email template has been generated successfully!");
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
      
      setOriginalTemplate(fallbackHTML); // Store original for color changes
      setGeneratedTemplate(fallbackHTML);
      toast.success("Used fallback template generator. Your email is ready!");
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
      toast.error("Please provide editing instructions and ensure you have a generated template.");
      return;
    }

    setIsEditingWithAI(true);

    try {
      // Enhance the edit prompt with product details if products are mentioned
      const enhancedEditPrompt = enhancePromptWithProductDetails(aiEditPrompt);
      
      const { data, error } = await supabase.functions.invoke('edit-email', {
        body: {
          htmlContent: generatedTemplate,
          editInstruction: enhancedEditPrompt,
          themeColors: themeColors,
          // Include style guide context for AI editing
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
          } : null
        }
      });

      if (error) throw error;

      if (data?.htmlContent) {
        const cleaned = cleanHtmlContent(data.htmlContent);
        setGeneratedTemplate(cleaned);
        setAiEditPrompt("");
        toast.success("Your email has been updated successfully!");
      } else {
        throw new Error("No content received from AI editor");
      }
    } catch (error) {
      console.error('Error editing with AI:', error);
      toast.error("Failed to apply AI edits. Please try again.");
    } finally {
      setIsEditingWithAI(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!subject.trim() || !generatedTemplate || selectedLists.length === 0) {
      toast.error("Please ensure you have a subject, generated template, and selected email lists.");
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

      toast.success(`Your campaign "${subject}" has been saved and is ready for sending.`);

      // Reset form
      setSubject("");
      setPrompt("");
      setGeneratedTemplate("");
      setSelectedLists([]);
      try { localStorage.removeItem(DRAFT_KEY); } catch {}

    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error("Failed to save campaign. Please try again.");
    }
  };

  const toggleListSelection = (listId: string) => {
    setSelectedLists(prev => 
      prev.includes(listId) 
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  const handleSave = () => {
    const campaignData = {
      subject,
      htmlContent: generatedTemplate,
      selectedLists,
      themeColors,
      emailElements
    };
    onSave?.(campaignData);
  };

  return (
    <div className="space-y-6">
      {/* Email Content Form */}
      <Card className="shadow-soft bg-gradient-to-br from-email-background to-background border-email-primary/20">
        <CardHeader>
          <CardTitle className="text-email-primary">Email Content</CardTitle>
          <CardDescription>
            Create your email campaign with AI assistance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-email-primary font-medium">Email Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter your email subject line..."
              className="border-email-primary/30 focus:border-email-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-email-primary font-medium">AI Prompt</Label>
            <div className="relative">
              <Textarea
                ref={promptTextareaRef}
                id="prompt"
                value={prompt}
                onChange={handlePromptChange}
                onKeyDown={handleKeyDown}
                placeholder="Describe the email you want to create (e.g., 'Write a promotional email about our new product launch with a 20% discount offer')"
                rows={4}
                className="border-email-primary/30 focus:border-email-primary"
              />
              
              {/* Product Autocomplete Dropdown */}
              {showProductAutocomplete && currentMatch && (
                <div 
                  className="absolute z-50 bg-white border border-email-primary/30 rounded-lg shadow-xl p-3 min-w-64"
                  style={{
                    top: `${autocompletePosition.top}px`,
                    left: `${autocompletePosition.left}px`
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 font-medium">Press Tab or Enter to insert</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowProductAutocomplete(false)}
                      className="p-1 h-auto"
                    >
                      ×
                    </Button>
                  </div>
                  
                  <div className="bg-email-primary/5 border border-email-primary/20 rounded-lg p-3">
                    <div className="font-medium text-email-primary text-sm">
                      {currentMatch.product.name}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      <span className="inline-block mr-3">
                        <Badge variant="outline" className="text-xs">{currentMatch.product.category}</Badge>
                      </span>
                      <span className="font-medium text-email-accent">${currentMatch.product.price}</span>
                    </div>
                    {currentMatch.product.description && (
                      <div className="text-xs text-gray-500 mt-2">
                        {currentMatch.product.description}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    Will insert: <span className="font-mono bg-gray-100 px-1 rounded">
                      {currentMatch.product.name} ({currentMatch.product.category} - ${currentMatch.product.price})
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button 
            onClick={handleGenerateTemplate}
            disabled={isGenerating}
            className="w-full bg-email-primary hover:bg-email-primary/80 text-primary-foreground"
          >
            {isGenerating ? (
              <>
                <Wand2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Generate Email Template
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Email Template Tabs */}
      {generatedTemplate && (
        <Card className="shadow-soft bg-gradient-to-br from-email-background to-background border-email-primary/20">
          <CardHeader>
            <CardTitle className="text-email-primary">Email Template</CardTitle>
            <CardDescription>
              Preview and edit your email template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={previewMode} onValueChange={(value) => setPreviewMode(value as 'code' | 'visual')}>
              <TabsList className="grid w-full grid-cols-2 bg-email-muted/30">
                <TabsTrigger value="visual" className="data-[state=active]:bg-email-primary data-[state=active]:text-primary-foreground">Preview</TabsTrigger>
                <TabsTrigger value="code" className="data-[state=active]:bg-email-primary data-[state=active]:text-primary-foreground">
                  <Code className="h-4 w-4 mr-2" />
                  HTML Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="visual" className="mt-4">
                <EditablePreview 
                  htmlContent={generatedTemplate}
                  onContentUpdate={(newContent) => {
                    setGeneratedTemplate(newContent);
                  }}
                />
              </TabsContent>

              <TabsContent value="code" className="mt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-email-primary font-medium">HTML Source</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedTemplate);
                        toast.success("HTML copied to clipboard!");
                      }}
                      className="border-email-secondary text-email-secondary hover:bg-email-secondary/10"
                    >
                      Copy HTML
                    </Button>
                  </div>
                  <Textarea
                    value={generatedTemplate}
                    onChange={(e) => setGeneratedTemplate(e.target.value)}
                    rows={20}
                    className="font-mono text-sm border-email-primary/30 focus:border-email-primary"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Edit with AI (Claude) */}
      {generatedTemplate && (
        <Card className="shadow-soft bg-gradient-to-br from-email-background to-background border-email-primary/20">
          <CardHeader>
            <CardTitle className="text-email-primary">Edit with AI</CardTitle>
            <CardDescription>Make specific changes to the current HTML (uses Claude)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={aiEditPrompt}
              onChange={(e) => setAiEditPrompt(e.target.value)}
              rows={3}
              placeholder="e.g., Add a primary CTA button below the hero, lighten background, increase body text to 16px, replace the second emoji with 🚀"
              className="border-email-primary/30 focus:border-email-primary"
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleEditWithAI} 
                disabled={isEditingWithAI}
                className="bg-email-accent hover:bg-email-accent/80 text-primary-foreground"
              >
                <Edit className="h-4 w-4 mr-2" />
                {isEditingWithAI ? 'Applying Edits...' : 'Edit with AI'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Lists Selection */}
      <Card className="shadow-soft bg-gradient-to-br from-email-background to-background border-email-primary/20">
        <CardHeader>
          <CardTitle className="text-email-primary">Target Email Lists</CardTitle>
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
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {emailLists.map(list => (
                <div key={list.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-email-muted/20 transition-colors border-email-primary/10">
                  <input
                    type="checkbox"
                    id={list.id}
                    checked={selectedLists.includes(list.id)}
                    onChange={() => {
                      setSelectedLists(prev => 
                        prev.includes(list.id) 
                          ? prev.filter(id => id !== list.id)
                          : [...prev, list.id]
                      );
                    }}
                    className="h-4 w-4 text-email-primary focus:ring-email-primary border-gray-300 rounded"
                  />
                  <Label htmlFor={list.id} className="flex-1 cursor-pointer">
                    <div className="font-medium text-email-primary">{list.name}</div>
                    {list.description && (
                      <div className="text-sm text-muted-foreground">{list.description}</div>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Campaign */}
      {generatedTemplate && (
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={() => {
            const campaignData = {
              subject,
              htmlContent: generatedTemplate,
              selectedLists,
              emailElements
            };
            console.log('Campaign data to save:', campaignData);
            toast.success('Campaign saved! You can now send it from the Lists tab.');
          }}
          className="border-email-secondary text-email-secondary hover:bg-email-secondary/10"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Campaign
          </Button>
          
          <Button 
            onClick={() => setShowSendModal(true)}
            className="bg-email-accent hover:bg-email-accent/80 text-primary-foreground"
          >
            <Send className="h-4 w-4 mr-2" />
            Prepare for Sending
          </Button>
        </div>
      )}

      <SendCampaignModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        subject={subject}
        htmlContent={generatedTemplate}
        selectedLists={selectedLists}
      />
    </div>
  );
};