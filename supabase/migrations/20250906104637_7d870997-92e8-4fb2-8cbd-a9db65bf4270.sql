-- Add password protection to tag rules
ALTER TABLE public.tag_rules 
ADD COLUMN IF NOT EXISTS protected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS password TEXT;