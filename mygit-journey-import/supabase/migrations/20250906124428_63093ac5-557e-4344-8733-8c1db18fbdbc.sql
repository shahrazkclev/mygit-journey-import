-- Make handle_unsubscribe case-insensitive for email matching and robust deletions
CREATE OR REPLACE FUNCTION public.handle_unsubscribe(p_email text DEFAULT NULL::text, p_user_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000'::uuid, p_reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  contact_record RECORD;
BEGIN
  -- If email is provided, use it to find the contact (case-insensitive)
  IF p_email IS NOT NULL THEN
    SELECT * INTO contact_record 
    FROM public.contacts 
    WHERE lower(email) = lower(p_email) AND user_id = p_user_id
    LIMIT 1;
  ELSE
    contact_record := NULL;
  END IF;
  
  IF contact_record IS NOT NULL THEN
    -- Store the contact in unsubscribed_contacts preserving tags and names
    INSERT INTO public.unsubscribed_contacts (
      user_id, email, first_name, last_name, tags, original_contact_id, unsubscribed_at
    ) VALUES (
      contact_record.user_id,
      contact_record.email,
      contact_record.first_name,
      contact_record.last_name,
      contact_record.tags,
      contact_record.id,
      now()
    ) ON CONFLICT (user_id, email) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      tags = EXCLUDED.tags,
      unsubscribed_at = EXCLUDED.unsubscribed_at;
    
    -- Add to unsubscribes table FIRST
    INSERT INTO public.unsubscribes (user_id, email, reason, unsubscribed_at)
    VALUES (p_user_id, contact_record.email, p_reason, now())
    ON CONFLICT (user_id, email) DO UPDATE SET
      reason = EXCLUDED.reason,
      unsubscribed_at = EXCLUDED.unsubscribed_at;
    
    -- THEN Remove from contacts table (case-insensitive match)
    DELETE FROM public.contacts WHERE user_id = p_user_id AND lower(email) = lower(contact_record.email);
    
  ELSE
    -- No specific contact found, but still mark user_id as unsubscribed
    INSERT INTO public.unsubscribes (user_id, email, reason, unsubscribed_at)
    VALUES (p_user_id, p_email, p_reason, now())
    ON CONFLICT (user_id, email) DO UPDATE SET
      reason = EXCLUDED.reason,
      unsubscribed_at = EXCLUDED.unsubscribed_at;
      
    -- Also remove all contacts for this user_id if no email specified
    IF p_email IS NULL THEN
      INSERT INTO public.unsubscribed_contacts (
        user_id, email, first_name, last_name, tags, original_contact_id, unsubscribed_at
      )
      SELECT 
        user_id, email, first_name, last_name, tags, id, now()
      FROM public.contacts 
      WHERE user_id = p_user_id
      ON CONFLICT (user_id, email) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        tags = EXCLUDED.tags,
        unsubscribed_at = EXCLUDED.unsubscribed_at;
      
      DELETE FROM public.contacts WHERE user_id = p_user_id;
    END IF;
  END IF;
END;
$function$;

-- Also make handle_restore_contact remove from unsubscribes with case-insensitive email
CREATE OR REPLACE FUNCTION public.handle_restore_contact(p_email text, p_user_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000'::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  unsubscribed_record RECORD;
  existing_contact_id uuid;
BEGIN
  SELECT * INTO unsubscribed_record 
  FROM public.unsubscribed_contacts 
  WHERE user_id = p_user_id AND lower(email) = lower(p_email)
  LIMIT 1;

  IF unsubscribed_record IS NOT NULL THEN
    SELECT id INTO existing_contact_id
    FROM public.contacts
    WHERE user_id = p_user_id AND lower(email) = lower(p_email)
    LIMIT 1;

    IF existing_contact_id IS NOT NULL 
       AND unsubscribed_record.original_contact_id IS NOT NULL 
       AND existing_contact_id <> unsubscribed_record.original_contact_id THEN
      DELETE FROM public.contacts WHERE id = existing_contact_id;
    END IF;

    INSERT INTO public.contacts (
      id, user_id, email, first_name, last_name, tags, status
    ) VALUES (
      COALESCE(unsubscribed_record.original_contact_id, gen_random_uuid()),
      unsubscribed_record.user_id,
      unsubscribed_record.email,
      unsubscribed_record.first_name,
      unsubscribed_record.last_name,
      unsubscribed_record.tags,
      'subscribed'
    ) ON CONFLICT (user_id, email) DO UPDATE SET
      first_name = COALESCE(EXCLUDED.first_name, contacts.first_name),
      last_name = COALESCE(EXCLUDED.last_name, contacts.last_name),
      tags = CASE 
        WHEN EXCLUDED.tags IS NOT NULL AND array_length(EXCLUDED.tags, 1) > 0 THEN 
          CASE 
            WHEN contacts.tags IS NULL THEN EXCLUDED.tags
            ELSE ARRAY(SELECT DISTINCT unnest(contacts.tags || EXCLUDED.tags))
          END
        ELSE contacts.tags
      END,
      status = 'subscribed';

    DELETE FROM public.unsubscribed_contacts WHERE id = unsubscribed_record.id;
  ELSE
    INSERT INTO public.contacts (user_id, email, status)
    VALUES (p_user_id, p_email, 'subscribed')
    ON CONFLICT (user_id, email) DO UPDATE SET
      status = 'subscribed';
  END IF;

  DELETE FROM public.unsubscribes WHERE user_id = p_user_id AND lower(email) = lower(p_email);
END;
$function$;