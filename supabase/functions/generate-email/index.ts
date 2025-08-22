import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject = 'Hello', prompt = '' } = await req.json();

    console.log('Generating AI content with beautiful styling');

    // Beautiful styling template with AI content
    const systemPrompt = `You are creating email content that will be inserted into a beautiful, clean email template.

Create engaging email content for:
Subject: "${subject}"
Content: ${prompt}

Requirements:
- Start with "Hey," (just that, no name needed)
- Write natural, engaging content based on the prompt
- Keep it professional but friendly
- If it's about a product/service, include a clear call-to-action
- End with a natural conclusion
- Don't add "Best regards" or signatures - that's handled by the template

Return ONLY the email body content (no HTML tags, just the text content).`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
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
    const aiContent = data.content[0]?.text || prompt;

    // Clean and format the AI content
    const safeContent = String(aiContent).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const paragraphs = safeContent.split('\n\n').filter(p => p.trim()).map(p => 
      `<p class="paragraph">${p.trim()}</p>`
    ).join('\n    ');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email</title>
  <style>
    /* Base */
    body { margin:0; padding:24px; background:#F5F5F0; color:#333333; font-family: Inter, Lato, 'Open Sans', Arial, sans-serif; }
    .container { max-width:600px; margin:0 auto; background:#FFFFFF; border-radius:16px; padding:32px; }
    .hr { height:1px; background:#E5E7EB; margin:24px 0; }

    /* Header */
    .brand { text-align:center; font-size:28px; font-weight:700; color:#333333; margin:8px 0 24px; }

    /* Titles */
    .title { font-size:24px; font-weight:700; text-align:center; margin:0 0 16px; color:#333333; }

    /* Content */
    .paragraph { font-size:16px; margin:0 0 16px; line-height:1.6; }
    .card { background:#F9F8F5; border-radius:12px; padding:24px; margin:20px 0; }

    /* Buttons / Links */
    .button { display:inline-block; background:#6A7059; color:#FFFFFF; padding:12px 24px; text-decoration:none; border-radius:8px; font-weight:600; margin:12px 0; }
    .link { color:#6A7059; text-decoration:none; }

    /* Footer */
    .footer { margin-top:28px; font-size:14px; line-height:1.7; color:#333333; }
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
    <div class="brand">Cleverpoly.Store</div>
    <div class="hr"></div>

    ${paragraphs}

    <div class="divider"></div>

    <div class="footer">
      <p style="margin:0 0 4px">Best regards,</p>
      <p style="margin:0">Cleverpoly</p>
    </div>
  </div>
</body>
</html>`;

    console.log('✅ Beautiful email with AI content generated');

    return new Response(JSON.stringify({ htmlContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating AI content:', error);
    
    // Fallback with user's prompt
    const safePrompt = String(prompt || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    body { margin:0; padding:24px; background:#F5F5F0; color:#333333; font-family: Inter, sans-serif; }
    .container { max-width:600px; margin:0 auto; background:#FFFFFF; border-radius:16px; padding:32px; }
    .brand { text-align:center; font-size:28px; font-weight:700; color:#333333; margin:8px 0 24px; }
    .title { font-size:24px; font-weight:700; text-align:center; margin:0 0 16px; color:#333333; }
    .paragraph { font-size:16px; margin:0 0 16px; line-height:1.6; }
    .hr { height:1px; background:#E5E7EB; margin:24px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">Cleverpoly.Store</div>
    <div class="hr"></div>
    <h2 class="title">${subject}</h2>
    <p class="paragraph">Hey,</p>
    <p class="paragraph">${safePrompt}</p>
    <div style="margin-top:28px;">
      <p style="margin:0 0 4px">Best regards,</p>
      <p style="margin:0">Cleverpoly</p>
    </div>
  </div>
</body>
</html>`;

    return new Response(JSON.stringify({ htmlContent: fallbackHtml }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});