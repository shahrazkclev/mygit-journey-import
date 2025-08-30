-- Create function to apply tag rules automatically
CREATE OR REPLACE FUNCTION public.apply_tag_rules_trigger()
RETURNS TRIGGER AS $$
DECLARE
  rule_record RECORD;
  updated_tags text[];
  has_changes boolean := false;
  trigger_matched boolean := false;
BEGIN
  -- Only process if tags actually changed
  IF OLD.tags IS NOT DISTINCT FROM NEW.tags THEN
    RETURN NEW;
  END IF;

  updated_tags := NEW.tags;
  
  -- Loop through all enabled tag rules for this user
  FOR rule_record IN 
    SELECT * FROM public.tag_rules 
    WHERE user_id = NEW.user_id AND enabled = true
  LOOP
    trigger_matched := false;
    
    -- Check if any current tag matches the trigger (case insensitive)
    IF updated_tags IS NOT NULL THEN
      FOR i IN 1..array_length(updated_tags, 1) LOOP
        IF lower(trim(updated_tags[i])) = lower(trim(rule_record.trigger_tag)) THEN
          trigger_matched := true;
          EXIT;
        END IF;
      END LOOP;
    END IF;
    
    IF trigger_matched THEN
      -- Add tags if specified
      IF rule_record.add_tags IS NOT NULL THEN
        FOR i IN 1..array_length(rule_record.add_tags, 1) LOOP
          IF NOT (trim(rule_record.add_tags[i]) = ANY(updated_tags)) THEN
            updated_tags := array_append(updated_tags, trim(rule_record.add_tags[i]));
            has_changes := true;
          END IF;
        END LOOP;
      END IF;
      
      -- Remove tags if specified
      IF rule_record.remove_tags IS NOT NULL THEN
        FOR i IN 1..array_length(rule_record.remove_tags, 1) LOOP
          updated_tags := array_remove(updated_tags, trim(rule_record.remove_tags[i]));
          has_changes := true;
        END LOOP;
      END IF;
    END IF;
  END LOOP;
  
  -- Update tags if changes were made
  IF has_changes THEN
    NEW.tags := updated_tags;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to apply tag rules on contact updates
DROP TRIGGER IF EXISTS trigger_apply_tag_rules ON public.contacts;
CREATE TRIGGER trigger_apply_tag_rules
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_tag_rules_trigger();