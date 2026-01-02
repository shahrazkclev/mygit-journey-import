-- Add steps column to automation_rules for multi-step automation support
ALTER TABLE public.automation_rules 
ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the steps structure
COMMENT ON COLUMN public.automation_rules.steps IS 'Array of automation steps: [{ type: "wait"|"add_tag"|"remove_tag"|"send_email"|"stop", delay_days?: number, tag?: string, template_id?: string, webhook_url?: string, subject?: string, html_content?: string, stop_automation?: boolean }]';

