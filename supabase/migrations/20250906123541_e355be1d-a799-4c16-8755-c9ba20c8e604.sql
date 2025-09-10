-- 1) Enforce unique email per user in contacts and unsubscribed_contacts
create unique index if not exists ux_contacts_user_email on public.contacts (user_id, email);
create unique index if not exists ux_unsubscribed_contacts_user_email on public.unsubscribed_contacts (user_id, email);

-- 2) Preserve original contact id on restore and avoid duplicate ids
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
  -- Fetch unsubscribed record (original data)
  SELECT * INTO unsubscribed_record 
  FROM public.unsubscribed_contacts 
  WHERE email = p_email AND user_id = p_user_id
  LIMIT 1;

  IF unsubscribed_record IS NOT NULL THEN
    -- If a contact already exists with this email but a different id, replace it to keep the original id
    SELECT id INTO existing_contact_id
    FROM public.contacts
    WHERE user_id = p_user_id AND email = p_email
    LIMIT 1;

    IF existing_contact_id IS NOT NULL 
       AND unsubscribed_record.original_contact_id IS NOT NULL 
       AND existing_contact_id <> unsubscribed_record.original_contact_id THEN
      DELETE FROM public.contacts WHERE id = existing_contact_id;
    END IF;

    -- Restore to contacts with the ORIGINAL id when available
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

    -- Remove from unsubscribed_contacts
    DELETE FROM public.unsubscribed_contacts WHERE id = unsubscribed_record.id;
  ELSE
    -- No unsubscribed record; ensure contact exists and is subscribed
    INSERT INTO public.contacts (user_id, email, status)
    VALUES (p_user_id, p_email, 'subscribed')
    ON CONFLICT (user_id, email) DO UPDATE SET
      status = 'subscribed';
  END IF;

  -- Always remove from unsubscribes
  DELETE FROM public.unsubscribes WHERE email = p_email AND user_id = p_user_id;
END;
$function$;