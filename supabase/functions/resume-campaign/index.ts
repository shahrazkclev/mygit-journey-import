import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ResumeCampaignRequest {
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

async function getPendingContacts(supabase: SupabaseClient, campaignId: string): Promise<Contact[]> {
  const { data: pendingSends, error } = await supabase
    .from('campaign_sends')
    .select(`
      contact_email,
      contacts!inner (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .eq('campaign_id', campaignId)
    .in('status', ['pending', 'failed']);

  if (error) throw error;

  return pendingSends?.map(send => ({
    id: (send.contacts as any).id,
    email: (send.contacts as any).email,
    first_name: (send.contacts as any).first_name,
    last_name: (send.contacts as any).last_name,
  })) || [];
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

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId }: ResumeCampaignRequest = await req.json();
    console.log('🔄 Resuming campaign:', campaignId);

    const supabase = createSupabase();
    
    // Get campaign details
    const campaign = await getCampaign(supabase, campaignId);
    console.log('📄 Campaign loaded:', campaign.name);
    
    // Check if campaign is in a resumable state
    if (!['sending', 'paused'].includes(campaign.status)) {
      throw new Error(`Campaign is in ${campaign.status} state and cannot be resumed`);
    }
    
    // Get pending contacts
    const pendingContacts = await getPendingContacts(supabase, campaignId);
    console.log(`👥 Found ${pendingContacts.length} pending contacts`);
    
    if (pendingContacts.length === 0) {
      // No pending contacts, mark as completed
      await updateCampaign(supabase, campaignId, {
        status: 'sent',
        sent_at: new Date().toISOString()
      });
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Campaign already completed',
        pending_contacts: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update campaign status to sending
    await updateCampaign(supabase, campaignId, {
      status: 'sending'
    });

    console.log('📋 Resuming campaign, beginning send process...');
    
    // Start processing in background
    EdgeRuntime.waitUntil(processPendingSends(supabase, campaign, pendingContacts));
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Campaign resumed',
      pending_contacts: pendingContacts.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error in resume-campaign:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function processPendingSends(supabase: SupabaseClient, campaign: any, contacts: Contact[]) {
  console.log('🔄 Processing pending sends...');
  
  let sentCount = 0;
  let failedCount = 0;
  
  try {
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        console.log(`📧 Sending to: ${contact.email} (${i + 1}/${contacts.length})`);
        
        // Check if campaign was paused
        const { data: campaignStatus } = await supabase
          .from('campaigns')
          .select('status')
          .eq('id', campaign.id)
          .single();
        
        if (campaignStatus?.status === 'paused') {
          console.log('⏸️ Campaign paused, stopping send process');
          break;
        }
        
        // Personalize HTML content
        const contactName = contact.first_name || contact.email.split('@')[0] || 'Friend';
        let personalizedHtml = campaign.html_content.replace(/\{\{name\}\}/g, contactName);
        personalizedHtml = personalizedHtml.replace(/\{\{email\}\}/g, contact.email);
        personalizedHtml = personalizedHtml.replace(/\{\{contact_id\}\}/g, contact.id);
        
        // Send email
        if (campaign.webhook_url) {
          await deliver(campaign.webhook_url, {
            to: contact.email,
            subject: campaign.subject,
            html: personalizedHtml,
            campaign_id: campaign.id,
            contact: {
              id: contact.id,
              email: contact.email,
              first_name: contact.first_name,
              last_name: contact.last_name,
              name: contactName
            }
          });
        }
        
        // Mark as sent
        await markSend(supabase, campaign.id, contact.email, {
          status: 'sent',
          sent_at: new Date().toISOString()
        });
        
        sentCount++;
        console.log(`✅ Sent to ${contact.email} (${sentCount}/${contacts.length})`);
        
        // Update progress
        await updateCampaign(supabase, campaign.id, {
          sent_count: campaign.sent_count + sentCount
        });
        
        // Small delay between emails
        if (i < contacts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Process in chunks to avoid timeout
        if (sentCount % 20 === 0) {
          console.log(`🔄 Processed ${sentCount} emails, scheduling next batch...`);
          const remainingContacts = contacts.slice(i + 1);
          if (remainingContacts.length > 0) {
            EdgeRuntime.waitUntil(processPendingSends(supabase, campaign, remainingContacts));
          }
          break;
        }
        
      } catch (error: any) {
        console.error(`❌ Failed to send to ${contact.email}:`, error);
        failedCount++;
        
        // Mark as failed
        await markSend(supabase, campaign.id, contact.email, {
          status: 'failed',
          error_message: error.message
        });
      }
    }
    
    // Check if campaign is complete
    const { data: finalStatus } = await supabase
      .from('campaign_sends')
      .select('status')
      .eq('campaign_id', campaign.id);
    
    const totalSends = finalStatus?.length || 0;
    const completedSends = finalStatus?.filter(s => s.status === 'sent').length || 0;
    
    if (completedSends >= totalSends && totalSends > 0) {
      await updateCampaign(supabase, campaign.id, {
        status: 'sent',
        sent_at: new Date().toISOString()
      });
      console.log(`🎉 Campaign completed! Sent: ${completedSends}, Failed: ${totalSends - completedSends}`);
    } else {
      await updateCampaign(supabase, campaign.id, {
        status: 'sending'
      });
      console.log(`⏳ Campaign in progress: ${completedSends}/${totalSends} sent`);
    }
    
  } catch (error: any) {
    console.error('❌ Fatal error in resume process:', error);
    
    await updateCampaign(supabase, campaign.id, {
      status: 'failed',
      error_message: error.message
    });
  }
}

serve(handler);
