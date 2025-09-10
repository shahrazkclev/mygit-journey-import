-- Add replace_all_tags option to tag_rules table
ALTER TABLE public.tag_rules 
ADD COLUMN IF NOT EXISTS replace_all_tags boolean DEFAULT false;