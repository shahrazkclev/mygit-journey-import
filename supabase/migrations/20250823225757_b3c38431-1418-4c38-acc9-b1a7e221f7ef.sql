-- Add delay between individual emails setting to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS delay_between_emails INTEGER DEFAULT 2;