-- Fix data migration for existing trigger tags
UPDATE public.tag_rules 
SET trigger_tags = ARRAY[trigger_tag] 
WHERE trigger_tag IS NOT NULL 
  AND trigger_tag != '' 
  AND (trigger_tags IS NULL OR array_length(trigger_tags, 1) IS NULL);