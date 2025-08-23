import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * send-campaign
 *
 * Improvements over previous version:
 * - Strict payload validation with actionable errors
 * - Deduplicates recipients by email and filters unsubscribed recipients (best-effort)
 * - Uses upsert for campaign_sends to avoid duplicates on retries
 * - Batched delivery with per-contact retries and exponential backoff
 * - Periodic progress updates (sent/failed)
 * - Robust logging + CORS + non-blocking background processing
 * - Preserves the existing request/response contract
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendCampaignRequest {
  campaignId: string;
  webhookUrl: string; // destination to actually deliver the email
  title: string;      // subject
  html: string;       // rendered HTML
  name: string;       // campaign name
  senderSequenceNumber: number; // sequence/order number
}

interface Contact {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
}

// ---- Utilities ----
const getEnv = (key: string) => {
  const v = Deno.env.get(key);
  if (!v) throw new Error(`Missing environment variable: ${key}`);
  return v;
};

const createSupabase = (): SupabaseClient =>
  createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));

const validatePayload = (payload: Partial<SendCampaignRequest>): SendCampaignRequest => {
  const required: (keyof SendCampaignRequest)[] = [
    "campaignId",
    "webhookUrl",
    "title",
    "html",
    "name",
    "senderSequenceNumber",
  ];

  for (const k of required) {
    if (
      payload[k] === undefined ||
      payload[k] === null ||
      (typeof payload[k] === "string" && (payload[k] as string).trim() === "")
    ) {
      throw new Error(`Invalid request: missing field "${k}"`);
    }
  }

  try {
    new URL(payload.webhookUrl as string);
  } catch {
    throw new Error("Invalid request: webhookUrl must be a valid URL");
  }

  return payload as SendCampaignRequest;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- Data access helpers ----
async function getCampaign(supabase: SupabaseClient, campaignId: string) {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, status, list_ids")
    .eq("id", campaignId)
    .single();
  if (error || !data) throw new Error(`Campaign not found: ${error?.message ?? "no data"}`);
  return data as { id: string; status: string; list_ids: string[] | null };
}

async function getContactsForCampaign(supabase: SupabaseClient, listIds: string[] | null): Promise<Contact[]> {
  if (!listIds || listIds.length === 0) return [];

  // Get contacts from the selected lists
  const { data, error } = await supabase
    .from("contact_lists")
    .select(
      `contact_id, contacts:contacts!inner(email, first_name, last_name)`
    )
    .in("list_id", listIds);

  if (error) throw new Error(`Error getting contacts: ${error.message}`);

  const contacts: Contact[] = (data ?? [])
    .map((row: any) => row.contacts as Contact)
    .filter(Boolean);

  // Deduplicate by email
  const deduped = new Map<string, Contact>();
  for (const c of contacts) {
    if (c?.email) deduped.set(c.email.toLowerCase(), c);
  }

  // Attempt to filter unsubscribes (best-effort; if table missing we just skip)
  try {
    const emails = Array.from(deduped.keys());
    if (emails.length) {
      const { data: unsub, error: unsubErr } = await supabase
        .from("unsubscribes")
        .select("email")
        .in("email", emails);

      if (!unsubErr && Array.isArray(unsub) && unsub.length) {
        for (const u of unsub) deduped.delete(String(u.email).toLowerCase());
      } else if (unsubErr && unsubErr.code !== "42P01") {
        // 42P01: relation does not exist. Ignore, otherwise log.
        console.warn("Unsubscribe filter warning:", unsubErr.message);
      }
    }
  } catch (e) {
    console.warn("Unsubscribe filter step skipped:", (e as Error).message);
  }

  return Array.from(deduped.values());
}

async function ensureSendRecords(
  supabase: SupabaseClient,
  campaignId: string,
  contacts: Contact[],
) {
  if (contacts.length === 0) return;

  const sendRecords = contacts.map((c) => ({
    campaign_id: campaignId,
    contact_email: c.email,
    status: "pending",
  }));

  // Upsert to avoid duplicates if retriggered
  const { error } = await supabase
    .from("campaign_sends")
    .upsert(sendRecords, {
      onConflict: "campaign_id,contact_email",
      ignoreDuplicates: true,
    });
  if (error) throw new Error(`Failed to create send records: ${error.message}`);
}

async function updateCampaignStatus(
  supabase: SupabaseClient,
  campaignId: string,
  patch: Record<string, unknown>,
) {
  const { error } = await supabase.from("campaigns").update(patch).eq("id", campaignId);
  if (error) throw new Error(`Failed to update campaign: ${error.message}`);
}

async function markSend(
  supabase: SupabaseClient,
  campaignId: string,
  email: string,
  patch: Record<string, unknown>,
) {
  await supabase
    .from("campaign_sends")
    .update(patch)
    .eq("campaign_id", campaignId)
    .eq("contact_email", email);
}

// ---- Delivery ----
async function deliverWithRetry(webhookUrl: string, body: unknown, maxRetries = 3) {
  let attempt = 0;
  let lastErr: any = null;

  while (attempt < maxRetries) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) return true;

      const text = await res.text().catch(() => "");
      throw new Error(`Webhook ${res.status}: ${text || res.statusText}`);
    } catch (e) {
      lastErr = e;
      await sleep(300 * Math.pow(2, attempt)); // exponential backoff: 0.3s, 0.6s, 1.2s
      attempt++;
    }
  }
  throw lastErr ?? new Error("Unknown webhook error");
}

// ---- Handler ----
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createSupabase();

    const payload = (await req.json().catch(() => ({}))) as Partial<SendCampaignRequest>;
    const { campaignId, webhookUrl, title, html, name, senderSequenceNumber } = validatePayload(payload);

    console.log(`send-campaign:start campaignId=${campaignId}`);

    const campaign = await getCampaign(supabase, campaignId);

    // Idempotency / guard rails
    if (["sending", "sent", "completed"].includes((campaign.status || "").toLowerCase())) {
      console.warn(`Campaign ${campaignId} already in status ${campaign.status}, ignoring start.`);
      return new Response(
        JSON.stringify({ success: true, message: `Campaign already ${campaign.status}.`, campaignId, totalRecipients: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await updateCampaignStatus(supabase, campaignId, {
      status: "sending",
      webhook_url: webhookUrl,
      sender_sequence_number: senderSequenceNumber,
      sent_count: 0,
      failed_count: 0,
    });

    const contacts = await getContactsForCampaign(supabase, campaign.list_ids || []);
    const totalRecipients = contacts.length;
    console.log(`send-campaign:recipients campaignId=${campaignId} total=${totalRecipients}`);

    await updateCampaignStatus(supabase, campaignId, { total_recipients: totalRecipients });
    await ensureSendRecords(supabase, campaignId, contacts);

    // Background processing: no await
    EdgeRuntime.waitUntil(
      processCampaignSends(
        supabase,
        campaignId,
        webhookUrl,
        title,
        html,
        name,
        senderSequenceNumber,
        contacts,
      ),
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `Campaign started with ${totalRecipients} recipients`,
        campaignId,
        totalRecipients,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("send-campaign:error", error?.message || error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

async function processCampaignSends(
  supabase: SupabaseClient,
  campaignId: string,
  webhookUrl: string,
  title: string,
  html: string,
  name: string,
  senderSequenceNumber: number,
  contacts: Contact[],
) {
  console.log(`send-campaign:bg-start campaignId=${campaignId}`);

  let sentCount = 0;
  let failedCount = 0;

  const batchSize = 10; // configurable knob
  for (let i = 0; i < contacts.length; i += batchSize) {
    // Check pause state before each batch
    const { data: c } = await supabase
      .from("campaigns")
      .select("status")
      .eq("id", campaignId)
      .single();

    if (c?.status === "paused") {
      console.warn(`send-campaign:bg-paused campaignId=${campaignId}`);
      break;
    }

    const batch = contacts.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (contact) => {
        const email = contact.email;
        try {
          const body = {
            title,
            html,
            name,
            senderSequenceNumber,
            recipient: {
              email,
              firstName: contact.first_name ?? undefined,
              lastName: contact.last_name ?? undefined,
            },
            campaignId,
          };

          await deliverWithRetry(webhookUrl, body);

          await markSend(supabase, campaignId, email, {
            status: "sent",
            sent_at: new Date().toISOString(),
            error_message: null,
          });
          sentCount++;
          console.log(`send-campaign:bg-sent email=${email}`);
        } catch (e: any) {
          failedCount++;
          console.error(`send-campaign:bg-failed email=${email} err=${e?.message || e}`);
          await markSend(supabase, campaignId, email, {
            status: "failed",
            error_message: e?.message || String(e),
          });
        }
      }),
    );

    // Update progress after each batch
    await updateCampaignStatus(supabase, campaignId, {
      sent_count: sentCount,
      failed_count: failedCount,
    });

    // Small delay to avoid overwhelming downstream
    await sleep(800);
  }

  const finalStatus = sentCount + failedCount === contacts.length && failedCount === 0
    ? "sent"
    : failedCount > 0 && sentCount > 0
    ? "partial"
    : contacts.length === 0
    ? "sent" // nothing to send is not an error
    : "failed";

  await updateCampaignStatus(supabase, campaignId, {
    status: finalStatus,
    sent_count: sentCount,
    failed_count: failedCount,
    sent_at: new Date().toISOString(),
  });

  console.log(
    `send-campaign:bg-complete campaignId=${campaignId} sent=${sentCount} failed=${failedCount} total=${contacts.length}`,
  );
}

serve(handler);
