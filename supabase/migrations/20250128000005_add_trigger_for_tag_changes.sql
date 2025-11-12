-- Create function to notify automation system when tags change
-- This will be called by a trigger when contacts.tags is updated
CREATE OR REPLACE FUNCTION public.notify_tag_change()
RETURNS TRIGGER AS $$
DECLARE
  added_tags TEXT[];
  removed_tags TEXT[];
  tag TEXT;
BEGIN
  -- Detect added tags
  IF NEW.tags IS NOT NULL AND OLD.tags IS NOT NULL THEN
    -- Find tags that are in NEW but not in OLD
    SELECT ARRAY_AGG(tag)
    INTO added_tags
    FROM unnest(NEW.tags) AS tag
    WHERE tag NOT IN (SELECT unnest(OLD.tags));
    
    -- Find tags that are in OLD but not in NEW
    SELECT ARRAY_AGG(tag)
    INTO removed_tags
    FROM unnest(OLD.tags) AS tag
    WHERE tag NOT IN (SELECT unnest(NEW.tags));
  ELSIF NEW.tags IS NOT NULL AND OLD.tags IS NULL THEN
    -- All new tags are added
    added_tags := NEW.tags;
  ELSIF NEW.tags IS NULL AND OLD.tags IS NOT NULL THEN
    -- All old tags are removed
    removed_tags := OLD.tags;
  END IF;
  
  -- For each added tag, check if any automation rules are triggered
  IF added_tags IS NOT NULL AND array_length(added_tags, 1) > 0 THEN
    -- This will be handled by the Cloudflare Worker via polling or webhook
    -- We could also use pg_notify here if we set up a listener
    PERFORM 1; -- Placeholder for future webhook call
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on contacts table for tag changes
DROP TRIGGER IF EXISTS trigger_notify_tag_change ON public.contacts;
CREATE TRIGGER trigger_notify_tag_change
  AFTER UPDATE OF tags ON public.contacts
  FOR EACH ROW
  WHEN (OLD.tags IS DISTINCT FROM NEW.tags)
  EXECUTE FUNCTION public.notify_tag_change();

-- Note: The actual automation triggering will be handled by:
-- 1. Cloudflare Worker polling for tag changes, OR
-- 2. Frontend calling worker API when tags are updated, OR
-- 3. Supabase webhook calling Cloudflare Worker (requires webhook setup)

