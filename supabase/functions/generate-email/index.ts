import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

  try {
    const { subject = 'Hello', prompt = '', styleGuide, userId = '550e8400-e29b-41d4-a716-446655440000' } = await req.json();

    console.log('🧠 [generate-email] Request received', { subject });

    // Get custom AI instructions from database
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: settings } = await supabase
      .from('user_settings')
      .select('ai_instructions')
      .eq('user_id', userId)
      .single();

    const defaultInstructions = `You are an expert email content creator. Create clean, professional email content that follows these guidelines:

1. STRUCTURE - Keep it simple and clean:
   - Start with "Hey {{name}}," as the greeting
   - Use minimal sections with proper spacing
   - Avoid excessive decorative elements or highlights
   - End with a signature section

2. CONTENT REQUIREMENTS:
   - Write in a professional yet friendly tone
   - Be specific and actionable
   - Include relevant details and clear calls-to-action
   - End with "Best regards," followed by the sender's name on a new line

3. STYLING - Keep it minimal and professional:
   - Use simple paragraph structure for most content
   - Only use <div class="content-section"> for main content blocks when absolutely needed
   - Use <a href="#" class="button"> only for actual call-to-action buttons
   - Avoid excessive highlighting or decorative containers

4. VISUAL ELEMENTS:
   - Use emojis very sparingly (0-1 per email maximum)
   - Create clean visual hierarchy with simple headers
   - Focus on readability over decoration

EXAMPLE CLEAN STRUCTURE:
Hey {{name}},

Thank you for your purchase!

Your order details and download instructions are provided below.

<a href="#" class="button">Download Files</a>

Best regards,
Your Name

Return ONLY the clean email content.`;

    const aiInstructions = settings?.ai_instructions || defaultInstructions;

    // Create system prompt with custom instructions and brand colors
    const brandColors = styleGuide ? `
BRAND COLORS TO USE:
- Primary Color: ${styleGuide.primaryColor}
- Secondary Color: ${styleGuide.secondaryColor || '#22d3ee'}
- Accent Color: ${styleGuide.accentColor || '#34d399'}
` : '';

    const systemPrompt = `${aiInstructions}

${brandColors}
CONTENT REQUIREMENTS:
- Subject: "${subject}"
- Content: ${prompt}

Return ONLY the email content following the instructions above.`;

    // Call Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': String(claudeApiKey),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: systemPrompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    let aiContent: string = data.content?.[0]?.text || String(prompt || '');

    // Clean up any markdown artifacts and normalize content
    aiContent = aiContent
      .replace(/```html\s*/gi, '')  // Remove opening markdown fence
      .replace(/```\s*$/g, '')      // Remove closing markdown fence
      .replace(/^\s*html\s*/i, '')  // Remove "html" text
      .trim();

    // Early check: if AI returned a full HTML document or document-like content, passthrough immediately (no modifications)
    const isDocumentLike = /<!DOCTYPE\s+html/i.test(aiContent) || /^\s*<html\b/i.test(aiContent) || (/<head\b/i.test(aiContent) && /<body\b/i.test(aiContent));
    if (isDocumentLike) {
      let passthrough = aiContent;
      const hasHtmlClose = /<\/html>/i.test(passthrough);
      const hasBodyClose = /<\/body>/i.test(passthrough);
      if (!hasBodyClose && /<body\b/i.test(passthrough)) {
        passthrough += '\n</body>';
      }
      if (!hasHtmlClose && /<html\b/i.test(passthrough)) {
        passthrough += '\n</html>';
      }
      console.log('ℹ️ [generate-email] Document-like HTML from AI - passthrough');
      return new Response(JSON.stringify({ htmlContent: passthrough }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine if AI returned HTML fragments (not a full document)
    const containsHtml = /<(div|section|table|article|header|footer|p|h1|h2|h3|ul|ol|li|a|button|style|span)\b/i.test(aiContent);

    // For plain text only: add greeting if completely missing
    if (!containsHtml) {
      const hasGreetingAnywhere = /(hey|hi|hello)\s*\{\{\s*name\s*\}\}/i.test(aiContent);
      if (!hasGreetingAnywhere) {
        aiContent = `Hey {{name}},\n\n${aiContent}`;
      }
    }

    console.log('✅ [generate-email] Content cleaned:', aiContent.slice(0, 100));

    // Determine body content (preserve HTML if present)
    let bodyContent: string;
    if (containsHtml) {
      bodyContent = aiContent;
    } else {
      const blocks = aiContent.split('\n\n').filter(b => b.trim());
      bodyContent = blocks.map((b) => `<p class="paragraph">${b.trim()}</p>`).join('\n    ');
    }

    // Style guide
    const brandName = styleGuide?.brandName || 'Cleverpoly.Store';
    const primaryColor = styleGuide?.primaryColor || '#6A7059';
    const fontFamily = styleGuide?.fontFamily || "Inter, Lato, 'Open Sans', Arial, sans-serif";
    const emailSignature = styleGuide?.emailSignature || 'Best regards,\nCleverpoly';
    const signatureFont = styleGuide?.signatureFont || "'Inter', sans-serif";

    const googleFontsImport = signatureFont.includes('Inter')
      ? "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');"
      : signatureFont.includes('Roboto')
      ? "@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');"
      : signatureFont.includes('Open Sans')
      ? "@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600&display=swap');"
      : signatureFont.includes('Lato')
      ? "@import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap');"
      : signatureFont.includes('Playfair Display')
      ? "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap');"
      : signatureFont.includes('Merriweather')
      ? "@import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap');"
      : signatureFont.includes('Source Code Pro')
      ? "@import url('https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500&display=swap');"
      : signatureFont.includes('Dancing Script')
      ? "@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap');"
      : signatureFont.includes('Pacifico')
      ? "@import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');"
      : signatureFont.includes('Lobster')
      ? "@import url('https://fonts.googleapis.com/css2?family=Lobster&display=swap');"
      : '';

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email</title>
  <style>
    ${googleFontsImport}
    /* Base */
    body { margin:0; padding:24px; background:#F5F5F0; color:#333333; font-family: ${fontFamily}; }
    .container { max-width:600px; margin:0 auto; background:#FFFFFF; border-radius:16px; padding:32px; }
    .hr { height:1px; background:#E5E7EB; margin:24px 0; }

    /* Enhanced Header with Logo */
    .brand { 
      text-align: center; 
      font-size: 36px; 
      font-weight: 900; 
      margin: 0 0 40px; 
      letter-spacing: -1px;
      background: linear-gradient(135deg, ${primaryColor}, #8B7355, ${primaryColor});
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      position: relative;
      padding: 20px 0;
    }
    .brand::before {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60px;
      height: 3px;
      background: linear-gradient(135deg, ${primaryColor}, #8B7355);
      border-radius: 2px;
    }

    /* Titles */
    .title { font-size:24px; font-weight:700; text-align:center; margin:0 0 16px; color:#333333; }

    /* Enhanced Content Containers */
    .paragraph { font-size: 16px; margin: 0 0 20px; line-height: 1.7; color: #333; }
    .hero-section { background: linear-gradient(135deg, ${primaryColor}15, ${primaryColor}08); border-radius: 16px; padding: 32px; margin: 24px 0; text-align: center; border: 1px solid ${primaryColor}20; }
    .card { background: linear-gradient(135deg, #ffffff, #fafafa); border: 1px solid ${primaryColor}20; border-left: 4px solid ${primaryColor}; border-radius: 12px; padding: 24px; margin: 24px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .highlight { background: linear-gradient(135deg, ${primaryColor}12, ${primaryColor}20); border-radius: 10px; padding: 16px 20px; margin: 16px 0; border-left: 3px solid ${primaryColor}; font-weight: 500; }
    .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
    .feature { background: ${primaryColor}08; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid ${primaryColor}15; }
    .quote { background: #f8f9fa; border-left: 4px solid ${primaryColor}; padding: 20px; margin: 20px 0; font-style: italic; border-radius: 0 8px 8px 0; }

    /* Enhanced Buttons */
    .button { 
      display: inline-block; 
      background: linear-gradient(135deg, ${primaryColor}, #8B7355); 
      color: #ffffff; 
      padding: 14px 28px; 
      text-decoration: none; 
      border-radius: 10px; 
      font-weight: 600; 
      margin: 20px 0; 
      box-shadow: 0 6px 20px ${primaryColor}30; 
      transition: all 0.3s ease;
      text-align: center;
      border: none;
    }
    .button:hover { transform: translateY(-2px); box-shadow: 0 8px 25px ${primaryColor}40; }
    .link { color: ${primaryColor}; text-decoration: none; font-weight: 500; }

    /* Footer */
    .footer { margin-top:28px; font-size:16px; line-height:1.7; color:#333333; font-family: ${signatureFont}; }
    .divider { height:1px; background:#E5E7EB; margin:28px 0; }
    
    /* Unsubscribe Container */
    .unsubscribe-footer { 
      margin-top: 40px; 
      padding: 20px; 
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      font-size: 12px; 
      color: #6c757d; 
      text-align: center; 
      line-height: 1.6;
    }

    /* Responsive */
    @media (max-width: 640px) {
      body { padding:16px; }
      .container { padding:20px; border-radius:12px; }
      .title { font-size:22px; }
    }
  </style>
</head>
<body>
  <div class="container">
    ${bodyContent}
  </div>
</body>
</html>`;

    console.log('🎨 [generate-email] HTML generated');

    return new Response(JSON.stringify({ htmlContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ [generate-email] Error:', error?.message || error);

    // Fallback with user's prompt and forced placeholder
    const brandName = 'Cleverpoly.Store';
    const primaryColor = '#6A7059';
    const fontFamily = "Inter, sans-serif";
    const emailSignature = 'Best regards,\nCleverpoly';
    const signatureFont = "'Inter', sans-serif";

    const safePrompt = String(error?.prompt || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap');
    body { margin:0; padding:24px; background:#F5F5F0; color:#333333; font-family: ${fontFamily}; }
    .container { max-width:600px; margin:0 auto; background:#FFFFFF; border-radius:16px; padding:32px; }
    .brand { text-align:center; font-size:28px; font-weight:700; color:${primaryColor}; margin:8px 0 24px; }
    .paragraph { font-size:16px; margin:0 0 16px; line-height:1.6; }
    .hr { height:1px; background:#E5E7EB; margin:24px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">${brandName}</div>
    <div class="hr"></div>
    <p class="paragraph">Hey {{name}},</p>
    <p class="paragraph">${safePrompt}</p>
    <div class="footer">
      ${emailSignature.split('\n').map((line: string) => `<p style="margin:0 0 4px">${line}</p>`).join('')}
    </div>
  </div>
</body>
</html>`;

    return new Response(JSON.stringify({ htmlContent: fallbackHtml }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
