import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendCampaignRequest {
  campaignId: string;
  webhookUrl: string;
  title: string;
  html: string;
  name: string;
  senderSequenceNumber: number;
}

interface Contact { email: string; first_name?: string | null; last_name?: string | null }

const getEnv = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Missing environment variable: ${k}`);
  return v;
};

const createSupabase = (): SupabaseClient =>
  createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function getCampaign(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id,status,list_ids,sender_sequence_number')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) throw new Error(`Campaign not found: ${error?.message ?? 'no data'}`);
  return data as { id: string; status: string; list_ids: string[] | null; sender_sequence_number: number | null };
}

async function getContactsForLists(supabase: SupabaseClient, listIds: string[] | null): Promise<Contact[]> {
  if (!listIds || listIds.length === 0) return [];
  const { data, error } = await supabase
    .from('contact_lists')
    .select('contacts:contacts!inner(email,first_name,last_name)')
    .in('list_id', listIds);
  if (error) throw new Error(`Error getting contacts: ${error.message}`);
  const contacts: Contact[] = (data ?? []).map((r: any) => r.contacts).filter(Boolean);
  const dedup = new Map<string, Contact>();
  for (const c of contacts) if (c?.email) dedup.set(c.email.toLowerCase(), c);
  return Array.from(dedup.values());
}

async function createSendRecords(supabase: SupabaseClient, campaignId: string, contacts: Contact[]) {
  if (!contacts.length) return;
  const payload = contacts.map(c => ({ campaign_id: campaignId, contact_email: c.email, status: 'pending' as const }));
  const { error } = await supabase.from('campaign_sends').insert(payload);
  if (error) throw new Error(`Failed to create send records: ${error.message}`);
}

async function updateCampaign(supabase: SupabaseClient, id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from('campaigns').update(patch).eq('id', id);
  if (error) throw new Error(`Failed to update campaign: ${error.message}`);
}

async function markSend(supabase: SupabaseClient, campaignId: string, email: string, patch: Record<string, unknown>) {
  await supabase
    .from('campaign_sends')
    .update(patch)
    .eq('campaign_id', campaignId)
    .eq('contact_email', email);
}

async function deliver(webhookUrl: string, body: unknown) {
  const res = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Webhook ${res.status}: ${text || res.statusText}`);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createSupabase();
    const { campaignId, webhookUrl, title, html, name, senderSequenceNumber }: SendCampaignRequest = await req.json();

    const campaign = await getCampaign(supabase, campaignId);
    if (["sending", "sent"].includes((campaign.status || '').toLowerCase())) {
      return new Response(JSON.stringify({ success: true, message: `Campaign already ${campaign.status}.`, campaignId, totalRecipients: 0 }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await updateCampaign(supabase, campaignId, { status: 'sending', webhook_url: webhookUrl, sender_sequence_number: senderSequenceNumber });

    const contacts = await getContactsForLists(supabase, campaign.list_ids || []);
    const totalRecipients = contacts.length;
    await updateCampaign(supabase, campaignId, { total_recipients: totalRecipients });
    await createSendRecords(supabase, campaignId, contacts);

    EdgeRuntime.waitUntil(processSends(supabase, campaignId, webhookUrl, title, html, name, senderSequenceNumber, contacts));

    return new Response(JSON.stringify({ success: true, message: `Campaign started with ${totalRecipients} recipients`, campaignId, totalRecipients }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('send-campaign:error', error?.message || error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
};

async function processSends(
  supabase: SupabaseClient,
  campaignId: string,
  webhookUrl: string,
  title: string,
  html: string,
  name: string,
  senderSequenceNumber: number,
  contacts: Contact[],
) {
  let sentCount = 0;
  const batchSize = 10;

  for (let i = 0; i < contacts.length; i += batchSize) {
    const { data: c } = await supabase.from('campaigns').select('status').eq('id', campaignId).maybeSingle();
    if (c?.status === 'paused') break;

    const batch = contacts.slice(i, i + batchSize);
    await Promise.all(batch.map(async (contact) => {
      try {
        const body = { title, html, name, senderSequenceNumber, recipient: { email: contact.email, firstName: contact.first_name ?? undefined, lastName: contact.last_name ?? undefined }, campaignId };
        await deliver(webhookUrl, body);
        await markSend(supabase, campaignId, contact.email, { status: 'sent', sent_at: new Date().toISOString(), error_message: null });
        sentCount++;
      } catch (e: any) {
        await markSend(supabase, campaignId, contact.email, { status: 'failed', error_message: e?.message || String(e) });
      }
    }));

    await updateCampaign(supabase, campaignId, { sent_count: sentCount });
    await sleep(800);
  }

  const finalStatus = sentCount === contacts.length ? 'sent' : (contacts.length === 0 ? 'sent' : 'failed');
  await updateCampaign(supabase, campaignId, { status: finalStatus, sent_count: sentCount });
}

serve(handler);
