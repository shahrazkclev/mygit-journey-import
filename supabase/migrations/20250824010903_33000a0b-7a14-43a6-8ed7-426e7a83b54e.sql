-- Add ai_instructions column to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN ai_instructions TEXT;