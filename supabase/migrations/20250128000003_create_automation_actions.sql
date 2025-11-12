-- Create automation_actions table for scheduling delayed actions
CREATE TABLE IF NOT EXISTS public.automation_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'completed', 'skipped', 'failed')),
  execute_at TIMESTAMP WITH TIME ZONE NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(automation_rule_id, contact_id, execute_at)
);

-- Enable RLS
ALTER TABLE public.automation_actions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (access through automation_rules)
CREATE POLICY IF NOT EXISTS "Users can view automation actions for their rules" 
ON public.automation_actions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.automation_rules 
  WHERE automation_rules.id = automation_actions.automation_rule_id 
  AND (auth.uid()::text = automation_rules.user_id::text OR automation_rules.user_id = '550e8400-e29b-41d4-a716-446655440000')
));

CREATE POLICY IF NOT EXISTS "Users can create automation actions for their rules" 
ON public.automation_actions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.automation_rules 
  WHERE automation_rules.id = automation_actions.automation_rule_id 
  AND (auth.uid()::text = automation_rules.user_id::text OR automation_rules.user_id = '550e8400-e29b-41d4-a716-446655440000')
));

CREATE POLICY IF NOT EXISTS "Users can update automation actions for their rules" 
ON public.automation_actions 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.automation_rules 
  WHERE automation_rules.id = automation_actions.automation_rule_id 
  AND (auth.uid()::text = automation_rules.user_id::text OR automation_rules.user_id = '550e8400-e29b-41d4-a716-446655440000')
));

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_automation_actions_updated_at ON public.automation_actions;
CREATE TRIGGER update_automation_actions_updated_at
  BEFORE UPDATE ON public.automation_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_automation_actions_execute_at ON public.automation_actions(execute_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_automation_actions_rule_id ON public.automation_actions(automation_rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_actions_contact_id ON public.automation_actions(contact_id);
CREATE INDEX IF NOT EXISTS idx_automation_actions_status ON public.automation_actions(status);

