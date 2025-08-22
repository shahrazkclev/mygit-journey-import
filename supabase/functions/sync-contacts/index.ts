
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload = await req.json();

    console.log('Received webhook payload:', payload);

    // Expected format from Google Sheets via Make.com:
    // {
    //   "email": "customer@example.com",
    //   "name": "John Doe", 
    //   "phone": "+1234567890",
    //   "tags": ["customer", "premium", "lazy-motion-library"],
    //   "action": "create" | "update"
    // }

    const { email, name, phone, tags = [], action = 'create' } = payload;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upsert contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .upsert({
        email,
        name: name || '',
        phone: phone || '',
        tags: Array.isArray(tags) ? tags : [],
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      })
      .select()
      .single();

    if (contactError) {
      console.error('Error upserting contact:', contactError);
      return new Response(JSON.stringify({ error: 'Failed to upsert contact' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Contact upserted:', contact);

    // Process dynamic lists - check if contact should be added to any rule-based lists
    const { data: dynamicLists, error: listsError } = await supabase
      .from('email_lists')
      .select('*')
      .eq('list_type', 'dynamic');

    if (listsError) {
      console.error('Error fetching dynamic lists:', listsError);
    } else {
      // Process each dynamic list
      for (const list of dynamicLists) {
        const ruleConfig = list.rule_config;
        if (!ruleConfig) continue;

        let shouldInclude = false;

        // Check if contact matches the rule
        if (ruleConfig.requiredTags && Array.isArray(ruleConfig.requiredTags)) {
          shouldInclude = ruleConfig.requiredTags.some((tag: string) => 
            tags.includes(tag)
          );
        }

        if (shouldInclude) {
          // Add contact to list (upsert to avoid duplicates)
          const { error: membershipError } = await supabase
            .from('contact_lists')
            .upsert({
              contact_id: contact.id,
              list_id: list.id
            }, {
              onConflict: 'contact_id,list_id'
            });

          if (membershipError) {
            console.error(`Error adding contact to list ${list.name}:`, membershipError);
          } else {
            console.log(`Added contact to dynamic list: ${list.name}`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      contact,
      message: 'Contact processed and dynamic lists updated'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sync-contacts function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
