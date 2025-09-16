-- Create user_settings table for storing campaign settings
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  webhook_url TEXT,
  sending_speed INTEGER DEFAULT 50,
  batch_size INTEGER DEFAULT 50,
  delay_between_batches INTEGER DEFAULT 1,
  delay_between_emails INTEGER DEFAULT 1,
  enable_retries BOOLEAN DEFAULT true,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for demo user access
CREATE POLICY "Allow demo user access to settings" 
ON public.user_settings 
FOR ALL 
USING (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid)
WITH CHECK (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();