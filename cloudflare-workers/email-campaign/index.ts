// Cloudflare Worker for reliable email campaign sending
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  QUEUE_NAME: string;
  MAX_RETRIES: string;
  BATCH_SIZE: string;
  DELAY_BETWEEN_EMAILS_MS: string;
  EMAIL_SEND_QUEUE: Queue;
}

interface QueueMessage {
  campaignId: string;
  contact: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  campaign: {
    subject: string;
    html_content: string;
    webhook_url: string;
    sender_sequence: number;
  };
  attempt: number;
  maxRetries: number;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper to query Supabase REST API
async function supabaseQuery(
  env: Env,
  table: string,
  options: {
    method?: string;
    body?: any;
    select?: string;
    filters?: Record<string, string>;
  }
): Promise<any> {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
  
  const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
  
  if (options.select) {
    url.searchParams.append('select', options.select);
  }
  
  if (options.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  
  const method = options.method || 'GET';
  const headers: Record<string, string> = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };
  
  if (method === 'POST' || method === 'PATCH') {
    headers['Prefer'] = 'return=representation';
  }
  
  const response = await fetch(url.toString(), {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${response.status} - ${error}`);
  }
  
  if (method === 'DELETE' || response.status === 204) {
    return null;
  }
  
  return response.json();
}

// Send email via webhook
async function sendEmailViaWebhook(webhookUrl: string, payload: any, retries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        return true;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    } catch (error) {
      console.error(`Webhook send attempt ${attempt} failed:`, error);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }
  }
  
  return false;
}

// Process queue message
async function processQueueMessage(message: QueueMessage, env: Env): Promise<void> {
  try {
    // Personalize HTML content
    const contactName = message.contact.first_name || message.contact.email.split('@')[0] || 'Friend';
    let personalizedHtml = message.campaign.html_content
      .replace(/\{\{name\}\}/g, contactName)
      .replace(/\{\{email\}\}/g, message.contact.email)
      .replace(/\{\{contact_id\}\}/g, message.contact.id)
      .replace(/\{\{first_name\}\}/g, message.contact.first_name || '')
      .replace(/\{\{last_name\}\}/g, message.contact.last_name || '');
    
    // Prepare webhook payload
    const webhookPayload = {
      to: message.contact.email,
      subject: message.campaign.subject,
      html: personalizedHtml,
      campaign_id: message.campaignId,
      sender_sequence: message.campaign.sender_sequence,
      contact: {
        id: message.contact.id,
        email: message.contact.email,
        first_name: message.contact.first_name,
        last_name: message.contact.last_name,
        name: contactName,
      },
    };
    
    // Send email via webhook
    const success = await sendEmailViaWebhook(message.campaign.webhook_url, webhookPayload);
    
    if (success) {
      // Mark as sent in database
      await supabaseQuery(env, 'campaign_sends', {
        method: 'PATCH',
        filters: {
          campaign_id: `eq.${message.campaignId}`,
          contact_email: `eq.${message.contact.email}`,
        },
        body: {
          status: 'sent',
          sent_at: new Date().toISOString(),
          error_message: null,
        },
      });
      
      // Update campaign sent count
      const campaigns = await supabaseQuery(env, 'campaigns', {
        select: 'sent_count',
        filters: { id: `eq.${message.campaignId}` },
      });
      const campaign = Array.isArray(campaigns) ? campaigns[0] : campaigns;
      
      await supabaseQuery(env, 'campaigns', {
        method: 'PATCH',
        filters: { id: `eq.${message.campaignId}` },
        body: {
          sent_count: (campaign?.sent_count || 0) + 1,
        },
      });
    } else {
      throw new Error('Failed to send email after retries');
    }
  } catch (error: any) {
    console.error(`Failed to process email for ${message.contact.email}:`, error);
    
    // Mark as failed if max retries reached
    if (message.attempt >= message.maxRetries) {
      await supabaseQuery(env, 'campaign_sends', {
        method: 'PATCH',
        filters: {
          campaign_id: `eq.${message.campaignId}`,
          contact_email: `eq.${message.contact.email}`,
        },
        body: {
          status: 'failed',
          error_message: error.message,
        },
      });
      
      // Update campaign failed count
      const campaigns = await supabaseQuery(env, 'campaigns', {
        select: 'failed_count',
        filters: { id: `eq.${message.campaignId}` },
      });
      const campaign = Array.isArray(campaigns) ? campaigns[0] : campaigns;
      
      await supabaseQuery(env, 'campaigns', {
        method: 'PATCH',
        filters: { id: `eq.${message.campaignId}` },
        body: {
          failed_count: (campaign?.failed_count || 0) + 1,
        },
      });
    } else {
      // Retry by re-queuing
      await env.EMAIL_SEND_QUEUE.send({
        ...message,
        attempt: message.attempt + 1,
      });
    }
  }
}

// Queue consumer
export default {
  async queue(batch: MessageBatch<QueueMessage>, env: Env, ctx: ExecutionContext): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processQueueMessage(message.body, env);
        message.ack();
      } catch (error) {
        console.error('Error processing queue message:', error);
        message.retry();
      }
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Start campaign
      if (path === '/campaign/start' && request.method === 'POST') {
        const { campaignId } = await request.json();
        
        // Get campaign details
        const campaigns = await supabaseQuery(env, 'campaigns', {
          select: '*',
          filters: { id: `eq.${campaignId}` },
        });
        const campaign = Array.isArray(campaigns) ? campaigns[0] : campaigns;
        
        if (!campaign) {
          return new Response(JSON.stringify({ error: 'Campaign not found' }), {
            status: 404,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        
        // Get contacts for the campaign lists
        const listIds = campaign.list_ids || [];
        if (listIds.length === 0) {
          return new Response(JSON.stringify({ error: 'No lists selected' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        
        // Get contacts from lists - need to query each list separately or use a different approach
        // For now, we'll get all contact_lists and filter
        const allContactLists = await supabaseQuery(env, 'contact_lists', {
          select: 'contact_id,list_id,contacts(id,email,first_name,last_name,status)',
        });
        
        const validContacts = allContactLists
          .filter((cl: any) => listIds.includes(cl.list_id) && cl.contacts?.status === 'subscribed')
          .map((cl: any) => cl.contacts)
          .filter((c: any) => c)
          .filter((c: any, index: number, self: any[]) => 
            index === self.findIndex((t: any) => t.id === c.id)
          ); // Remove duplicates
        
        if (validContacts.length === 0) {
          return new Response(JSON.stringify({ error: 'No valid contacts found' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        
        // Create send records
        const sendRecords = validContacts.map((contact: any) => ({
          campaign_id: campaignId,
          contact_email: contact.email,
          status: 'pending',
        }));
        
        // Insert in batches to avoid payload size issues
        const batchSize = 100;
        for (let i = 0; i < sendRecords.length; i += batchSize) {
          const batch = sendRecords.slice(i, i + batchSize);
          await supabaseQuery(env, 'campaign_sends', {
            method: 'POST',
            body: batch,
          });
        }
        
        // Update campaign status
        await supabaseQuery(env, 'campaigns', {
          method: 'PATCH',
          filters: { id: `eq.${campaignId}` },
          body: {
            status: 'sending',
            total_recipients: validContacts.length,
            sent_count: 0,
            failed_count: 0,
            started_at: new Date().toISOString(),
          },
        });
        
        // Queue all emails
        const maxRetries = parseInt(env.MAX_RETRIES || '3');
        for (const contact of validContacts) {
          await env.EMAIL_SEND_QUEUE.send({
            campaignId,
            contact: {
              id: contact.id,
              email: contact.email,
              first_name: contact.first_name,
              last_name: contact.last_name,
            },
            campaign: {
              subject: campaign.subject,
              html_content: campaign.html_content,
              webhook_url: campaign.webhook_url,
              sender_sequence: campaign.sender_sequence_number || 1,
            },
            attempt: 1,
            maxRetries,
          });
        }
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Campaign started',
          total_recipients: validContacts.length,
        }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      
      // Pause campaign
      if (path === '/campaign/pause' && request.method === 'POST') {
        const { campaignId } = await request.json();
        
        await supabaseQuery(env, 'campaigns', {
          method: 'PATCH',
          filters: { id: `eq.${campaignId}` },
          body: { status: 'paused' },
        });
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      
      // Resume campaign
      if (path === '/campaign/resume' && request.method === 'POST') {
        const { campaignId } = await request.json();
        
        // Get pending sends - need to get contacts separately
        const pendingSends = await supabaseQuery(env, 'campaign_sends', {
          select: 'contact_email',
          filters: {
            campaign_id: `eq.${campaignId}`,
            status: `eq.pending`,
          },
        });
        
        // Get campaign details
        const campaigns = await supabaseQuery(env, 'campaigns', {
          select: '*',
          filters: { id: `eq.${campaignId}` },
        });
        const campaign = Array.isArray(campaigns) ? campaigns[0] : campaigns;
        
        if (!campaign) {
          return new Response(JSON.stringify({ error: 'Campaign not found' }), {
            status: 404,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        
        // Get contacts for pending sends
        const emails = pendingSends.map((s: any) => s.contact_email);
        const contacts = await supabaseQuery(env, 'contacts', {
          select: 'id,email,first_name,last_name',
          filters: { email: `in.(${emails.join(',')})` },
        });
        
        const maxRetries = parseInt(env.MAX_RETRIES || '3');
        const contactMap = new Map((Array.isArray(contacts) ? contacts : [contacts]).map((c: any) => [c.email, c]));
        
        for (const send of pendingSends) {
          const contact = contactMap.get(send.contact_email);
          if (contact) {
            await env.EMAIL_SEND_QUEUE.send({
              campaignId,
              contact: {
                id: contact.id,
                email: contact.email,
                first_name: contact.first_name,
                last_name: contact.last_name,
              },
              campaign: {
                subject: campaign.subject,
                html_content: campaign.html_content,
                webhook_url: campaign.webhook_url,
                sender_sequence: campaign.sender_sequence_number || 1,
              },
              attempt: 1,
              maxRetries,
            });
          }
        }
        
        await supabaseQuery(env, 'campaigns', {
          method: 'PATCH',
          filters: { id: `eq.${campaignId}` },
          body: { status: 'sending' },
        });
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      
      // Get campaign status
      if (path.startsWith('/campaign/status/') && request.method === 'GET') {
        const campaignId = path.split('/').pop();
        
        const campaigns = await supabaseQuery(env, 'campaigns', {
          select: '*',
          filters: { id: `eq.${campaignId}` },
        });
        const campaign = Array.isArray(campaigns) ? campaigns[0] : campaigns;
        
        if (!campaign) {
          return new Response(JSON.stringify({ error: 'Campaign not found' }), {
            status: 404,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        
        // Get send statistics
        const sends = await supabaseQuery(env, 'campaign_sends', {
          select: 'status',
          filters: { campaign_id: `eq.${campaignId}` },
        });
        
        const sendArray = Array.isArray(sends) ? sends : [sends];
        const stats = {
          total: sendArray.length,
          sent: sendArray.filter((s: any) => s.status === 'sent').length,
          failed: sendArray.filter((s: any) => s.status === 'failed').length,
          pending: sendArray.filter((s: any) => s.status === 'pending').length,
        };
        
        return new Response(JSON.stringify({
          ...campaign,
          statistics: stats,
        }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },
};

