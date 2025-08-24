import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface SendCampaignRequest {
  campaignId: string;
}

interface Contact {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getEnv(k: string): string {
  const val = Deno.env.get(k);
  if (!val) throw new Error(`Missing environment variable: ${k}`);
  return val;
}

function createSupabase(): SupabaseClient {
  return createClient(
    getEnv('SUPABASE_URL'),
    getEnv('SUPABASE_SERVICE_ROLE_KEY')
  );
}

async function getCampaign(supabase: SupabaseClient, id: string) {
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return campaign;
}

async function getContactsForLists(supabase: SupabaseClient, listIds: string[] | null): Promise<Contact[]> {
  if (!listIds || listIds.length === 0) return [];
  
  const { data: contactLists, error } = await supabase
    .from('contact_lists')
    .select(`
      contact_id,
      contacts!inner (
        id,
        email,
        first_name,
        last_name,
        status
      )
    `)
    .in('list_id', listIds);

  if (error) throw error;

  // Filter for subscribed contacts only and flatten the structure
  const contacts: Contact[] = contactLists
    ?.filter(cl => (cl.contacts as any).status === 'subscribed')
    .map(cl => ({
      id: (cl.contacts as any).id,
      email: (cl.contacts as any).email,
      first_name: (cl.contacts as any).first_name,
      last_name: (cl.contacts as any).last_name,
    })) || [];

  return contacts;
}

async function createSendRecords(supabase: SupabaseClient, campaignId: string, contacts: Contact[]) {
  const records = contacts.map(contact => ({
    campaign_id: campaignId,
    contact_email: contact.email,
    status: 'pending'
  }));

  const { error } = await supabase
    .from('campaign_sends')
    .insert(records);

  if (error) throw error;
}

async function updateCampaign(supabase: SupabaseClient, id: string, patch: Record<string, unknown>) {
  const { error } = await supabase
    .from('campaigns')
    .update(patch)
    .eq('id', id);
  
  if (error) throw error;
}

async function markSend(supabase: SupabaseClient, campaignId: string, email: string, patch: Record<string, unknown>) {
  const { error } = await supabase
    .from('campaign_sends')
    .update(patch)
    .eq('campaign_id', campaignId)
    .eq('contact_email', email);
  
  if (error) throw error;
}

async function deliver(webhookUrl: string, body: unknown) {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Function to replace variables in HTML content
function replaceVariablesInHtml(htmlContent: string, contact: Contact): string {
  let result = htmlContent;
  
  // Generate name from email if no first name
  const firstName = contact.first_name || contact.email.split('@')[0] || 'Friend';
  const lastName = contact.last_name || '';
  const fullName = lastName ? `${firstName} ${lastName}` : firstName;
  
  // Replace variables
  result = result.replace(/\{\{firstName\}\}/g, firstName);
  result = result.replace(/\{\{lastName\}\}/g, lastName);
  result = result.replace(/\{\{fullName\}\}/g, fullName);
  result = result.replace(/\{\{email\}\}/g, contact.email);
  
  return result;
}

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId }: SendCampaignRequest = await req.json();
    console.log('🚀 Starting send for campaign:', campaignId);

    const supabase = createSupabase();
    
    // Get campaign details
    const campaign = await getCampaign(supabase, campaignId);
    console.log('📄 Campaign loaded:', campaign.name);
    
    // Get contacts
    const contacts = await getContactsForLists(supabase, campaign.list_ids);
    console.log(`👥 Found ${contacts.length} contacts`);
    
    if (contacts.length === 0) {
      throw new Error('No contacts found for the selected lists');
    }

    // Create send records
    await createSendRecords(supabase, campaignId, contacts);
    
    // Update campaign status and counts
    await updateCampaign(supabase, campaignId, {
      status: 'sending',
      total_recipients: contacts.length,
      sent_count: 0
    });

    console.log('📋 Campaign started, beginning send process...');
    
    // Start processing in background
    EdgeRuntime.waitUntil(processSends(supabase, campaign, contacts));
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Campaign started',
      total_recipients: contacts.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error in send-campaign:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function getUserSettings(supabase: SupabaseClient, userId: string) {
  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('delay_between_emails, batch_size, delay_between_batches')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('⚠️ Could not load user settings, using defaults:', error);
    return {
      delay_between_emails: 2,
      batch_size: 10,
      delay_between_batches: 5
    };
  }

  return {
    delay_between_emails: settings?.delay_between_emails || 2,
    batch_size: settings?.batch_size || 10,
    delay_between_batches: settings?.delay_between_batches || 5
  };
}

async function processSends(supabase: SupabaseClient, campaign: any, contacts: Contact[]) {
  console.log('🔄 Starting background send process...');
  
  const settings = await getUserSettings(supabase, campaign.user_id);
  console.log('⚙️ Using settings:', settings);
  
  let sentCount = 0;
  let failedCount = 0;
  let currentSenderSequence = campaign.sender_sequence_number || 1;
  
  try {
    // Process contacts one by one for proper timing and sequence tracking
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        console.log(`📧 Sending to: ${contact.email} (${i + 1}/${contacts.length}) - Sender #${currentSenderSequence}`);
        
        // Update current progress before sending
        await updateCampaign(supabase, campaign.id, {
          sent_count: sentCount,
          current_recipient: contact.email,
          current_sender_sequence: currentSenderSequence
        });
        
        // Replace variables in HTML content
        const personalizedHtml = replaceVariablesInHtml(campaign.html_content, contact);
        
        // Simulate sending (replace with actual email service)
        if (campaign.webhook_url) {
          await deliver(campaign.webhook_url, {
            to: contact.email,
            subject: campaign.subject,
            html: personalizedHtml,
            campaign_id: campaign.id,
            sender_sequence: currentSenderSequence
          });
        }
        
        // Mark as sent
        await markSend(supabase, campaign.id, contact.email, {
          status: 'sent',
          sent_at: new Date().toISOString()
        });
        
        sentCount++;
        console.log(`✅ Sent to ${contact.email} (${sentCount}/${contacts.length})`);
        
        // Update progress after successful send
        await updateCampaign(supabase, campaign.id, {
          sent_count: sentCount
        });
        
        // Increment sender sequence for next email
        currentSenderSequence++;
        
        // Delay between individual emails (except for the last one)
        if (i < contacts.length - 1 && settings.delay_between_emails > 0) {
          console.log(`⏳ Waiting ${settings.delay_between_emails}s before next email...`);
          await new Promise(resolve => setTimeout(resolve, settings.delay_between_emails * 1000));
        }
        
      } catch (error: any) {
        console.error(`❌ Failed to send to ${contact.email}:`, error);
        failedCount++;
        
        // Mark as failed
        await markSend(supabase, campaign.id, contact.email, {
          status: 'failed',
          error_message: error.message
        });
        
        // Update progress even on failure
        await updateCampaign(supabase, campaign.id, {
          sent_count: sentCount
        });
      }
    }
    
    // Campaign completed
    await updateCampaign(supabase, campaign.id, {
      status: 'sent',
      sent_count: sentCount,
      sent_at: new Date().toISOString(),
      current_recipient: null,
      current_sender_sequence: currentSenderSequence
    });
    
    console.log(`🎉 Campaign completed! Sent: ${sentCount}, Failed: ${failedCount}`);
    
  } catch (error: any) {
    console.error('❌ Fatal error in send process:', error);
    
    await updateCampaign(supabase, campaign.id, {
      status: 'failed',
      error_message: error.message
    });
  }
}

serve(handler);