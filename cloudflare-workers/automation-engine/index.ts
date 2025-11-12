// Cloudflare Worker for automation engine - runs on cron to process scheduled actions
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  DEFAULT_WEBHOOK_URL?: string;
}

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

// Evaluate automation rule conditions
async function evaluateConditions(
  env: Env,
  rule: any,
  contact: any
): Promise<boolean> {
  const conditions = rule.conditions || [];
  
  for (const condition of conditions) {
    if (condition.type === 'wait_duration') {
      // This is handled by execute_at timestamp, skip here
      continue;
    }
    
    if (condition.type === 'tag_exists') {
      const tags = contact.tags || [];
      const tagExists = tags.some((tag: string) => 
        tag.toLowerCase().trim() === condition.tag.toLowerCase().trim()
      );
      if (!tagExists) {
        return false;
      }
    }
    
    if (condition.type === 'tag_not_exists') {
      const tags = contact.tags || [];
      const tagExists = tags.some((tag: string) => 
        tag.toLowerCase().trim() === condition.tag.toLowerCase().trim()
      );
      if (tagExists) {
        return false;
      }
    }
    
    if (condition.type === 'has_product') {
      // Check if contact has purchased a specific product
      const contactProducts = await supabaseQuery(env, 'contact_products', {
        select: 'product_id',
        filters: {
          contact_id: `eq.${contact.id}`,
          product_id: `eq.${condition.product_id}`,
        },
      });
      const hasProduct = Array.isArray(contactProducts) ? contactProducts.length > 0 : !!contactProducts;
      if (!hasProduct) {
        return false;
      }
    }
    
    if (condition.type === 'no_product') {
      // Check if contact has NOT purchased a specific product
      const contactProducts = await supabaseQuery(env, 'contact_products', {
        select: 'product_id',
        filters: {
          contact_id: `eq.${contact.id}`,
          product_id: `eq.${condition.product_id}`,
        },
      });
      const hasProduct = Array.isArray(contactProducts) ? contactProducts.length > 0 : !!contactProducts;
      if (hasProduct) {
        return false;
      }
    }
  }
  
  return true;
}

// Send email via webhook
async function sendEmailViaWebhook(webhookUrl: string, payload: any): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (error) {
    console.error('Webhook send failed:', error);
    return false;
  }
}

// Process scheduled automation action
async function processAutomationAction(env: Env, action: any): Promise<void> {
  try {
    // Get automation rule
    const rules = await supabaseQuery(env, 'automation_rules', {
      select: '*',
      filters: { id: `eq.${action.automation_rule_id}` },
    });
    const rule = Array.isArray(rules) ? rules[0] : rules;
    
    if (!rule || !rule.enabled) {
      await supabaseQuery(env, 'automation_actions', {
        method: 'PATCH',
        filters: { id: `eq.${action.id}` },
        body: {
          status: 'skipped',
          executed_at: new Date().toISOString(),
          error_message: 'Rule not found or disabled',
        },
      });
      return;
    }
    
    // Get contact
    const contacts = await supabaseQuery(env, 'contacts', {
      select: '*',
      filters: { id: `eq.${action.contact_id}` },
    });
    const contact = Array.isArray(contacts) ? contacts[0] : contacts;
    
    if (!contact || contact.status !== 'subscribed') {
      await supabaseQuery(env, 'automation_actions', {
        method: 'PATCH',
        filters: { id: `eq.${action.id}` },
        body: {
          status: 'skipped',
          executed_at: new Date().toISOString(),
          error_message: 'Contact not found or unsubscribed',
        },
      });
      return;
    }
    
    // Evaluate conditions
    const conditionsMet = await evaluateConditions(env, rule, contact);
    
    if (!conditionsMet) {
      await supabaseQuery(env, 'automation_actions', {
        method: 'PATCH',
        filters: { id: `eq.${action.id}` },
        body: {
          status: 'skipped',
          executed_at: new Date().toISOString(),
          error_message: 'Conditions not met',
        },
      });
      
      // Log the skip
      await supabaseQuery(env, 'automation_logs', {
        method: 'POST',
        body: {
          automation_rule_id: rule.id,
          automation_action_id: action.id,
          contact_id: contact.id,
          event_type: 'action_skipped',
          status: 'skipped',
          message: 'Conditions not met',
        },
      });
      return;
    }
    
    // Execute action
    const actionConfig = rule.action_config || {};
    
    if (actionConfig.type === 'send_email') {
      // Get email template if specified
      let subject = actionConfig.subject || 'Hello';
      let htmlContent = actionConfig.html_content || '';
      
      if (actionConfig.template_id) {
        const templates = await supabaseQuery(env, 'email_templates', {
          select: '*',
          filters: { id: `eq.${actionConfig.template_id}` },
        });
        const template = Array.isArray(templates) ? templates[0] : templates;
        if (template) {
          subject = template.subject;
          htmlContent = template.html_content;
        }
      }
      
      // Personalize content
      const contactName = contact.first_name || contact.email.split('@')[0] || 'Friend';
      const personalizedHtml = htmlContent
        .replace(/\{\{name\}\}/g, contactName)
        .replace(/\{\{email\}\}/g, contact.email)
        .replace(/\{\{contact_id\}\}/g, contact.id)
        .replace(/\{\{first_name\}\}/g, contact.first_name || '')
        .replace(/\{\{last_name\}\}/g, contact.last_name || '');
      
      const personalizedSubject = subject
        .replace(/\{\{name\}\}/g, contactName)
        .replace(/\{\{email\}\}/g, contact.email);
      
      // Send via webhook
      const webhookUrl = actionConfig.webhook_url || env.DEFAULT_WEBHOOK_URL;
      if (!webhookUrl) {
        throw new Error('No webhook URL configured');
      }
      
      const webhookPayload = {
        to: contact.email,
        subject: personalizedSubject,
        html: personalizedHtml,
        automation_rule_id: rule.id,
        contact: {
          id: contact.id,
          email: contact.email,
          first_name: contact.first_name,
          last_name: contact.last_name,
          name: contactName,
        },
      };
      
      const success = await sendEmailViaWebhook(webhookUrl, webhookPayload);
      
      if (success) {
        await supabaseQuery(env, 'automation_actions', {
          method: 'PATCH',
          filters: { id: `eq.${action.id}` },
          body: {
            status: 'completed',
            executed_at: new Date().toISOString(),
          },
        });
        
        // Update rule statistics
        await supabaseQuery(env, 'automation_rules', {
          method: 'PATCH',
          filters: { id: `eq.${rule.id}` },
          body: {
            success_count: (rule.success_count || 0) + 1,
            last_triggered_at: new Date().toISOString(),
          },
        });
        
        // Log success
        await supabaseQuery(env, 'automation_logs', {
          method: 'POST',
          body: {
            automation_rule_id: rule.id,
            automation_action_id: action.id,
            contact_id: contact.id,
            event_type: 'action_executed',
            status: 'success',
            message: 'Email sent successfully',
          },
        });
      } else {
        throw new Error('Failed to send email via webhook');
      }
    }
  } catch (error: any) {
    console.error(`Error processing automation action ${action.id}:`, error);
    
    await supabaseQuery(env, 'automation_actions', {
      method: 'PATCH',
      filters: { id: `eq.${action.id}` },
      body: {
        status: 'failed',
        executed_at: new Date().toISOString(),
        error_message: error.message,
      },
    });
    
    // Update rule failure count
    const rules = await supabaseQuery(env, 'automation_rules', {
      select: 'failure_count',
      filters: { id: `eq.${action.automation_rule_id}` },
    });
    const rule = Array.isArray(rules) ? rules[0] : rules;
    
    if (rule) {
      await supabaseQuery(env, 'automation_rules', {
        method: 'PATCH',
        filters: { id: `eq.${action.automation_rule_id}` },
        body: {
          failure_count: (rule.failure_count || 0) + 1,
        },
      });
    }
    
    // Log failure
    await supabaseQuery(env, 'automation_logs', {
      method: 'POST',
      body: {
        automation_rule_id: action.automation_rule_id,
        automation_action_id: action.id,
        contact_id: action.contact_id,
        event_type: 'action_failed',
        status: 'failure',
        message: error.message,
      },
    });
  }
}

// Scheduled trigger handler (runs every hour)
async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  console.log('Running automation engine cron job...');
  
  try {
    // Get all pending actions that are due
    const now = new Date().toISOString();
    const actions = await supabaseQuery(env, 'automation_actions', {
      select: '*',
      filters: {
        status: `eq.pending`,
        execute_at: `lte.${now}`,
      },
    });
    
    const actionArray = Array.isArray(actions) ? actions : (actions ? [actions] : []);
    console.log(`Found ${actionArray.length} due automation actions`);
    
    // Process each action
    for (const action of actionArray) {
      // Mark as executing
      await supabaseQuery(env, 'automation_actions', {
        method: 'PATCH',
        filters: { id: `eq.${action.id}` },
        body: { status: 'executing' },
      });
      
      // Process the action
      await processAutomationAction(env, action);
    }
    
    console.log('Automation engine cron job completed');
  } catch (error) {
    console.error('Error in automation engine cron job:', error);
  }
}

// HTTP handler for manual triggers and API endpoints
async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  
  try {
    // Trigger automation for a contact (when tag changes)
    if (path === '/automation/trigger' && request.method === 'POST') {
      const { contactId, triggerType, triggerData } = await request.json();
      
      // Get all enabled automation rules that match this trigger
      const rules = await supabaseQuery(env, 'automation_rules', {
        select: '*',
        filters: { enabled: `eq.true` },
      });
      
      const ruleArray = Array.isArray(rules) ? rules : (rules ? [rules] : []);
      const matchingRules = ruleArray.filter((rule: any) => {
        const triggerConfig = rule.trigger_config || {};
        return triggerConfig.type === triggerType;
      });
      
      // For each matching rule, create scheduled actions
      for (const rule of matchingRules) {
        const conditions = rule.conditions || [];
        let delayDays = 0;
        
        // Find wait_duration condition
        for (const condition of conditions) {
          if (condition.type === 'wait_duration') {
            delayDays = condition.days || 0;
            break;
          }
        }
        
        // Calculate execute_at timestamp
        const executeAt = new Date();
        executeAt.setDate(executeAt.getDate() + delayDays);
        
        // Create automation action
        await supabaseQuery(env, 'automation_actions', {
          method: 'POST',
          body: {
            automation_rule_id: rule.id,
            contact_id: contactId,
            status: 'pending',
            execute_at: executeAt.toISOString(),
          },
        });
        
        // Log trigger
        await supabaseQuery(env, 'automation_logs', {
          method: 'POST',
          body: {
            automation_rule_id: rule.id,
            contact_id: contactId,
            event_type: 'triggered',
            status: 'success',
            message: `Rule triggered by ${triggerType}`,
          },
        });
        
        // Update rule trigger count
        await supabaseQuery(env, 'automation_rules', {
          method: 'PATCH',
          filters: { id: `eq.${rule.id}` },
          body: {
            trigger_count: (rule.trigger_count || 0) + 1,
            last_triggered_at: new Date().toISOString(),
          },
        });
      }
      
      return new Response(JSON.stringify({ success: true, triggered: matchingRules.length }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    
    // Get automation rules
    if (path === '/automation/list' && request.method === 'GET') {
      const userId = url.searchParams.get('user_id');
      const filters: Record<string, string> = {};
      if (userId) {
        filters.user_id = `eq.${userId}`;
      }
      
      const rules = await supabaseQuery(env, 'automation_rules', {
        select: '*',
        filters,
      });
      
      return new Response(JSON.stringify(Array.isArray(rules) ? rules : (rules ? [rules] : [])), {
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
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    await scheduled(event, env, ctx);
  },
  
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};

