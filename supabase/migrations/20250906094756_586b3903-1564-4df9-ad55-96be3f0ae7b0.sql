-- Fix handle_restore_contact function to properly restore tags
CREATE OR REPLACE FUNCTION public.handle_restore_contact(p_email text, p_user_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000'::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  unsubscribed_record RECORD;
BEGIN
  -- Try to get the unsubscribed contact record (with tags)
  SELECT * INTO unsubscribed_record 
  FROM public.unsubscribed_contacts 
  WHERE email = p_email AND user_id = p_user_id
  LIMIT 1;
  
  IF unsubscribed_record IS NOT NULL THEN
    -- Restore to contacts with all data including tags
    INSERT INTO public.contacts (
      user_id, email, first_name, last_name, tags, status
    ) VALUES (
      unsubscribed_record.user_id,
      unsubscribed_record.email,
      unsubscribed_record.first_name,
      unsubscribed_record.last_name,
      unsubscribed_record.tags,  -- This was missing proper restoration
      'subscribed'
    ) ON CONFLICT (user_id, email) DO UPDATE SET
      first_name = CASE 
        WHEN EXCLUDED.first_name IS NOT NULL THEN EXCLUDED.first_name 
        ELSE contacts.first_name 
      END,
      last_name = CASE 
        WHEN EXCLUDED.last_name IS NOT NULL THEN EXCLUDED.last_name 
        ELSE contacts.last_name 
      END,
      tags = CASE 
        WHEN EXCLUDED.tags IS NOT NULL AND array_length(EXCLUDED.tags, 1) > 0 THEN 
          CASE 
            WHEN contacts.tags IS NULL THEN EXCLUDED.tags
            ELSE ARRAY(SELECT DISTINCT unnest(contacts.tags || EXCLUDED.tags))
          END
        ELSE contacts.tags
      END,
      status = 'subscribed';

    -- Remove from unsubscribed_contacts table
    DELETE FROM public.unsubscribed_contacts WHERE id = unsubscribed_record.id;
  ELSE
    -- No unsubscribed contact record found; still ensure contact exists and is subscribed
    INSERT INTO public.contacts (user_id, email, status)
    VALUES (p_user_id, p_email, 'subscribed')
    ON CONFLICT (user_id, email) DO UPDATE SET
      status = 'subscribed';
  END IF;
  
  -- Remove from unsubscribes table regardless
  DELETE FROM public.unsubscribes WHERE email = p_email AND user_id = p_user_id;
END;
$function$;