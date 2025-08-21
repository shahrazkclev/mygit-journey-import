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
  const { prompt, subject, themeColors, regenId, styleGuide, templatePreview } = requestData as { 
    prompt: string; 
    subject: string; 
    themeColors?: any; 
    regenId?: number; 
    styleGuide?: any;
    templatePreview?: string;
  };

  try {
    console.log('Generating clean, minimal email template with strict brand compliance');

    // Resolve brand tokens from style guide or theme colors
    const brandName = styleGuide?.brandName || 'Cleverpoly';
    const primary = styleGuide?.primaryColor || themeColors?.primary || '#6A7059';
    const secondary = styleGuide?.secondaryColor || themeColors?.secondary || '#F9F8F5';
    const accent = styleGuide?.accentColor || themeColors?.accent || '#FCD34D';
    const fontFamily = styleGuide?.fontFamily || "Inter, Lato, 'Open Sans', Arial, sans-serif";

    // Parse saved style prompt if available
    let savedStylePrompt = null;
    try {
      if (templatePreview && templatePreview.trim().length > 0) {
        savedStylePrompt = JSON.parse(templatePreview);
      }
    } catch (e) {
      console.log('No valid style prompt found, using defaults');
    }

    // Use saved style or fallback to passed values
    const finalBrandName = savedStylePrompt?.brandName || brandName;
    const finalPrimary = savedStylePrompt?.colors?.primary || primary;
    const finalSecondary = savedStylePrompt?.colors?.secondary || secondary;
    const finalAccent = savedStylePrompt?.colors?.accent || accent;
    const finalFont = savedStylePrompt?.typography?.fontFamily || fontFamily;
    const finalVoice = savedStylePrompt?.voice?.description || styleGuide?.brandVoice || 'Professional and clean';
    const finalSignature = savedStylePrompt?.signature || styleGuide?.emailSignature || 'Best regards,\nThe Team';

    const systemPrompt = `You are an expert email template designer. Create clean, professional email templates using this EXACT brand style:

BRAND STYLE GUIDE:
- Brand Name: ${finalBrandName}
- Primary Color: ${finalPrimary} (use for headers, buttons, main branding)
- Secondary Color: ${finalSecondary} (use for content cards, subtle backgrounds)
- Accent Color: ${finalAccent} (use sparingly for highlights and brand name styling)
- Font Family: ${finalFont}
- Brand Voice: ${finalVoice}
- Email Signature: ${finalSignature}

TEMPLATE REQUIREMENTS:
1. Use EXACTLY these colors: Primary ${finalPrimary}, Secondary ${finalSecondary}, Accent ${finalAccent}
2. Header with brand name styled as: <span style="background:${finalAccent}">${finalBrandName.split('.')[0]}</span>${finalBrandName.includes('.') ? '.' + finalBrandName.split('.')[1] : ''}
3. Content cards with ${finalSecondary} background
4. Buttons with ${finalPrimary} background and white text
5. Include the signature: ${finalSignature}
6. Use font family: ${finalFont}
7. Clean, minimal design - no gradients or fancy styling
8. Mobile responsive with proper table structure

Generate a complete HTML email that matches this exact brand style.`;

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

Subject: "${subject}"
Content: ${prompt}

Return ONLY the complete HTML email template that matches the brand exactly. Do not use markdown code fences or triple backticks.`
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
    let htmlContent = data.content[0]?.text || '';

    // Enforce strict brand compliance by sanitizing AI output
    const cssReset = `
      body{margin:0 !important;background:#FFFFFF !important;color:#333333 !important;font-family:${finalFont} !important;}
      .container{max-width:600px !important;width:100% !important;margin:0 auto !important;}
      .content{padding:40px !important;}
      .card{background:${finalSecondary} !important;border-radius:8px !important;}
      a.button,.button,button,.btn{background:${finalPrimary} !important;color:#FFFFFF !important;border-radius:6px !important;text-decoration:none !important;}
      *{background-image:none !important;box-shadow:none !important;}
    `.trim();

    const mobileCss = `
      .content{padding:20px !important;}
      .header{padding:30px 20px 15px 20px !important;}
      .main-title{font-size:24px !important;}
      .section-title{font-size:16px !important;}
      .body-text{font-size:14px !important;}
      .card{padding:20px !important;margin:20px 0 !important;}
    `.trim();

    const injectReset = `<style id="cleverpoly-reset">
${cssReset}
@media only screen and (max-width: 600px) {
${mobileCss}
}
</style>`;

    const ensureInjected = (s: string) => {
      if (s.includes('</head>')) {
        return s.replace('</head>', `${injectReset}</head>`);
      }
      const content = s.replace(/^<!DOCTYPE[^>]*>/i,'').replace(/^<html[^>]*>/i,'').replace(/<\/html>/i,'');
      return `<!DOCTYPE html><html><head>${injectReset}</head>${content}</html>`;
    };

    const stripGradientsAndExcess = (s: string) =>
      s
        // Remove gradients and background images
        .replace(/background(-image)?:\s*linear-gradient\([^;>]*\);?/gi, '')
        .replace(/background-image:\s*url\([^)]*\);?/gi, '')
        .replace(/background-image:[^;>]*;?/gi, '')
        // Normalize overly rounded corners and shadows
        .replace(/box-shadow:[^;>]*;?/gi, '')
        .replace(/border-radius:\s*(?:[1-9]\d|\d{3,})px/gi, 'border-radius:8px')
        // Force brand colors using final values
        .replace(/#[0-9a-fA-F]{6}/gi, (match) => {
          if (match.toLowerCase() === finalPrimary.toLowerCase()) return finalPrimary;
          if (match.toLowerCase() === finalSecondary.toLowerCase()) return finalSecondary;
          if (match.toLowerCase() === finalAccent.toLowerCase()) return finalAccent;
          if (match === '#FFFFFF' || match === '#ffffff') return '#FFFFFF';
          if (match === '#333333') return '#333333';
          return finalPrimary; // Default problematic colors to primary
        });

    htmlContent = ensureInjected(stripGradientsAndExcess(htmlContent));

    console.log('Email template generated with strict brand compliance');

    return new Response(JSON.stringify({ htmlContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-email function:', error);

    // Brand-compliant fallback template
    const brandName = styleGuide?.brandName || 'Cleverpoly';
    const primary = styleGuide?.primaryColor || '#6A7059';
    const secondary = styleGuide?.secondaryColor || '#F9F8F5';
    const accent = styleGuide?.accentColor || '#FCD34D';
    const fontFamily = styleGuide?.fontFamily || "Inter, 'Open Sans', Arial, sans-serif";

    const fallbackTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; margin: 10px !important; }
            .content { padding: 20px !important; }
            .header { padding: 30px 20px 15px 20px !important; }
            .main-title { font-size: 24px !important; }
            .section-title { font-size: 16px !important; }
            .body-text { font-size: 14px !important; }
            .card { padding: 20px !important; margin: 20px 0 !important; }
        }
        @media only screen and (min-width: 601px) {
            .container { max-width: 600px; }
            .content { padding: 40px; }
            .header { padding: 40px 40px 20px 40px; }
            .main-title { font-size: 28px; }
            .section-title { font-size: 18px; }
            .body-text { font-size: 16px; }
            .card { padding: 30px; margin: 30px 0; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: ${fontFamily}; background: #FFFFFF; color: #333333;">
    <div style="padding: 20px;">
        <table class="container" role="presentation" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; margin: 0 auto; background: #FFFFFF;">
            
            <!-- Header -->
            <tr>
                <td class="header" style="padding: 40px 40px 20px 40px; text-align: center; background: ${primary};">
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 600;">
                        <span style="background: ${accent}; color: #333333; padding: 2px 8px; border-radius: 4px;">${brandName.split('.')[0]}</span>${brandName.includes('.') ? '.' + brandName.split('.')[1] : ''}
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #FFFFFF; opacity: 0.9;">Sample Email Header</p>
                </td>
            </tr>
            
            <!-- Main Title -->
            <tr>
                <td class="header" style="padding: 20px 40px 40px 40px; text-align: center;">
                    <h2 class="main-title" style="margin: 0; color: #333333; font-size: 28px; font-weight: 600; line-height: 1.3;">${subject}</h2>
                </td>
            </tr>
            
            <!-- Content -->
            <tr>
                <td class="content" style="padding: 0 40px 40px 40px;">
                    
                    <!-- Salutation -->
                    <p class="body-text" style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">Hey [Name],</p>
                    
                    <!-- Main Content Card -->
                    <div class="card" style="background: ${secondary}; border-radius: 8px; padding: 30px; margin: 30px 0;">
                        <p class="body-text" style="margin: 0; font-size: 16px; line-height: 1.6; color: #333333;">${prompt}</p>
                    </div>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                            <tr>
                                <td style="border-radius: 6px; background: ${primary};">
                                    <a href="#" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 500; color: #FFFFFF; text-decoration: none; border-radius: 6px;">
                                        Take Action
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                </td>
            </tr>
            
            <!-- Footer -->
            <tr>
                <td class="content" style="padding: 40px; text-align: left; border-top: 1px solid ${secondary};">
                    <p class="body-text" style="margin: 0 0 16px 0; font-size: 16px; color: #333333;">
                        If you have any questions or need assistance, feel free to contact us.
                    </p>
                    
                    <div style="margin-top: 30px;">
                        <p class="body-text" style="margin: 0; font-size: 16px; color: #333333;">Best regards,</p>
                        <p class="body-text" style="margin: 0; font-size: 16px; color: #333333; font-weight: 500;">${brandName}</p>
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