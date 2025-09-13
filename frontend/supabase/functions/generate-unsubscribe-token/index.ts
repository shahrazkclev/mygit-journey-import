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
    const { contact_id, campaign_id, user_id = '550e8400-e29b-41d4-a716-446655440000' } = await req.json();

    if (!contact_id) {
      return new Response(
        JSON.stringify({ error: 'Contact ID is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate unsubscribe token using the database function with contact_id
    const { data: token, error } = await supabase
      .rpc('generate_unsubscribe_token', {
        p_contact_id: contact_id,
        p_campaign_id: campaign_id,
        p_user_id: user_id
      });

    if (error) {
      console.error('Error generating token:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate unsubscribe token' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate the unsubscribe URL
    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || '';
    const unsubscribeUrl = `${baseUrl}/functions/v1/unsubscribe?token=${token}`;

    return new Response(
      JSON.stringify({ 
        token,
        unsubscribe_url: unsubscribeUrl 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-unsubscribe-token function:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});