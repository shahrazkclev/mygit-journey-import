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
    const { subject = 'Hello', prompt = '', styleGuide } = await req.json();

    console.log('🧠 [generate-email] Request received', { subject });

    // Explicit instructions to include the {{name}} placeholder
    const systemPrompt = `You are creating email content. You MUST follow these requirements exactly:

1. MANDATORY: Start with "Hey {{name}}," - DO NOT change this format
2. Write engaging content for: "${subject}" 
3. Content prompt: ${prompt}
4. Keep it professional but friendly
5. Include clear call-to-action if relevant
6. End naturally without signatures

CRITICAL: You MUST use "Hey {{name}}," at the start. Do not use "Hey," or any other greeting.

Example format:
Hey {{name}},

[Your email content here...]

Return only the email body content (no HTML tags).`;

    // Call Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': String(claudeApiKey),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: systemPrompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    let aiContent: string = data.content?.[0]?.text || String(prompt || '');

    // Force include the {{name}} placeholder at the greeting
    // Replace variations like "Hey,", "Hey John,", "hey," etc.
    aiContent = aiContent.replace(/^\s*Hey\s*[,\-–]?\s*/i, 'Hey {{name}}, ');
    aiContent = aiContent.replace(/^\s*Hey\s+[^,]+,\s*/i, 'Hey {{name}}, ');
    if (!/\{\{\s*name\s*\}\}/i.test(aiContent)) {
      aiContent = `Hey {{name}},\n\n${aiContent}`;
    }

    console.log('✅ [generate-email] Placeholder ensured:', aiContent.slice(0, 60));

    // Clean and format the AI content
    const safeContent = aiContent.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const paragraphs = safeContent
      .split('\n\n')
      .filter((p) => p.trim())
      .map((p) => `<p class="paragraph">${p.trim()}</p>`)
      .join('\n    ');

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

    /* Header */
    .brand { text-align:center; font-size:28px; font-weight:700; color:${primaryColor}; margin:8px 0 24px; }

    /* Titles */
    .title { font-size:24px; font-weight:700; text-align:center; margin:0 0 16px; color:#333333; }

    /* Content */
    .paragraph { font-size:16px; margin:0 0 16px; line-height:1.6; }
    .card { background:#F9F8F5; border-radius:12px; padding:24px; margin:20px 0; }

    /* Buttons / Links */
    .button { display:inline-block; background:${primaryColor}; color:#FFFFFF; padding:12px 24px; text-decoration:none; border-radius:8px; font-weight:600; margin:12px 0; }
    .link { color:${primaryColor}; text-decoration:none; }

    /* Footer */
    .footer { margin-top:28px; font-size:16px; line-height:1.7; color:#333333; font-family: ${signatureFont}; }
    .divider { height:1px; background:#E5E7EB; margin:28px 0; }

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
    <div class="brand">${brandName}</div>
    <div class="hr"></div>

    ${paragraphs}

    <div class="divider"></div>

    <div class="footer">
      ${emailSignature.split('\n').map((line: string) => `<p style="margin:0 0 4px">${line}</p>`).join('')}
    </div>
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
