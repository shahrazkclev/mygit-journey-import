import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { campaignId, webhookUrl, title, html, name, senderSequenceNumber }: SendCampaignRequest = await req.json();

    console.log(`Starting campaign send: ${campaignId}`);

    // Get campaign and validate
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignError?.message}`);
    }

    // Update campaign status to sending
    await supabase
      .from("campaigns")
      .update({ 
        status: "sending",
        webhook_url: webhookUrl,
        sender_sequence_number: senderSequenceNumber
      })
      .eq("id", campaignId);

    // Get all contacts from selected lists
    const { data: contactLists, error: contactListsError } = await supabase
      .from("contact_lists")
      .select(`
        contact_id,
        contacts!inner(email, first_name, last_name)
      `)
      .in("list_id", campaign.list_ids || []);

    if (contactListsError) {
      throw new Error(`Error getting contacts: ${contactListsError.message}`);
    }

    const contacts = contactLists?.map(cl => cl.contacts).filter(Boolean) || [];
    const totalRecipients = contacts.length;

    console.log(`Found ${totalRecipients} recipients for campaign ${campaignId}`);

    // Update total recipients count
    await supabase
      .from("campaigns")
      .update({ total_recipients: totalRecipients })
      .eq("id", campaignId);

    // Create campaign_sends records
    const sendRecords = contacts.map(contact => ({
      campaign_id: campaignId,
      contact_email: contact.email,
      status: "pending"
    }));

    if (sendRecords.length > 0) {
      await supabase
        .from("campaign_sends")
        .insert(sendRecords);
    }

    // Start background processing
    EdgeRuntime.waitUntil(processCampaignSends(supabase, campaignId, webhookUrl, title, html, name, senderSequenceNumber, contacts));

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Campaign started with ${totalRecipients} recipients`,
        campaignId,
        totalRecipients
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in send-campaign function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

async function processCampaignSends(
  supabase: any,
  campaignId: string,
  webhookUrl: string,
  title: string,
  html: string,
  name: string,
  senderSequenceNumber: number,
  contacts: any[]
) {
  console.log(`Background processing started for campaign ${campaignId}`);
  
  let sentCount = 0;
  const batchSize = 10; // Process in batches to avoid overwhelming the webhook

  try {
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      
      // Check if campaign is paused
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("status")
        .eq("id", campaignId)
        .single();

      if (campaign?.status === "paused") {
        console.log(`Campaign ${campaignId} paused, stopping processing`);
        break;
      }

      // Process batch
      const batchPromises = batch.map(async (contact) => {
        try {
          const webhookPayload = {
            title,
            html,
            name,
            senderSequenceNumber,
            recipient: {
              email: contact.email,
              firstName: contact.first_name,
              lastName: contact.last_name
            },
            campaignId
          };

          console.log(`Sending to webhook for ${contact.email}`);
          
          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(webhookPayload),
          });

          if (response.ok) {
            await supabase
              .from("campaign_sends")
              .update({ 
                status: "sent", 
                sent_at: new Date().toISOString() 
              })
              .eq("campaign_id", campaignId)
              .eq("contact_email", contact.email);
            
            sentCount++;
            console.log(`Successfully sent to ${contact.email}`);
          } else {
            const errorText = await response.text();
            throw new Error(`Webhook failed: ${response.status} - ${errorText}`);
          }
        } catch (error: any) {
          console.error(`Failed to send to ${contact.email}:`, error);
          
          await supabase
            .from("campaign_sends")
            .update({ 
              status: "failed", 
              error_message: error.message 
            })
            .eq("campaign_id", campaignId)
            .eq("contact_email", contact.email);
        }
      });

      await Promise.all(batchPromises);

      // Update campaign progress
      await supabase
        .from("campaigns")
        .update({ sent_count: sentCount })
        .eq("id", campaignId);

      // Brief delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Mark campaign as completed
    const finalStatus = sentCount === contacts.length ? "sent" : "failed";
    await supabase
      .from("campaigns")
      .update({ 
        status: finalStatus,
        sent_count: sentCount,
        sent_at: new Date().toISOString()
      })
      .eq("id", campaignId);

    console.log(`Campaign ${campaignId} completed. Sent: ${sentCount}/${contacts.length}`);

  } catch (error: any) {
    console.error(`Background processing failed for campaign ${campaignId}:`, error);
    
    await supabase
      .from("campaigns")
      .update({ 
        status: "failed",
        sent_count: sentCount 
      })
      .eq("id", campaignId);
  }
}

serve(handler);