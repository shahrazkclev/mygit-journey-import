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

1. **MINIMAL & CLEAN DESIGN**: 
   - Single column layout, max 600px width
   - Generous white space and padding
   - Clean typography with clear hierarchy
   - Simple, uncluttered sections

2. **COLOR PALETTE** (use these exact colors):
   - Background: #FFFFFF (white)
   - Content cards: #F9F8F5 (light warm off-white)
   - Primary text: #333333 (dark gray)
   - Button background: #6A7059 (muted olive green)
   - Button text: #FFFFFF (white)
   - Accent/highlights: #FCD34D (warm yellow/gold)

3. **TYPOGRAPHY**:
   - Font: Inter, Lato, or Open Sans
   - Large, bold headings (24-28px)
   - Medium section titles (18-20px)
   - Body text (14-16px), left-aligned
   - Clean, simple styling

4. **COMPONENTS**:
   - Header: Brand name with "Cleverpoly" highlighted in accent color
   - Salutation: "Hey [Name]," 
   - Content cards: Light background, rounded corners, generous padding
   - Primary CTA: Solid olive button with white text, slightly rounded
   - Secondary links: Text with arrow "→"
   - Footer: Simple contact info and signature

5. **LAYOUT STRUCTURE**:
   - Simple header with brand name
   - Clean main title
   - Generous spacing between sections
   - Card-based content organization
   - Single prominent call-to-action
   - Clean footer

AVOID:
- Gradients, complex backgrounds, decorative elements
- Multiple colors beyond the specified palette
- Complex layouts, grids, or fancy components
- Excessive styling or visual noise

Create a template that looks EXACTLY like professional, minimal email design - clean, organized, and user-friendly.`;

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
    const htmlContent = data.content[0]?.text || '';

    console.log('Clean minimal email template generated successfully');

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
            .content { padding: 30px 20px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', sans-serif; background: #FFFFFF; color: #333333;">
    <div style="padding: 20px;">
        <table class="container" role="presentation" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; margin: 0 auto; background: #FFFFFF;">
            
            <!-- Header -->
            <tr>
                <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #333333; font-size: 24px; font-weight: 600;">
                        <span style="background: #FCD34D; padding: 2px 8px; border-radius: 4px;">Cleverpoly</span>.Store
                    </h1>
                </td>
            </tr>
            
            <!-- Main Title -->
            <tr>
                <td style="padding: 20px 40px 40px 40px; text-align: center;">
                    <h2 style="margin: 0; color: #333333; font-size: 28px; font-weight: 600; line-height: 1.3;">${subject}</h2>
                </td>
            </tr>
            
            <!-- Content -->
            <tr>
                <td class="content" style="padding: 0 40px 40px 40px;">
                    
                    <!-- Salutation -->
                    <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">Hey [Name],</p>
                    
                    <!-- Main Content Card -->
                    <div style="background: #F9F8F5; border-radius: 8px; padding: 30px; margin: 30px 0;">
                        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #333333;">${prompt}</p>
                    </div>
                    
                    <!-- Downloads Section -->
                    <div style="margin: 40px 0;">
                        <h3 style="margin: 0 0 16px 0; color: #333333; font-size: 18px; font-weight: 600; display: flex; align-items: center;">
                            📦 Your Downloads
                        </h3>
                        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #333333;">
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
                        <h3 style="margin: 0 0 16px 0; color: #333333; font-size: 18px; font-weight: 600; display: flex; align-items: center;">
                            📋 Installation Guide
                        </h3>
                        <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                            Need help installing? Check out our step-by-step installation guide:
                        </p>
                        <p style="margin: 0; font-size: 16px;">
                            <a href="#" style="color: #333333; text-decoration: none;">View Installation Instructions →</a>
                        </p>
                    </div>
                    
                    <!-- Additional Info -->
                    <div style="margin: 40px 0;">
                        <p style="margin: 0 0 12px 0; font-size: 16px; color: #333333;">Want to explore more assets?</p>
                        <p style="margin: 0; font-size: 16px;">
                            Visit <span style="background: #FCD34D; padding: 1px 4px; border-radius: 3px;">Cleverpoly</span> Store →
                        </p>
                    </div>
                    
                </td>
            </tr>
            
            <!-- Footer -->
            <tr>
                <td style="padding: 40px; text-align: left; border-top: 1px solid #F9F8F5;">
                    <p style="margin: 0 0 16px 0; font-size: 16px; color: #333333;">
                        If you have any questions or need assistance, feel free to contact us at 
                        <span style="background: #FCD34D; padding: 1px 4px; border-radius: 3px;">cleverpoly</span>.store@gmail.com
                    </p>
                    
                    <div style="margin-top: 30px;">
                        <p style="margin: 0; font-size: 16px; color: #333333;">Best regards,</p>
                        <p style="margin: 0; font-size: 16px; color: #333333; font-weight: 500;">
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