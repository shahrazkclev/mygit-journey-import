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

    // Handle unsubscribes format
    if (payload.unsubscribes && Array.isArray(payload.unsubscribes)) {
      console.log('Processing unsubscribes...');
      
      const results = [];
      for (const unsubscribe of payload.unsubscribes) {
        const { user_id, reason = 'No longer interested' } = unsubscribe;
        
        if (!user_id) {
          console.error('user_id missing in unsubscribe entry:', unsubscribe);
          continue;
        }

        try {
          // Use the handle_unsubscribe function which properly handles the unsubscribe process
          const { error: handleError } = await supabase.rpc('handle_unsubscribe', {
            p_email: null, // Not using email anymore
            p_user_id: user_id,
            p_reason: reason
          });

          if (handleError) {
            console.error('Error handling unsubscribe:', handleError);
            results.push({ user_id, success: false, error: handleError.message });
            continue;
          }

          console.log(`Processed unsubscribe for user_id: ${user_id}`);
          results.push({ user_id, success: true });

        } catch (error) {
          console.error(`Error processing unsubscribe for ${user_id}:`, error);
          results.push({ user_id, success: false, error: error.message });
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        results,
        message: `Processed ${results.length} unsubscribe(s)`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle regular contact sync format
    const { email, name, tags = [], action = 'create', user_id, status = 'subscribed', password, contact_id } = payload;

    // Normalize inputs - treat empty strings as missing
    const normalizedEmail = typeof email === 'string' && email.trim() ? email.trim() : undefined;
    const normalizedContactId = contact_id ? String(contact_id).trim() : undefined;

    console.log('DEBUG: Processing payload:', {
      hasEmail: !!normalizedEmail,
      hasContactId: !!normalizedContactId,
      email: normalizedEmail || 'MISSING',
      contact_id: normalizedContactId || 'MISSING'
    });

    let finalEmail = normalizedEmail;
    let finalUserId = user_id || '550e8400-e29b-41d4-a716-446655440000';

    // If no email but we have contact_id, resolve it first
    if (!finalEmail && normalizedContactId) {
      console.log(`Resolving contact_id ${normalizedContactId} to email...`);
      
      const { data: found, error: findErr } = await supabase
        .from('contacts')
        .select('email, user_id')
        .eq('id', normalizedContactId)
        .maybeSingle();

      if (findErr) {
        console.error('Error looking up contact by contact_id:', findErr);
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch contact by contact_id', 
          details: findErr.message 
        }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      if (!found) {
        console.error('Contact not found for contact_id:', normalizedContactId);
        return new Response(JSON.stringify({ 
          error: 'Contact not found for the provided contact_id', 
          contact_id: normalizedContactId 
        }), { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      finalEmail = found.email;
      finalUserId = found.user_id;
      console.log(`Successfully resolved contact_id ${normalizedContactId} to email: ${finalEmail}`);
    }

    // Final validation - we must have an email at this point
    if (!finalEmail) {
      console.error('No email available after resolution. Payload:', payload);
      return new Response(JSON.stringify({ 
        error: 'Either email or valid contact_id is required for contact sync',
        received_payload: payload 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing contact sync for: ${finalEmail}`);
    
    // Fetch existing contact for merging and name preservation
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('email', finalEmail)
      .eq('user_id', finalUserId)
      .maybeSingle();

    // Helpers to normalize and parse tags
    const splitParts = (s: string) => s.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);
    const parseTags = (input: any): string[] => {
      if (!input) return [];
      if (Array.isArray(input)) {
        return Array.from(new Set(input.flatMap((t: any) => (typeof t === 'string' ? splitParts(t) : []) )));
      }
      if (typeof input === 'string') return Array.from(new Set(splitParts(input)));
      return [];
    };

    const normalize = (t: any) => (typeof t === 'string' ? t.trim() : '');
    const existingTags = (existingContact?.tags || []).map(normalize).filter(Boolean);
    const incomingTags = parseTags(tags);

    // Name preservation and derivation
    let first_name: string | null = null;
    let last_name: string | null = null;

    if (name && name.trim()) {
      const nameTrimmed = name.trim();
      const [first, ...rest] = nameTrimmed.split(/\s+/);
      first_name = first || null;
      last_name = rest.join(' ') || null;
    } else if (existingContact && (existingContact.first_name || existingContact.last_name)) {
      first_name = existingContact.first_name;
      last_name = existingContact.last_name;
    } else {
      const emailPart = finalEmail.split('@')[0];
      const cleanedName = emailPart.replace(/[._-]/g, ' ').replace(/\d+/g, '').trim();
      if (cleanedName) {
        const [first, ...rest] = cleanedName.split(/\s+/);
        first_name = first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : null;
        last_name = rest.length > 0 ? rest.join(' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()) : null;
      }
    }

    // Validate password only if trying to add protected tags
    if (password) {
      const { data: protectedRules, error: rulesError } = await supabase
        .from('tag_rules')
        .select('add_tags, password')
        .eq('user_id', finalUserId)
        .eq('protected', true);

      if (!rulesError && protectedRules?.length) {
        const protectedTags: string[] = [];
        protectedRules.forEach((rule: any) => {
          if (rule.add_tags) {
            rule.add_tags.forEach((tag: string) => {
              if (incomingTags.includes(tag) && !protectedTags.includes(tag)) {
                protectedTags.push(tag);
              }
            });
          }
        });

        if (protectedTags.length > 0) {
          let passwordValid = false;
          for (const rule of protectedRules) {
            if (rule.add_tags && rule.add_tags.some((t: string) => protectedTags.includes(t))) {
              if (rule.password === password) { passwordValid = true; break; }
            }
          }
          if (!passwordValid) {
            return new Response(JSON.stringify({ 
              error: `Invalid password for protected tags: ${protectedTags.join(', ')}`
            }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
      }
    }

    const mergedTags = Array.from(new Set([...existingTags, ...incomingTags]));

    // Upsert contact with merged tags
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .upsert({
        email: finalEmail,
        user_id: finalUserId,
        first_name,
        last_name,
        tags: mergedTags,
        status,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,email'
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
      .eq('list_type', 'dynamic')
      .eq('user_id', finalUserId);

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
            mergedTags.includes(typeof tag === 'string' ? tag.trim() : tag)
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