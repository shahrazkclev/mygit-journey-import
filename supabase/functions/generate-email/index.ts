import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, subject } = await req.json();
    
    console.log('=== EMAIL GENERATION REQUEST ===');
    console.log('Prompt:', prompt);
    console.log('Subject:', subject);

    // Get the latest style guide from database
    const { data: styleData, error } = await supabase
      .from('style_guides')
      .select('*')
      .eq('user_id', '550e8400-e29b-41d4-a716-446655440000')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
    }

    console.log('Style data from DB:', styleData);

    // Parse JSON prompt if it exists
    let jsonStyle = null;
    if (styleData?.template_preview) {
      try {
        jsonStyle = JSON.parse(styleData.template_preview);
        console.log('Parsed JSON style:', jsonStyle);
      } catch (e) {
        console.log('Failed to parse JSON style, using database fields');
      }
    }

    // Build style information (JSON first, then database fields, then defaults)
    const brandName = jsonStyle?.brandName || styleData?.brand_name || 'Cleverpoly';
    const primaryColor = jsonStyle?.colors?.primary || styleData?.primary_color || '#6A7059';
    const secondaryColor = jsonStyle?.colors?.secondary || styleData?.secondary_color || '#F9F8F5';
    const accentColor = jsonStyle?.colors?.accent || styleData?.accent_color || '#FCD34D';
    const fontFamily = jsonStyle?.typography?.fontFamily || styleData?.font_family || 'Inter, sans-serif';
    const brandVoice = jsonStyle?.voice?.description || styleData?.brand_voice || 'Professional and friendly';
    const signature = jsonStyle?.signature || styleData?.email_signature || 'Best regards,\nThe Team';

    console.log('Final style being used:', {
      brandName, primaryColor, secondaryColor, accentColor, fontFamily, brandVoice, signature
    });

    // Create the AI prompt
    const systemPrompt = `You are an expert email designer. Create a professional HTML email template.

BRAND STYLE:
- Brand: ${brandName}
- Primary Color: ${primaryColor}
- Secondary Color: ${secondaryColor} 
- Accent Color: ${accentColor}
- Font: ${fontFamily}
- Voice: ${brandVoice}
- Signature: ${signature}

REQUIREMENTS:
1. Use these exact colors and fonts
2. Mobile responsive HTML email structure
3. Clean, professional design
4. Include the signature at the bottom
5. Use proper email-safe HTML structure

Create the HTML email for:
Subject: ${subject}
Content: ${prompt}`;

    // Call Claude API
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
        messages: [{
          role: 'user',
          content: systemPrompt
        }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const htmlContent = data.content[0]?.text || '';

    console.log('Generated email HTML successfully');

    return new Response(JSON.stringify({ htmlContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating email:', error);
    
    // Simple fallback template
    const fallbackHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px;">
    <h1 style="color: #6A7059; margin: 0 0 20px 0;">Cleverpoly</h1>
    <h2 style="color: #333; margin: 0 0 20px 0;">Sorry, there was an error generating your email</h2>
    <p style="color: #666; line-height: 1.6;">Please try again or contact support if the issue persists.</p>
    <p style="margin-top: 40px; color: #666;">Best regards,<br>The Team</p>
  </div>
</body>
</html>`;

    return new Response(JSON.stringify({ htmlContent: fallbackHtml }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});