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
    console.log('Subject:', subject);
    console.log('Prompt:', prompt);

    // Get the JSON style guide from database
    const { data: styleData } = await supabase
      .from('style_guides')
      .select('template_preview')
      .eq('user_id', '550e8400-e29b-41d4-a716-446655440000')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let jsonStyleGuide = null;
    if (styleData?.template_preview) {
      try {
        jsonStyleGuide = JSON.parse(styleData.template_preview);
        console.log('✅ Found JSON style guide');
      } catch (e) {
        console.log('❌ Failed to parse JSON style guide');
      }
    }

    let systemPrompt;

    if (jsonStyleGuide) {
      // SEND YOUR JSON DIRECTLY TO CLAUDE
      systemPrompt = `${JSON.stringify(jsonStyleGuide, null, 2)}

EMAIL GENERATION REQUEST:
Subject: "${subject}"
Content: ${prompt}

Follow the JSON style guide above EXACTLY. Create a beautiful, clean HTML email template that implements every specification in the JSON. Pay special attention to:
- Layout: Single-column, 600px max width, generous white space
- Colors: Use exact hex codes specified in colorPalette
- Typography: Clean sans-serif fonts, proper hierarchy
- Components: Header "Cleverpoly.Store", salutation "Hey {{name}},", content cards with #F9F8F5 background
- Footer: Include exact contact info and salutation

Generate professional, beautiful HTML email code.`;
    } else {
      // Simple fallback if no JSON
      systemPrompt = `Create a professional HTML email template for Cleverpoly.Store.
      
Subject: "${subject}"
Content: ${prompt}

Use clean design, professional colors, and proper email HTML structure.`;
    }

    console.log('Sending to Claude...');

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

    console.log('✅ Email generated successfully');

    return new Response(JSON.stringify({ htmlContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error generating email:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to generate email',
      htmlContent: `<html><body><h1>Error</h1><p>Failed to generate email: ${error.message}</p></body></html>`
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});