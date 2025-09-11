-- Create trigger to apply tag rules to unsubscribed_contacts when they are inserted or updated
CREATE OR REPLACE FUNCTION public.apply_tag_rules_to_unsubscribed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Apply tag rules to unsubscribed contact tags
  IF TG_OP = 'UPDATE' AND OLD.tags IS NOT DISTINCT FROM NEW.tags THEN
    RETURN NEW; -- No tag changes, skip processing
  END IF;

  NEW.tags := public.apply_tag_rules_pure(NEW.user_id, NEW.tags);
  RETURN NEW;
END;
$function$;

-- Create trigger on unsubscribed_contacts table
DROP TRIGGER IF EXISTS apply_tag_rules_unsubscribed_trigger ON public.unsubscribed_contacts;
CREATE TRIGGER apply_tag_rules_unsubscribed_trigger
BEFORE INSERT OR UPDATE ON public.unsubscribed_contacts
FOR EACH ROW
EXECUTE FUNCTION public.apply_tag_rules_to_unsubscribed();

-- Create function to reapply tag rules to all unsubscribed contacts for a user
CREATE OR REPLACE FUNCTION public.reapply_tag_rules_to_unsubscribed_contacts(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Recompute tags for all unsubscribed contacts of this user
  UPDATE public.unsubscribed_contacts uc
  SET tags = public.apply_tag_rules_pure(uc.user_id, uc.tags)
  WHERE uc.user_id = p_user_id;
END;
$function$;

-- Update the existing tag rule change trigger to also update unsubscribed contacts
CREATE OR REPLACE FUNCTION public.on_tag_rule_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_user uuid;
BEGIN
  target_user := COALESCE(NEW.user_id, OLD.user_id);
  IF target_user IS NOT NULL THEN
    -- Update both regular contacts and unsubscribed contacts
    PERFORM public.reapply_tag_rules_for_user(target_user);
    PERFORM public.reapply_tag_rules_to_unsubscribed_contacts(target_user);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;