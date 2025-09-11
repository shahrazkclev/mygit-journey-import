CREATE OR REPLACE FUNCTION public.handle_restore_contact(p_email text, p_user_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000'::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  unsubscribed_record RECORD;
BEGIN
  -- Fetch matching unsubscribed record (case-insensitive)
  SELECT * INTO unsubscribed_record
  FROM public.unsubscribed_contacts
  WHERE user_id = p_user_id AND lower(email) = lower(p_email)
  LIMIT 1;

  IF unsubscribed_record IS NOT NULL THEN
    -- Remove any existing contact row for this email to ensure original ID is restored
    DELETE FROM public.contacts 
    WHERE user_id = p_user_id AND lower(email) = lower(unsubscribed_record.email);

    -- Insert using ORIGINAL contact id and preserved fields
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
    )
    ON CONFLICT (user_id, email) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      tags = EXCLUDED.tags,
      status = 'subscribed';

    -- Cleanup unsubscribed tables
    DELETE FROM public.unsubscribed_contacts WHERE id = unsubscribed_record.id;
    DELETE FROM public.unsubscribes WHERE user_id = p_user_id AND lower(email) = lower(unsubscribed_record.email);
  ELSE
    -- Fallback: ensure a contact exists and is marked subscribed
    DELETE FROM public.unsubscribed_contacts WHERE user_id = p_user_id AND lower(email) = lower(p_email);
    INSERT INTO public.contacts (user_id, email, status)
    VALUES (p_user_id, p_email, 'subscribed')
    ON CONFLICT (user_id, email) DO UPDATE SET status = 'subscribed';
    DELETE FROM public.unsubscribes WHERE user_id = p_user_id AND lower(email) = lower(p_email);
  END IF;
END;
$function$;