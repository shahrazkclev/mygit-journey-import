// Test script to manually trigger webhook for pending automation actions
// This simulates what the Edge Function should do

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://mixifcnokcmxarpzwfiy.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function processPendingActions() {
  try {
    // Get all pending actions that are due
    const now = new Date().toISOString();
    const { data: actions, error: actionsError } = await supabase
      .from('automation_actions')
      .select('*')
      .eq('status', 'pending')
      .lte('execute_at', now)
      .order('execute_at', { ascending: true })
      .limit(50);

    if (actionsError) throw actionsError;

    if (!actions || actions.length === 0) {
      console.log('No actions to process');
      return;
    }

    console.log(`Found ${actions.length} pending actions to process`);

    for (const action of actions) {
      try {
        console.log(`\nProcessing action ${action.id} for contact ${action.contact_id}`);
        
        // Mark as executing
        await supabase
          .from('automation_actions')
          .update({ status: 'executing' })
          .eq('id', action.id);

        // Get automation rule
        const { data: rule, error: ruleError } = await supabase
          .from('automation_rules')
          .select('*')
          .eq('id', action.automation_rule_id)
          .single();

        if (ruleError || !rule || !rule.enabled) {
          console.error('Rule not found or disabled:', ruleError);
          await supabase
            .from('automation_actions')
            .update({
              status: 'skipped',
              executed_at: new Date().toISOString(),
              error_message: 'Rule not found or disabled'
            })
            .eq('id', action.id);
          continue;
        }

        // Get contact
        const { data: contact, error: contactError } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', action.contact_id)
          .single();

        if (contactError || !contact || contact.status !== 'subscribed') {
          console.error('Contact not found or unsubscribed:', contactError);
          await supabase
            .from('automation_actions')
            .update({
              status: 'skipped',
              executed_at: new Date().toISOString(),
              error_message: 'Contact not found or unsubscribed'
            })
            .eq('id', action.id);
          continue;
        }

        // Get steps
        const steps = rule.steps && Array.isArray(rule.steps) && rule.steps.length > 0
          ? rule.steps
          : (rule.action_config ? [{ type: 'send_email', ...rule.action_config }] : []);

        if (steps.length === 0) {
          throw new Error('No steps configured');
        }

        const stepIndex = action.step_index !== undefined ? action.step_index : 0;
        const currentStep = steps[stepIndex];

        if (!currentStep) {
          // All steps completed
          await supabase
            .from('automation_actions')
            .update({
              status: 'completed',
              executed_at: new Date().toISOString()
            })
            .eq('id', action.id);
          console.log('All steps completed');
          continue;
        }

        console.log(`Executing step ${stepIndex}: ${currentStep.type}`);

        let stepSuccess = false;

        if (currentStep.type === 'send_email') {
          // Get email content
          let subject = currentStep.subject || 'Hello';
          let htmlContent = currentStep.html_content || '';

          if (currentStep.template_id) {
            const { data: template } = await supabase
              .from('email_templates')
              .select('*')
              .eq('id', currentStep.template_id)
              .single();

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

          // Get webhook URL
          let webhookUrl = currentStep.webhook_url;
          if (!webhookUrl && currentStep.webhook_id) {
            const { data: webhook } = await supabase
              .from('webhooks')
              .select('url')
              .eq('id', currentStep.webhook_id)
              .eq('enabled', true)
              .single();
            
            if (webhook) {
              webhookUrl = webhook.url;
            }
          }

          if (!webhookUrl) {
            throw new Error('No webhook URL configured');
          }

          console.log(`Sending email via webhook: ${webhookUrl}`);
          console.log(`To: ${contact.email}`);
          console.log(`Subject: ${personalizedSubject}`);

          // Send via webhook
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

          const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
          });

          stepSuccess = webhookResponse.ok;
          
          if (!stepSuccess) {
            const errorText = await webhookResponse.text();
            console.error(`Webhook failed: ${webhookResponse.status} - ${errorText}`);
            throw new Error(`Webhook failed: ${webhookResponse.status} - ${errorText}`);
          } else {
            console.log('✅ Webhook called successfully!');
          }
        } else if (currentStep.type === 'stop') {
          await supabase
            .from('automation_actions')
            .update({
              status: 'completed',
              executed_at: new Date().toISOString()
            })
            .eq('id', action.id);
          console.log('Automation stopped');
          continue;
        }

        if (!stepSuccess) {
          throw new Error(`Failed to execute step: ${currentStep.type}`);
        }

        // Check if there's a next step
        const nextStepIndex = stepIndex + 1;
        const nextStep = steps[nextStepIndex];

        if (nextStep) {
          // Calculate delay for next step
          const executeAt = new Date();
          
          if (nextStep.type === 'wait') {
            const days = nextStep.delay_days || 0;
            const hours = nextStep.delay_hours || 0;
            const minutes = nextStep.delay_minutes || 0;
            
            executeAt.setDate(executeAt.getDate() + days);
            executeAt.setHours(executeAt.getHours() + hours);
            executeAt.setMinutes(executeAt.getMinutes() + minutes);
            
            if (nextStep.delay_time) {
              const timeParts = nextStep.delay_time.split(' ');
              const timeStr = timeParts[0];
              const period = timeParts[1];
              const [hoursStr, minutesStr] = timeStr.split(':');
              let hour = parseInt(hoursStr) || 0;
              const minute = parseInt(minutesStr) || 0;
              
              if (period) {
                const isPM = period.toUpperCase() === 'PM';
                if (isPM && hour !== 12) {
                  hour += 12;
                } else if (!isPM && hour === 12) {
                  hour = 0;
                }
              }
              
              executeAt.setHours(hour, minute, 0, 0);
            }
          }

          await supabase
            .from('automation_actions')
            .insert({
              automation_rule_id: rule.id,
              contact_id: contact.id,
              status: 'pending',
              execute_at: executeAt.toISOString(),
              step_index: nextStepIndex,
            });

          // Mark current action as completed
          await supabase
            .from('automation_actions')
            .update({
              status: 'completed',
              executed_at: new Date().toISOString()
            })
            .eq('id', action.id);
        } else {
          // All steps completed
          await supabase
            .from('automation_actions')
            .update({
              status: 'completed',
              executed_at: new Date().toISOString()
            })
            .eq('id', action.id);
        }

        // Log success
        await supabase
          .from('automation_logs')
          .insert({
            automation_rule_id: rule.id,
            automation_action_id: action.id,
            contact_id: contact.id,
            event_type: 'action_executed',
            status: 'success',
            message: `Step ${stepIndex + 1} executed: ${currentStep.type}`
          });

        console.log(`✅ Action ${action.id} completed successfully`);
      } catch (error: any) {
        console.error(`❌ Error processing action ${action.id}:`, error);
        
        await supabase
          .from('automation_actions')
          .update({
            status: 'failed',
            executed_at: new Date().toISOString(),
            error_message: error.message
          })
          .eq('id', action.id);

        await supabase
          .from('automation_logs')
          .insert({
            automation_rule_id: action.automation_rule_id,
            automation_action_id: action.id,
            contact_id: action.contact_id,
            event_type: 'action_failed',
            status: 'failure',
            message: error.message
          });
      }
    }

    console.log('\n✅ Processing complete!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

processPendingActions();

