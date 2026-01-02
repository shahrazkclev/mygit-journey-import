-- Add step_index column to automation_actions for multi-step automation support
ALTER TABLE public.automation_actions 
ADD COLUMN IF NOT EXISTS step_index INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN public.automation_actions.step_index IS 'Index of the step being executed in the automation rule steps array';

-- Update unique constraint to include step_index (allows multiple actions for same rule/contact at different steps)
DROP INDEX IF EXISTS automation_actions_automation_rule_id_contact_id_execute_at_key;
CREATE UNIQUE INDEX IF NOT EXISTS automation_actions_rule_contact_step_execute_unique 
ON public.automation_actions(automation_rule_id, contact_id, step_index, execute_at);

