import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Parse request body once and reuse
  const requestData = await req.json();
  const { prompt, subject, styleGuide, regenId } = requestData as { prompt: string; subject: string; styleGuide?: any; regenId?: number };

  // Choose a design variant to force fresh layouts on each regeneration
  const designVariants = ['hero-gradient', 'card-grid', 'split-feature', 'spotlight'] as const;
  const variantIndex = typeof regenId === 'number' ? Math.abs(regenId) % designVariants.length : Math.floor(Math.random() * designVariants.length);
  const chosenVariant = designVariants[variantIndex];

  try {

    console.log('Generating email with style guide:', styleGuide);

    const systemPrompt = `You are an expert email template designer creating clean, modern, non-spammy HTML email templates.

Style Guide Context:
- Brand Name: ${styleGuide?.brandName || 'Your Brand'}
- Primary Color: ${styleGuide?.primaryColor || '#684cff'}
- Secondary Color: ${styleGuide?.secondaryColor || '#22d3ee'}
- Accent Color: ${styleGuide?.accentColor || '#34d399'}
- Font Family: ${styleGuide?.fontFamily || 'Segoe UI, sans-serif'}
- Brand Voice: ${styleGuide?.brandVoice || 'Professional yet approachable'}
- Email Signature: ${styleGuide?.emailSignature || 'Best regards,\nThe Team'}

Create a CLEAN, MINIMAL, NON-SPAMMY email template that:
1. Uses simple, clean typography (no 3D effects, shadows, or fancy text styling)
2. Has plenty of white space and breathing room
3. Uses flat design principles - minimal gradients, simple colors
4. Easy on the eyes - subtle colors, good contrast, readable fonts
5. Simple call-to-action button (solid color, no fancy effects)
6. Clean layout with clear sections and good spacing
7. Mobile-responsive with inline CSS for email compatibility
8. Professional and trustworthy appearance
9. Minimalist design approach - less is more

CRITICAL: If the user provides a list of features/updates/items, you MUST include ALL of them in the email. Do not truncate, summarize, or skip any items. Show every single item they mention.

Design it like a clean newsletter from companies like Linear or Notion - minimal, professional, easy to read.
Make it visually clean while maintaining email client compatibility.

Return ONLY the complete HTML email template, no explanations or code blocks.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `${systemPrompt}

Create a stunning email template for: "${subject}"

Content prompt: ${prompt}

Layout variant: ${chosenVariant}. Design MUST differ materially between variants (structure, section order, and components). Use email-safe HTML/CSS only.

IMPORTANT: If the prompt contains a list of features or updates, make sure to include ALL of them in the email template. Do not truncate or skip any items from the list.

Return ONLY the complete HTML email template, no explanations or code blocks.`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', errorData);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const htmlContent = data.content[0]?.text || '';

    console.log('Beautiful email template generated successfully');

    return new Response(JSON.stringify({ htmlContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-email function:', error);

    // Premium fallback template with modern design - reuse parsed data
    
    const fallbackTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; margin: 0 !important; }
            .header { padding: 30px 20px !important; }
            .content { padding: 30px 20px !important; }
            .hero-title { font-size: 28px !important; }
            .button { width: 90% !important; }
            .feature-grid { flex-direction: column !important; }
            .feature-item { margin-bottom: 20px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
    <div style="padding: 40px 20px;">
        <table class="container" role="presentation" cellspacing="0" cellpadding="0" border="0" style="max-width: 650px; width: 100%; margin: 0 auto; background: #ffffff; border-radius: 24px; box-shadow: 0 32px 64px rgba(0,0,0,0.12); overflow: hidden; position: relative;">
            
            <!-- Decorative Background Pattern -->
            <tr>
                <td style="position: relative; background: linear-gradient(135deg, ${styleGuide?.primaryColor || '#684cff'} 0%, ${styleGuide?.secondaryColor || '#22d3ee'} 100%); padding: 0; height: 8px;"></td>
            </tr>
            
            <!-- Hero Header -->
            <tr>
                <td class="header" style="background: linear-gradient(135deg, ${styleGuide?.primaryColor || '#684cff'}15 0%, ${styleGuide?.secondaryColor || '#22d3ee'}08 100%); padding: 50px 40px; text-align: center; position: relative; border-bottom: 1px solid #f1f5f9;">
                    <!-- Floating Elements -->
                    <div style="position: absolute; top: 20px; right: 30px; width: 40px; height: 40px; background: linear-gradient(45deg, ${styleGuide?.accentColor || '#34d399'}20, ${styleGuide?.primaryColor || '#684cff'}15); border-radius: 50%; opacity: 0.6;"></div>
                    <div style="position: absolute; bottom: 30px; left: 40px; width: 24px; height: 24px; background: ${styleGuide?.secondaryColor || '#22d3ee'}25; border-radius: 50%; opacity: 0.4;"></div>
                    
                    <div style="position: relative; z-index: 1;">
                        <h1 style="margin: 0 0 8px 0; color: #1e293b; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2;">${styleGuide?.brandName || 'Your Brand'}</h1>
                        <div style="width: 80px; height: 3px; background: linear-gradient(90deg, ${styleGuide?.primaryColor || '#684cff'}, ${styleGuide?.accentColor || '#34d399'}); margin: 16px auto; border-radius: 2px;"></div>
                        <h2 class="hero-title" style="margin: 24px 0 0 0; color: #334155; font-size: 32px; font-weight: 600; line-height: 1.3; letter-spacing: -0.3px;">${subject}</h2>
                    </div>
                </td>
            </tr>
            
            <!-- Main Content -->
            <tr>
                <td class="content" style="padding: 50px 40px; background: #ffffff;">
                    
                    <!-- Welcome Message -->
                    <div style="background: linear-gradient(135deg, ${styleGuide?.primaryColor || '#684cff'}08 0%, ${styleGuide?.accentColor || '#34d399'}05 100%); border-radius: 16px; padding: 32px; margin-bottom: 40px; border: 1px solid ${styleGuide?.primaryColor || '#684cff'}15;">
                        <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">Hello there! 👋</h3>
                        <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #475569;">${prompt}</p>
                    </div>
                    
                    <!-- Feature Highlights -->
                    <div style="margin-bottom: 40px;">
                        <h3 style="margin: 0 0 24px 0; color: #1e293b; font-size: 18px; font-weight: 600; text-align: center;">What makes this special?</h3>
                        <div class="feature-grid" style="display: flex; gap: 20px; flex-wrap: wrap;">
                            <div class="feature-item" style="flex: 1; min-width: 150px; background: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; border: 1px solid #e2e8f0;">
                                <div style="width: 48px; height: 48px; background: linear-gradient(135deg, ${styleGuide?.primaryColor || '#684cff'}, ${styleGuide?.accentColor || '#34d399'}); border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                                    <span style="color: white; font-size: 20px;">✨</span>
                                </div>
                                <h4 style="margin: 0 0 8px 0; color: #334155; font-size: 14px; font-weight: 600;">Premium Quality</h4>
                                <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">Crafted with attention to detail</p>
                            </div>
                            <div class="feature-item" style="flex: 1; min-width: 150px; background: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; border: 1px solid #e2e8f0;">
                                <div style="width: 48px; height: 48px; background: linear-gradient(135deg, ${styleGuide?.accentColor || '#34d399'}, ${styleGuide?.secondaryColor || '#22d3ee'}); border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                                    <span style="color: white; font-size: 20px;">🚀</span>
                                </div>
                                <h4 style="margin: 0 0 8px 0; color: #334155; font-size: 14px; font-weight: 600;">Fast & Reliable</h4>
                                <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">Built for performance</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- CTA Section -->
                    <div style="text-align: center; margin: 50px 0 40px 0; padding: 40px 20px; background: linear-gradient(135deg, ${styleGuide?.primaryColor || '#684cff'}05 0%, ${styleGuide?.secondaryColor || '#22d3ee'}03 100%); border-radius: 20px; border: 1px solid ${styleGuide?.primaryColor || '#684cff'}10;">
                        <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">Ready to get started?</h3>
                        <p style="margin: 0 0 32px 0; color: #64748b; font-size: 15px; line-height: 1.6;">Join thousands of satisfied customers who trust us with their needs.</p>
                        
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                            <tr>
                                <td style="border-radius: 50px; background: linear-gradient(135deg, ${styleGuide?.accentColor || '#34d399'} 0%, ${styleGuide?.primaryColor || '#684cff'} 100%); box-shadow: 0 12px 24px ${styleGuide?.accentColor || '#34d399'}40; transition: all 0.3s ease;">
                                    <a href="#" class="button" style="display: inline-block; padding: 18px 36px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 50px; letter-spacing: 0.3px; transition: all 0.3s ease;">
                                        Take Action Now →
                                    </a>
                                </td>
                            </tr>
                        </table>
                        
                        <p style="margin: 24px 0 0 0; color: #94a3b8; font-size: 13px;">No spam, unsubscribe at any time</p>
                    </div>
                    
                </td>
            </tr>
            
            <!-- Footer -->
            <tr>
                <td style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <div style="margin-bottom: 24px;">
                        <pre style="margin: 0; font-family: 'Inter', sans-serif; font-size: 14px; color: #475569; white-space: pre-line; font-weight: 500;">${styleGuide?.emailSignature || 'Best regards,\nThe Team'}</pre>
                    </div>
                    
                    <div style="border-top: 1px solid #d1d5db; padding-top: 24px;">
                        <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b; font-weight: 500;">© 2024 ${styleGuide?.brandName || 'Your Brand'}. All rights reserved.</p>
                        <div style="margin-top: 16px;">
                            <a href="#" style="color: #6366f1; text-decoration: none; font-size: 13px; font-weight: 500; margin: 0 12px;">Update preferences</a>
                            <span style="color: #cbd5e1;">|</span>
                            <a href="#" style="color: #6366f1; text-decoration: none; font-size: 13px; font-weight: 500; margin: 0 12px;">Unsubscribe</a>
                        </div>
                    </div>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>`;

    return new Response(JSON.stringify({ htmlContent: fallbackTemplate }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});