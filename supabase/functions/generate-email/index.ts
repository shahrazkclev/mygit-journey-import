import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject = 'Your Files Are Ready', prompt = '' } = await req.json();

    const safeText = String(prompt || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    /* Base */
    body { margin:0; padding:24px; background:#F5F5F0; color:#333333; font-family: Inter, Lato, 'Open Sans', Arial, sans-serif; }
    .container { max-width:600px; margin:0 auto; background:#FFFFFF; border-radius:16px; padding:32px; }
    .hr { height:1px; background:#E5E7EB; margin:24px 0; }

    /* Header */
    .brand { text-align:center; font-size:28px; font-weight:700; color:#333333; margin:8px 0 24px; }

    /* Titles */
    .title { font-size:24px; font-weight:700; text-align:center; margin:0 0 16px; color:#333333; }
    .section-title { font-size:18px; font-weight:700; margin:0 0 8px; color:#333333; display:flex; align-items:center; gap:8px; }

    /* Content */
    .salutation { font-size:16px; margin:0 0 16px; }
    .paragraph { font-size:16px; margin:0 0 8px; line-height:1.6; }
    .card { background:#F9F8F5; border-radius:12px; padding:24px; margin:20px 0; }

    /* Buttons / Links */
    .button { display:inline-block; background:#6A7059; color:#FFFFFF; padding:12px 24px; text-decoration:none; border-radius:8px; font-weight:600; margin-top:12px; }
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

    <h2 class="title">${subject}</h2>

    <p class="salutation">Hey,</p>
    <p class="paragraph">${safeText || 'Thank you for your purchase!'}</p>

    <div class="card">
      <div class="section-title">🍱 Your Downloads</div>
      <p class="paragraph">Access your files through the download button below. All future updates will be available in the same location.</p>
      <a class="button" href="#">Download Files</a>
    </div>

    <div class="card">
      <div class="section-title">📖 Installation Guide</div>
      <p class="paragraph">Need help installing? Check out our step-by-step installation guide:</p>
      <p class="paragraph"><a class="link" href="#">View Installation Instructions →</a></p>
    </div>

    <div class="divider"></div>

    <p class="paragraph">Want to explore more assets?</p>
    <p class="paragraph"><a class="link" href="#">Visit Cleverpoly Store →</a></p>

    <p class="paragraph" style="margin-top:16px">If you have any questions or need assistance, feel free to contact us at cleverpoly.store@gmail.com</p>

    <div class="footer">
      <p style="margin:0 0 4px">Best regards,</p>
      <p style="margin:0">Cleverpoly</p>
    </div>
  </div>
</body>
</html>`;

    return new Response(JSON.stringify({ htmlContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating fixed template:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate template' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});