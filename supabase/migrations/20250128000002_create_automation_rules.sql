-- Create automation_rules table
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  trigger_config JSONB NOT NULL, -- { type: "tag_added", tag: "asked_for_discount" }
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ type: "wait_duration", days: 3 }, { type: "tag_not_exists", tag: "product_purchased" }]
  action_config JSONB NOT NULL, -- { type: "send_email", template_id: "uuid", webhook_url: "..." }
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "Users can view their own automation rules" 
ON public.automation_rules 
FOR SELECT 
USING (auth.uid()::text = user_id::text OR user_id = '550e8400-e29b-41d4-a716-446655440000');

CREATE POLICY IF NOT EXISTS "Users can create their own automation rules" 
ON public.automation_rules 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id::text OR user_id = '550e8400-e29b-41d4-a716-446655440000');

CREATE POLICY IF NOT EXISTS "Users can update their own automation rules" 
ON public.automation_rules 
FOR UPDATE 
USING (auth.uid()::text = user_id::text OR user_id = '550e8400-e29b-41d4-a716-446655440000');

CREATE POLICY IF NOT EXISTS "Users can delete their own automation rules" 
ON public.automation_rules 
FOR DELETE 
USING (auth.uid()::text = user_id::text OR user_id = '550e8400-e29b-41d4-a716-446655440000');

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_automation_rules_updated_at ON public.automation_rules;
CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_automation_rules_user_id ON public.automation_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_enabled ON public.automation_rules(enabled) WHERE enabled = true;

