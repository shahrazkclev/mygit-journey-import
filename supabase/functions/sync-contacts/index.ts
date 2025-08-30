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
      
      const results = [] as any[];
      for (const unsubscribe of payload.unsubscribes) {
        const { email, reason = 'No longer interested' } = unsubscribe;
        
        if (!email) {
          console.error('Email missing in unsubscribe entry:', unsubscribe);
          continue;
        }

        try {
          // Add to unsubscribes table (user_id will be auto-populated by trigger)
          const { data: unsubscribeData, error: unsubscribeError } = await supabase
            .from('unsubscribes')
            .insert({
              email,
              reason
            })
            .select()
            .single();

          if (unsubscribeError) {
            console.error('Error adding unsubscribe:', unsubscribeError);
            results.push({ email, success: false, error: unsubscribeError.message });
            continue;
          }

          // Update contact status to unsubscribed
          const { error: contactError } = await supabase
            .from('contacts')
            .update({ status: 'unsubscribed' })
            .eq('email', email);

          if (contactError) {
            console.error('Error updating contact status:', contactError);
          }

          console.log(`Processed unsubscribe for: ${email}`);
          results.push({ email, success: true, unsubscribe: unsubscribeData });

        } catch (error: any) {
          console.error(`Error processing unsubscribe for ${email}:`, error);
          results.push({ email, success: false, error: error.message });
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
    // Expected format from Google Sheets via Make.com or webhook:
    // {
    //   "email": "customer@example.com",
    //   "name": "John Doe", 
    //   "tags": ["customer", "premium", "lazy-motion-library"],
    //   "status": "subscribed",
    //   "action": "create" | "update",
    //   "user_id": "optional-user-id"
    // }

    const { email, name, tags = [], action = 'create', user_id, status = 'subscribed' } = payload;

    if (!email) {
      console.error('Missing email in payload:', payload);
      return new Response(JSON.stringify({ 
        error: 'Email is required for contact sync',
        received_payload: payload 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing contact sync for: ${email}`);

    // Use provided user_id or default to demo user
    const finalUserId = user_id || '550e8400-e29b-41d4-a716-446655440000';
    
    // Parse name into first_name and last_name
    const nameTrimmed = (name || "").trim();
    const [firstName, ...rest] = nameTrimmed.split(/\s+/);
    const lastName = rest.join(" ");

    // Get existing contact to merge tags
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('email', email)
      .eq('user_id', finalUserId)
      .single();

    // Normalize and merge tags with existing ones (don't replace)
    const normalize = (t: any) => (typeof t === 'string' ? t.trim() : '');
    const existingTags = (existingContact?.tags || []).map(normalize).filter(Boolean);
    const incomingTags = (Array.isArray(tags) ? tags : []).map(normalize).filter(Boolean);
    const mergedTags = Array.from(new Set([...existingTags, ...incomingTags]));
    console.log('Tag merge:', { existingTags, incomingTags, mergedTags });

    // Upsert contact with merged tags
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .upsert({
        email,
        user_id: finalUserId,
        first_name: firstName || null,
        last_name: lastName || null,
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

    // Apply tag rules to the updated contact
    await applyTagRules(supabase, contact as any, finalUserId, mergedTags);

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
      for (const list of dynamicLists || []) {
        const ruleConfig = (list as any).rule_config as any;
        if (!ruleConfig) continue;

        let shouldInclude = false;

        // Check if contact matches the rule
        if (ruleConfig.requiredTags && Array.isArray(ruleConfig.requiredTags)) {
          shouldInclude = ruleConfig.requiredTags.some((tag: string) => 
            (Array.isArray(tags) ? tags : []).includes(tag)
          );
        }

        if (shouldInclude) {
          // Add contact to list (upsert to avoid duplicates)
          const { error: membershipError } = await supabase
            .from('contact_lists')
            .upsert({
              contact_id: (contact as any).id,
              list_id: (list as any).id
            }, {
              onConflict: 'contact_id,list_id'
            });

          if (membershipError) {
            console.error(`Error adding contact to list ${(list as any).name}:`, membershipError);
          } else {
            console.log(`Added contact to dynamic list: ${(list as any).name}`);
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

  } catch (error: any) {
    console.error('Error in sync-contacts function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})

// Function to apply tag rules
async function applyTagRules(supabase: any, contact: any, userId: string, currentTags: string[]) {
  try {
    // Fetch tag rules for the user
    const { data: tagRules, error } = await supabase
      .from('tag_rules')
      .select('*')
      .eq('user_id', userId)
      .eq('enabled', true);

    if (error || !tagRules?.length) return;

    const trimOnly = (s: any) => (typeof s === 'string' ? s.trim() : '');
    const toNorm = (s: any) => (typeof s === 'string' ? s.trim().toLowerCase() : '');
    const baseText = (s: any) => (typeof s === 'string' ? s.split('---')[0].trim() : ''); // handle labels like "tag --- Category"

    // Prepare working tags and a normalized index for robust matching
    let updatedTags = (currentTags || []).map(trimOnly).filter(Boolean);
    const originalTags = [...updatedTags];
    const indexByNorm = new Map<string, number>();
    const rebuildIndex = () => {
      indexByNorm.clear();
      updatedTags.forEach((val, idx) => {
        const n1 = toNorm(val);
        const n2 = toNorm(baseText(val));
        // Map multiple normalized keys to the same index (first wins)
        if (!indexByNorm.has(n1)) indexByNorm.set(n1, idx);
        if (!indexByNorm.has(n2)) indexByNorm.set(n2, idx);
      });
    };
    rebuildIndex();

    let hasChanges = false;

    for (const rule of tagRules) {
      const triggerNorm = toNorm(rule.trigger_tag);
      const triggerBaseNorm = toNorm(baseText(rule.trigger_tag));
      const triggerHit = indexByNorm.has(triggerNorm) || indexByNorm.has(triggerBaseNorm);

      if (!triggerHit) continue;

      console.log(`Applying tag rule: ${rule.name || 'Unnamed'} (trigger: ${rule.trigger_tag})`);

      // Add tags
      if (Array.isArray(rule.add_tags) && rule.add_tags.length) {
        for (const raw of rule.add_tags) {
          const add = trimOnly(raw);
          if (!add) continue;
          const addNorm = toNorm(add);
          const addBaseNorm = toNorm(baseText(add));
          if (!indexByNorm.has(addNorm) && !indexByNorm.has(addBaseNorm)) {
            updatedTags.push(add);
            hasChanges = true;
            console.log(' + Added tag via rule:', add);
            rebuildIndex();
          }
        }
      }

      // Remove tags
      if (Array.isArray(rule.remove_tags) && rule.remove_tags.length) {
        for (const raw of rule.remove_tags) {
          const rem = trimOnly(raw);
          if (!rem) continue;
          const remNorm = toNorm(rem);
          const remBaseNorm = toNorm(baseText(rem));
          let idx = indexByNorm.get(remNorm);
          if (idx === undefined) idx = indexByNorm.get(remBaseNorm);
          if (idx !== undefined) {
            const removed = updatedTags.splice(idx, 1);
            hasChanges = true;
            console.log(' - Removed tag via rule:', removed[0], '(pattern:', rem, ')');
            rebuildIndex();
          } else {
            console.log(' ! No match to remove for:', rem, 'available keys:', Array.from(indexByNorm.keys()));
          }
        }
      }
    }

    // Update contact if tags changed
    if (hasChanges) {
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ tags: updatedTags })
        .eq('id', contact.id);

      if (updateError) {
        console.error('Error updating contact tags after rule application:', updateError);
      } else {
        console.log(`Tags updated by rules; before=[${originalTags.join(', ')}], after=[${updatedTags.join(', ')}]`);
      }
    }
  } catch (error) {
    console.error('Error applying tag rules:', error);
  }
}