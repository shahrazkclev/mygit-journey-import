-- Enable reliable realtime for campaigns and campaign_sends
-- Use REPLICA IDENTITY FULL so updates include previous values
ALTER TABLE public.campaigns REPLICA IDENTITY FULL;
ALTER TABLE public.campaign_sends REPLICA IDENTITY FULL;

-- Ensure both tables are added to the supabase_realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'campaigns'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'campaign_sends'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_sends;
  END IF;
END $$;