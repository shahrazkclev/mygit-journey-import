-- Create automation_logs table for tracking execution history
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  automation_action_id UUID REFERENCES public.automation_actions(id) ON DELETE SET NULL,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('triggered', 'condition_checked', 'action_executed', 'action_failed', 'action_skipped')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'skipped')),
  message TEXT,
  metadata JSONB, -- Additional context about the event
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (access through automation_rules)
CREATE POLICY IF NOT EXISTS "Users can view automation logs for their rules" 
ON public.automation_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.automation_rules 
  WHERE automation_rules.id = automation_logs.automation_rule_id 
  AND (auth.uid()::text = automation_rules.user_id::text OR automation_rules.user_id = '550e8400-e29b-41d4-a716-446655440000')
));

CREATE POLICY IF NOT EXISTS "System can create automation logs" 
ON public.automation_logs 
FOR INSERT 
WITH CHECK (true); -- Allow system/service role to insert logs

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_automation_logs_rule_id ON public.automation_logs(automation_rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_contact_id ON public.automation_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON public.automation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_event_type ON public.automation_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_automation_logs_status ON public.automation_logs(status);

