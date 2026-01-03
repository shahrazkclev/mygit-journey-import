// Supabase Edge Function to process scheduled automation actions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all pending actions that are due
    const now = new Date().toISOString()
    const { data: actions, error: actionsError } = await supabase
      .from('automation_actions')
      .select('*')
      .eq('status', 'pending')
      .lte('execute_at', now)
      .order('execute_at', { ascending: true })
      .limit(50) // Process in batches

    if (actionsError) throw actionsError

    if (!actions || actions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No actions to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processed = 0
    let failed = 0

    // Process each action
    for (const action of actions) {
      try {
        // Mark as executing
        await supabase
          .from('automation_actions')
          .update({ status: 'executing' })
          .eq('id', action.id)

        // Get automation rule
        const { data: rule, error: ruleError } = await supabase
          .from('automation_rules')
          .select('*')
          .eq('id', action.automation_rule_id)
          .single()

        if (ruleError || !rule || !rule.enabled) {
          await supabase
            .from('automation_actions')
            .update({
              status: 'skipped',
              executed_at: new Date().toISOString(),
              error_message: 'Rule not found or disabled'
            })
            .eq('id', action.id)
          continue
        }

        // Get contact (refresh to get latest tags)
        const { data: contact, error: contactError } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', action.contact_id)
          .single()

        if (contactError || !contact || contact.status !== 'subscribed') {
          await supabase
            .from('automation_actions')
            .update({
              status: 'skipped',
              executed_at: new Date().toISOString(),
              error_message: 'Contact not found or unsubscribed'
            })
            .eq('id', action.id)
          continue
        }

        // Get steps from rule
        const steps = rule.steps && Array.isArray(rule.steps) && rule.steps.length > 0
          ? rule.steps
          : (rule.action_config ? [{ type: 'send_email', ...rule.action_config }] : [])

        if (steps.length === 0) {
          await supabase
            .from('automation_actions')
            .update({
              status: 'failed',
              executed_at: new Date().toISOString(),
              error_message: 'No steps configured'
            })
            .eq('id', action.id)
          failed++
          continue
        }

        // Get the step index
        const stepIndex = action.step_index !== undefined ? action.step_index : 0
        const currentStep = steps[stepIndex]

        if (!currentStep) {
          // All steps completed
          await supabase
            .from('automation_actions')
            .update({
              status: 'completed',
              executed_at: new Date().toISOString()
            })
            .eq('id', action.id)
          processed++
          continue
        }

        // Check tag conditions before executing step
        if (currentStep.check_tags) {
          const tags = contact.tags || []
          const checkTags = Array.isArray(currentStep.check_tags) ? currentStep.check_tags : [currentStep.check_tags]
          
          let shouldSkip = false
          for (const checkTag of checkTags) {
            const tagExists = tags.some((t: string) => 
              t.toLowerCase().trim() === checkTag.toLowerCase().trim()
            )
            
            if (currentStep.check_type === 'not_exists' && tagExists) {
              shouldSkip = true
              break
            }
            if (currentStep.check_type === 'exists' && !tagExists) {
              shouldSkip = true
              break
            }
          }
          
          if (shouldSkip) {
            await supabase
              .from('automation_actions')
              .update({
                status: 'skipped',
                executed_at: new Date().toISOString(),
                error_message: 'Tag check condition not met'
              })
              .eq('id', action.id)
            
            await supabase
              .from('automation_logs')
              .insert({
                automation_rule_id: rule.id,
                automation_action_id: action.id,
                contact_id: contact.id,
                event_type: 'action_skipped',
                status: 'skipped',
                message: 'Tag check condition not met'
              })
            continue
          }
        }

        // Execute current step
        let stepSuccess = false

        if (currentStep.type === 'add_tag') {
          if (currentStep.tag) {
            const tags = contact.tags || []
            const tagLower = currentStep.tag.toLowerCase().trim()
            if (!tags.some((t: string) => t.toLowerCase().trim() === tagLower)) {
              const updatedTags = [...tags, currentStep.tag]
              await supabase
                .from('contacts')
                .update({ tags: updatedTags })
                .eq('id', contact.id)
            }
            stepSuccess = true
          }
        } else if (currentStep.type === 'remove_tag') {
          if (currentStep.tag) {
            const tags = contact.tags || []
            const tagLower = currentStep.tag.toLowerCase().trim()
            const updatedTags = tags.filter((t: string) => t.toLowerCase().trim() !== tagLower)
            await supabase
              .from('contacts')
              .update({ tags: updatedTags })
              .eq('id', contact.id)
            stepSuccess = true
          }
        } else if (currentStep.type === 'send_email') {
          // Get email template if specified
          let subject = currentStep.subject || 'Hello'
          let htmlContent = currentStep.html_content || ''

          if (currentStep.template_id) {
            const { data: template } = await supabase
              .from('email_templates')
              .select('*')
              .eq('id', currentStep.template_id)
              .single()

            if (template) {
              subject = template.subject
              htmlContent = template.html_content
            }
          }

          // Personalize content
          const contactName = contact.first_name || contact.email.split('@')[0] || 'Friend'
          const personalizedHtml = htmlContent
            .replace(/\{\{name\}\}/g, contactName)
            .replace(/\{\{email\}\}/g, contact.email)
            .replace(/\{\{contact_id\}\}/g, contact.id)
            .replace(/\{\{first_name\}\}/g, contact.first_name || '')
            .replace(/\{\{last_name\}\}/g, contact.last_name || '')

          const personalizedSubject = subject
            .replace(/\{\{name\}\}/g, contactName)
            .replace(/\{\{email\}\}/g, contact.email)

          // Get webhook URL
          let webhookUrl = currentStep.webhook_url
          if (!webhookUrl && currentStep.webhook_id) {
            const { data: webhook } = await supabase
              .from('webhooks')
              .select('url')
              .eq('id', currentStep.webhook_id)
              .eq('enabled', true)
              .single()
            if (webhook) {
              webhookUrl = webhook.url
            }
          }

          if (!webhookUrl) {
            throw new Error('No webhook URL configured')
          }

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
          }

          const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
          })

          stepSuccess = webhookResponse.ok
        } else if (currentStep.type === 'stop') {
          await supabase
            .from('automation_actions')
            .update({
              status: 'completed',
              executed_at: new Date().toISOString()
            })
            .eq('id', action.id)
          
          await supabase
            .from('automation_logs')
            .insert({
              automation_rule_id: rule.id,
              automation_action_id: action.id,
              contact_id: contact.id,
              event_type: 'action_executed',
              status: 'success',
              message: 'Automation stopped at stop step'
            })
          processed++
          continue
        }

        if (!stepSuccess) {
          throw new Error(`Failed to execute step: ${currentStep.type}`)
        }

        // Check if there's a next step
        const nextStepIndex = stepIndex + 1
        const nextStep = steps[nextStepIndex]

        if (nextStep) {
          // Calculate delay for next step
          let delayDays = 0
          if (nextStep.type === 'wait') {
            delayDays = nextStep.delay_days || 0
          }

          // Schedule next step
          const executeAt = new Date()
          executeAt.setDate(executeAt.getDate() + delayDays)

          await supabase
            .from('automation_actions')
            .insert({
              automation_rule_id: rule.id,
              contact_id: contact.id,
              status: 'pending',
              execute_at: executeAt.toISOString(),
              step_index: nextStepIndex,
            })

          // Mark current action as completed
          await supabase
            .from('automation_actions')
            .update({
              status: 'completed',
              executed_at: new Date().toISOString()
            })
            .eq('id', action.id)
        } else {
          // All steps completed
          await supabase
            .from('automation_actions')
            .update({
              status: 'completed',
              executed_at: new Date().toISOString()
            })
            .eq('id', action.id)
        }

        // Update rule statistics
        await supabase
          .from('automation_rules')
          .update({
            success_count: (rule.success_count || 0) + 1,
            last_triggered_at: new Date().toISOString()
          })
          .eq('id', rule.id)

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
          })

        processed++
      } catch (error: any) {
        console.error(`Error processing action ${action.id}:`, error)
        
        await supabase
          .from('automation_actions')
          .update({
            status: 'failed',
            executed_at: new Date().toISOString(),
            error_message: error.message
          })
          .eq('id', action.id)

        await supabase
          .from('automation_logs')
          .insert({
            automation_rule_id: action.automation_rule_id,
            automation_action_id: action.id,
            contact_id: action.contact_id,
            event_type: 'action_failed',
            status: 'failure',
            message: error.message
          })

        failed++
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Processed automation actions',
        processed,
        failed,
        total: actions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error in process-automations:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

