-- Create campaigns table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT '550e8400-e29b-41d4-a716-446655440000',
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  list_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  sender_sequence_number INTEGER NOT NULL DEFAULT 1,
  webhook_url TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'paused', 'failed', 'partial')),
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  current_sender_sequence INTEGER NOT NULL DEFAULT 1,
  current_recipient TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Create campaign_sends table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.campaign_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, contact_email)
);

-- Enable RLS on campaigns table
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for campaigns
CREATE POLICY IF NOT EXISTS "Users can view their own campaigns" 
ON public.campaigns 
FOR SELECT 
USING (user_id = '550e8400-e29b-41d4-a716-446655440000');

CREATE POLICY IF NOT EXISTS "Users can create their own campaigns" 
ON public.campaigns 
FOR INSERT 
WITH CHECK (user_id = '550e8400-e29b-41d4-a716-446655440000');

CREATE POLICY IF NOT EXISTS "Users can update their own campaigns" 
ON public.campaigns 
FOR UPDATE 
USING (user_id = '550e8400-e29b-41d4-a716-446655440000');

CREATE POLICY IF NOT EXISTS "Users can delete their own campaigns" 
ON public.campaigns 
FOR DELETE 
USING (user_id = '550e8400-e29b-41d4-a716-446655440000');

-- Enable RLS on campaign_sends table
ALTER TABLE public.campaign_sends ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for campaign_sends (access through campaigns)
CREATE POLICY IF NOT EXISTS "Users can view campaign sends for their campaigns" 
ON public.campaign_sends 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.campaigns 
  WHERE campaigns.id = campaign_sends.campaign_id 
  AND campaigns.user_id = '550e8400-e29b-41d4-a716-446655440000'
));

CREATE POLICY IF NOT EXISTS "Users can create campaign sends for their campaigns" 
ON public.campaign_sends 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.campaigns 
  WHERE campaigns.id = campaign_sends.campaign_id 
  AND campaigns.user_id = '550e8400-e29b-41d4-a716-446655440000'
));

CREATE POLICY IF NOT EXISTS "Users can update campaign sends for their campaigns" 
ON public.campaign_sends 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.campaigns 
  WHERE campaigns.id = campaign_sends.campaign_id 
  AND campaigns.user_id = '550e8400-e29b-41d4-a716-446655440000'
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for campaigns table
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON public.campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign_id ON public.campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_status ON public.campaign_sends(status);