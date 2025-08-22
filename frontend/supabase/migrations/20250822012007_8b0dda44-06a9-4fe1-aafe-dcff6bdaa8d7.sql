-- Update campaigns table to add missing columns
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS sender_sequence_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- Update the status check constraint to include new statuses
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_status_check 
CHECK (status IN ('draft', 'sending', 'sent', 'paused', 'failed'));

-- Create campaign_sends table for tracking individual sends
CREATE TABLE IF NOT EXISTS public.campaign_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on campaign_sends if not already enabled
ALTER TABLE public.campaign_sends ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view sends for their campaigns" ON public.campaign_sends;

-- Create policies for campaign_sends
CREATE POLICY "Users can view sends for their campaigns" 
ON public.campaign_sends 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = campaign_sends.campaign_id 
    AND campaigns.user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
  )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign_id ON public.campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_status ON public.campaign_sends(status);