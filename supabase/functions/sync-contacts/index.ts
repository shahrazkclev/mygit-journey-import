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
        const { email, user_id, contact_id, reason = 'No longer interested' } = unsubscribe;
        
        let finalEmail = email;
        let finalUserId = user_id || '550e8400-e29b-41d4-a716-446655440000';
        
        // If contact_id is provided, find the email and user_id
        if (contact_id && !email) {
          try {
            const { data: contact, error: contactError } = await supabase
              .from('contacts')
              .select('email, user_id')
              .eq('id', contact_id)
              .single();
              
            if (contactError || !contact) {
              console.error('Contact not found for contact_id:', contact_id);
              results.push({ 
                contact_id: contact_id, 
                success: false, 
                error: 'Contact not found' 
              });
              continue;
            }
            
            finalEmail = contact.email;
            finalUserId = contact.user_id;
          } catch (error: any) {
            console.error('Error fetching contact:', error);
            results.push({ 
              contact_id: contact_id, 
              success: false, 
              error: error.message 
            });
            continue;
          }
        }

        if (!finalEmail && !finalUserId) {
          console.error('Email, user_id, or contact_id required in unsubscribe entry:', unsubscribe);
          continue;
        }

        try {
          // Use the handle_unsubscribe database function
          const { error: unsubscribeError } = await supabase.rpc('handle_unsubscribe', {
            p_email: finalEmail || null,
            p_user_id: finalUserId,
            p_reason: reason
          });

          if (unsubscribeError) {
            console.error('Error processing unsubscribe:', unsubscribeError);
            results.push({ 
              email: finalEmail || `user_id:${finalUserId}`, 
              success: false, 
              error: unsubscribeError.message 
            });
            continue;
          }

          console.log(`Processed unsubscribe for: ${finalEmail || `user_id:${finalUserId}`}`);
          results.push({ 
            email: finalEmail || `user_id:${finalUserId}`, 
            success: true, 
            message: 'Unsubscribed successfully' 
          });

        } catch (error: any) {
          console.error(`Error processing unsubscribe for ${finalEmail || `user_id:${finalUserId}`}:`, error);
          results.push({ 
            email: finalEmail || `user_id:${finalUserId}`, 
            success: false, 
            error: error.message 
          });
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
  try {
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('email, user_id')
      .eq('id', normalizedContactId)
      .maybeSingle();

    if (contactError) {
      console.error('Error fetching contact by contact_id:', contactError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch contact by contact_id',
        details: contactError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!contact) {
      console.error('Contact not found for contact_id:', normalizedContactId);
      return new Response(JSON.stringify({
        error: 'Contact not found for the provided contact_id',
        contact_id: normalizedContactId
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    finalEmail = contact.email;
    finalUserId = contact.user_id;
    console.log(`Resolved contact_id ${normalizedContactId} to email: ${finalEmail}`);
  } catch (error: any) {
    console.error('Error fetching contact:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch contact by contact_id',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Validate after resolution
if (!finalEmail && !normalizedContactId) {
  console.error('VALIDATION ERROR: Missing both email and contact_id in payload:', payload);
  return new Response(JSON.stringify({
    error: 'Either email or contact_id is required for contact sync',
    received_payload: payload
  }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

console.log('DEBUG: Validation passed, proceeding with processing');

    console.log(`Processing contact sync for: ${finalEmail}`);

    // Get existing contact to merge tags and preserve names
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('email', finalEmail)
      .eq('user_id', finalUserId)
      .maybeSingle();

    // Handle name logic: preserve existing name if new name is null/empty
    let firstName = null;
    let lastName = null;
    
    if (name && name.trim()) {
      // New name provided, use it
      const nameTrimmed = name.trim();
      const [first, ...rest] = nameTrimmed.split(/\s+/);
      firstName = first || null;
      lastName = rest.join(" ") || null;
    } else if (existingContact && (existingContact.first_name || existingContact.last_name)) {
      // No new name but existing contact has name, preserve it
      firstName = existingContact.first_name;
      lastName = existingContact.last_name;
    } else if (!name || !name.trim()) {
      // No name provided and no existing name, extract from email
      const emailPart = finalEmail.split('@')[0];
      const cleanedName = emailPart.replace(/[._-]/g, ' ').replace(/\d+/g, '').trim();
      if (cleanedName) {
        const [first, ...rest] = cleanedName.split(/\s+/);
        firstName = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() || null;
        lastName = rest.length > 0 ? rest.join(" ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : null;
      }
    }

// Normalize and merge tags with existing ones (don't replace)
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

// Check for password-protected tags only if password is provided
if (password) {
  const { data: protectedRules, error: rulesError } = await supabase
    .from('tag_rules')
    .select('add_tags, password')
    .eq('user_id', finalUserId)
    .eq('protected', true);

  if (rulesError) {
    console.error('Error fetching protected tag rules:', rulesError);
  } else if (protectedRules && protectedRules.length > 0) {
    const protectedTags: string[] = [];
    protectedRules.forEach(rule => {
      if (rule.add_tags) {
        rule.add_tags.forEach((tag: string) => {
          if (incomingTags.includes(tag) && !protectedTags.includes(tag)) {
            protectedTags.push(tag);
          }
        });
      }
    });

    // If there are protected tags in the incoming tags, validate password
    if (protectedTags.length > 0) {
      // Validate password
      let passwordValid = false;
      for (const rule of protectedRules) {
      if (rule.add_tags) {
        const hasProtectedTag = rule.add_tags.some((tag: string) => protectedTags.includes(tag));
        if (hasProtectedTag && rule.password === password) {
          passwordValid = true;
          break;
        }
      }
    }

    if (!passwordValid) {
      console.error('Invalid password for protected tags:', protectedTags);
      return { 
        email, 
        success: false, 
        error: `Invalid password for protected tags: ${protectedTags.join(', ')}` 
      };
    }

    console.log('Password validated for protected tags:', protectedTags);
  }
}

const mergedTags = Array.from(new Set([...existingTags, ...incomingTags]));
console.log('Tag merge:', { existingTags, rawIncoming: tags, incomingTags, mergedTags });

    // Upsert contact with merged tags
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .upsert({
        email: finalEmail,
        user_id: finalUserId,
        first_name: firstName,
        last_name: lastName,
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
  const mergedTagSet = new Set(mergedTags.map((t: string) => t.trim()));
  shouldInclude = ruleConfig.requiredTags.some((tag: string) =>
    mergedTagSet.has(typeof tag === 'string' ? tag.trim() : tag)
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