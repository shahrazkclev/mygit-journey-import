import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response('Invalid unsubscribe link', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate and consume the unsubscribe token
    const { data: tokenData, error: tokenError } = await supabase
      .from('unsubscribe_tokens')
      .select('*, contact_id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .eq('is_used', false)
      .single();

    if (tokenError || !tokenData) {
      console.error('Invalid or expired token:', tokenError);
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Link</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 600px; 
              margin: 100px auto; 
              padding: 40px; 
              text-align: center;
              background-color: #f9fafb;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #dc2626; margin-bottom: 20px; }
            p { color: #6b7280; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Invalid Unsubscribe Link</h1>
            <p>This unsubscribe link is invalid, expired, or has already been used.</p>
            <p>If you still wish to unsubscribe, please contact us directly.</p>
          </div>
        </body>
        </html>
      `, {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' }
      });
    }

    const email = tokenData.email;

    // Mark token as used
    const { error: markUsedError } = await supabase
      .from('unsubscribe_tokens')
      .update({ 
        is_used: true, 
        used_at: new Date().toISOString() 
      })
      .eq('token', token);

    if (markUsedError) {
      console.error('Error marking token as used:', markUsedError);
    }

    // Tag-based unsubscribe: add 'unsub' tag to the contact
    const lowerEmail = (email || '').toLowerCase();

    // Fetch existing contact
    const { data: contact, error: contactFetchError } = await supabase
      .from('contacts')
      .select('id, tags')
      .eq('user_id', tokenData.user_id)
      .eq('email', lowerEmail)
      .maybeSingle();

    if (contactFetchError) {
      console.error('Error fetching contact:', contactFetchError);
      return new Response('Internal server error', { status: 500, headers: corsHeaders });
    }

    const updatedTags = Array.from(new Set([...(contact?.tags || []).map((t: string) => (t || '').trim()).filter(Boolean), 'unsub']));

    if (contact) {
      const { error: updateErr } = await supabase
        .from('contacts')
        .update({ tags: updatedTags, status: 'subscribed', updated_at: new Date().toISOString() })
        .eq('id', contact.id);
      if (updateErr) {
        console.error('Error updating contact with unsub tag:', updateErr);
        return new Response('Internal server error', { status: 500, headers: corsHeaders });
      }
    } else {
      const { error: insertErr } = await supabase
        .from('contacts')
        .insert({
          user_id: tokenData.user_id,
          email: lowerEmail,
          tags: updatedTags,
          status: 'subscribed'
        });
      if (insertErr) {
        console.error('Error inserting new unsubscribed contact:', insertErr);
        return new Response('Internal server error', { status: 500, headers: corsHeaders });
      }
    }

    // Return a simple unsubscribe confirmation page
    const htmlResponse = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribed</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px; 
            margin: 100px auto; 
            padding: 40px; 
            text-align: center;
            background-color: #f9fafb;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 { color: #374151; margin-bottom: 20px; }
          p { color: #6b7280; line-height: 1.6; }
          .email { font-weight: 600; color: #374151; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✓ Successfully Unsubscribed</h1>
          <p>The email address <span class="email">${email}</span> has been removed from all mailing lists.</p>
          <p>You will no longer receive promotional emails from us.</p>
          <p>If you change your mind, you can always resubscribe through our website.</p>
        </div>
      </body>
      </html>
    `;

    return new Response(htmlResponse, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/html' 
      },
    });

  } catch (error) {
    console.error('Error in unsubscribe function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});