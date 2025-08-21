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
  const { prompt, subject, themeColors, regenId } = requestData as { 
    prompt: string; 
    subject: string; 
    themeColors?: any; 
    regenId?: number 
  };

  try {
    console.log('Generating clean, minimal email template');

    const systemPrompt = `You are an expert email template designer creating clean, minimal HTML email templates in the style of the Cleverpoly brand.

CRITICAL STYLE REQUIREMENTS - Match this exact aesthetic:

1. **RESPONSIVE DESIGN**: 
   - Mobile (≤600px): Smaller fonts, tighter padding, single column
   - Desktop (>600px): Larger fonts, generous padding, optimal spacing
   - Use CSS media queries with proper email client compatibility

2. **MINIMAL & CLEAN DESIGN**: 
   - Single column layout, max 600px width
   - Fluid, responsive spacing and typography
   - Clean typography with clear hierarchy
   - Simple, uncluttered sections

3. **COLOR PALETTE** (use these exact colors):
   - Background: #FFFFFF (white)
   - Content cards: #F9F8F5 (light warm off-white)
   - Primary text: #333333 (dark gray)
   - Button background: #6A7059 (muted olive green)
   - Button text: #FFFFFF (white)
   - Accent/highlights: #FCD34D (warm yellow/gold)

4. **RESPONSIVE TYPOGRAPHY**:
   - Font: Inter, Lato, or Open Sans
   - Mobile: Headings (20-24px), sections (16px), body (14px)
   - Desktop: Headings (24-28px), sections (18px), body (16px)
   - Clean, simple styling with proper line-height

5. **RESPONSIVE SPACING**:
   - Mobile: Tighter padding (20px), smaller margins (20px)
   - Desktop: Generous padding (30-40px), larger margins (30-40px)
   - Cards adapt: Mobile (20px padding), Desktop (30px padding)

6. **COMPONENTS**:
   - Header: Brand name with "Cleverpoly" highlighted in accent color
   - Salutation: "Hey [Name]," 
   - Content cards: Light background, rounded corners, responsive padding
   - Primary CTA: Solid olive button with white text, slightly rounded
   - Secondary links: Text with arrow "→"
   - Footer: Simple contact info and signature

7. **LAYOUT STRUCTURE**:
   - Simple header with brand name
   - Clean main title
   - Responsive spacing between sections
   - Card-based content organization
   - Single prominent call-to-action
   - Clean footer

RESPONSIVE CSS REQUIREMENTS:
- Use proper media queries for mobile (max-width: 600px) and desktop (min-width: 601px)
- Apply responsive classes: .container, .content, .header, .main-title, .section-title, .body-text, .card
- Mobile: smaller fonts, tighter padding
- Desktop: larger fonts, generous padding

AVOID:
- Fixed sizes that don't scale
- Gradients, complex backgrounds, decorative elements
- Multiple colors beyond the specified palette
- Complex layouts, grids, or fancy components
- Excessive styling or visual noise

Create a template that scales perfectly from mobile to desktop with proper responsive design.`;

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

Create a clean, minimal email template for: "${subject}"

Content prompt: ${prompt}

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
    let htmlContent = data.content[0]?.text || '';

    // Enforce strict Cleverpoly minimal style by sanitizing AI output
    const cssReset = `
      body{margin:0 !important;background:#FFFFFF !important;color:#333333 !important;font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;}
      .container{max-width:600px !important;width:100% !important;margin:0 auto !important;}
      .content{padding:40px !important;}
      .card{background:#F9F8F5 !important;border-radius:8px !important;}
      a.button,.button,button,.btn{background:#6A7059 !important;color:#FFFFFF !important;border-radius:6px !important;text-decoration:none !important;}
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
        .replace(/border-radius:\s*(?:[1-9]\d|\d{3,})px/gi, 'border-radius:8px');

    htmlContent = ensureInjected(stripGradientsAndExcess(htmlContent));

    console.log('Clean minimal email template generated successfully (sanitized)');

    return new Response(JSON.stringify({ htmlContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-email function:', error);

    // Clean, minimal fallback template matching Cleverpoly style
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
<body style="margin: 0; padding: 0; font-family: 'Inter', sans-serif; background: #FFFFFF; color: #333333;">
    <div style="padding: 20px;">
        <table class="container" role="presentation" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; margin: 0 auto; background: #FFFFFF;">
            
            <!-- Header -->
            <tr>
                <td class="header" style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #333333; font-size: 24px; font-weight: 600;">
                        <span style="background: #FCD34D; padding: 2px 8px; border-radius: 4px;">Cleverpoly</span>.Store
                    </h1>
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
                    <div class="card" style="background: #F9F8F5; border-radius: 8px; padding: 30px; margin: 30px 0;">
                        <p class="body-text" style="margin: 0; font-size: 16px; line-height: 1.6; color: #333333;">${prompt}</p>
                    </div>
                    
                    <!-- Downloads Section -->
                    <div style="margin: 40px 0;">
                        <h3 class="section-title" style="margin: 0 0 16px 0; color: #333333; font-size: 18px; font-weight: 600; display: flex; align-items: center;">
                            📦 Your Downloads
                        </h3>
                        <p class="body-text" style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                            Access your files through the download button below. All future updates will be available in the same location.
                        </p>
                        
                        <!-- CTA Button -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td style="border-radius: 6px; background: #6A7059;">
                                    <a href="#" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 500; color: #FFFFFF; text-decoration: none; border-radius: 6px;">
                                        Download Files
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <!-- Installation Guide -->
                    <div style="margin: 40px 0;">
                        <h3 class="section-title" style="margin: 0 0 16px 0; color: #333333; font-size: 18px; font-weight: 600; display: flex; align-items: center;">
                            📋 Installation Guide
                        </h3>
                        <p class="body-text" style="margin: 0 0 12px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                            Need help installing? Check out our step-by-step installation guide:
                        </p>
                        <p class="body-text" style="margin: 0; font-size: 16px;">
                            <a href="#" style="color: #333333; text-decoration: none;">View Installation Instructions →</a>
                        </p>
                    </div>
                    
                    <!-- Additional Info -->
                    <div style="margin: 40px 0;">
                        <p class="body-text" style="margin: 0 0 12px 0; font-size: 16px; color: #333333;">Want to explore more assets?</p>
                        <p class="body-text" style="margin: 0; font-size: 16px;">
                            Visit <span style="background: #FCD34D; padding: 1px 4px; border-radius: 3px;">Cleverpoly</span> Store →
                        </p>
                    </div>
                    
                </td>
            </tr>
            
            <!-- Footer -->
            <tr>
                <td class="content" style="padding: 40px; text-align: left; border-top: 1px solid #F9F8F5;">
                    <p class="body-text" style="margin: 0 0 16px 0; font-size: 16px; color: #333333;">
                        If you have any questions or need assistance, feel free to contact us at 
                        <span style="background: #FCD34D; padding: 1px 4px; border-radius: 3px;">cleverpoly</span>.store@gmail.com
                    </p>
                    
                    <div style="margin-top: 30px;">
                        <p class="body-text" style="margin: 0; font-size: 16px; color: #333333;">Best regards,</p>
                        <p class="body-text" style="margin: 0; font-size: 16px; color: #333333; font-weight: 500;">
                            <span style="background: #FCD34D; padding: 1px 4px; border-radius: 3px;">Cleverpoly</span>
                        </p>
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