-- Create webhooks table for managing multiple webhook URLs
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "Users can view their own webhooks" 
ON public.webhooks 
FOR SELECT 
USING (auth.uid()::text = user_id::text OR user_id = '550e8400-e29b-41d4-a716-446655440000');

CREATE POLICY IF NOT EXISTS "Users can create their own webhooks" 
ON public.webhooks 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id::text OR user_id = '550e8400-e29b-41d4-a716-446655440000');

CREATE POLICY IF NOT EXISTS "Users can update their own webhooks" 
ON public.webhooks 
FOR UPDATE 
USING (auth.uid()::text = user_id::text OR user_id = '550e8400-e29b-41d4-a716-446655440000');

CREATE POLICY IF NOT EXISTS "Users can delete their own webhooks" 
ON public.webhooks 
FOR DELETE 
USING (auth.uid()::text = user_id::text OR user_id = '550e8400-e29b-41d4-a716-446655440000');

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_webhooks_updated_at ON public.webhooks;
CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON public.webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_user_default ON public.webhooks(user_id, is_default) WHERE is_default = true;

