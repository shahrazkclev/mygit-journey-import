-- Fix campaign settings to prevent stopping after 30 emails
-- Update existing user settings with better defaults

-- Update existing user settings with better defaults
UPDATE public.user_settings 
SET 
  batch_size = 50,
  delay_between_batches = 1,
  delay_between_emails = 1
WHERE 
  batch_size < 50 OR 
  delay_between_batches > 1 OR 
  delay_between_emails > 1;

-- Insert default settings for users who don't have any settings yet
INSERT INTO public.user_settings (user_id, batch_size, delay_between_batches, delay_between_emails, enable_retries, max_retries)
SELECT 
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  50,
  1,
  1,
  true,
  3
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_settings 
  WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
);

-- Add comment explaining the changes
COMMENT ON COLUMN public.user_settings.batch_size IS 'Number of emails to process in each batch (increased from 10 to 50 for better throughput)';
COMMENT ON COLUMN public.user_settings.delay_between_batches IS 'Delay between batches in minutes (reduced from 5 to 1 to prevent long pauses)';
COMMENT ON COLUMN public.user_settings.delay_between_emails IS 'Delay between individual emails in seconds (reduced from 2 to 1 for faster sending)';
