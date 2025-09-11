-- Add missing INSERT and UPDATE policies for campaign_sends table
DROP POLICY IF EXISTS "Users can insert sends for their campaigns" ON public.campaign_sends;
DROP POLICY IF EXISTS "Users can update sends for their campaigns" ON public.campaign_sends;

CREATE POLICY "Users can insert sends for their campaigns" 
ON public.campaign_sends 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.campaigns 
  WHERE campaigns.id = campaign_sends.campaign_id 
  AND campaigns.user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
));

CREATE POLICY "Users can update sends for their campaigns" 
ON public.campaign_sends 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.campaigns 
  WHERE campaigns.id = campaign_sends.campaign_id 
  AND campaigns.user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
));

-- Ensure the campaigns table status check constraint includes all needed values
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_status_check 
CHECK (status IN ('draft', 'queued', 'sending', 'sent', 'paused', 'failed', 'partial', 'completed'));