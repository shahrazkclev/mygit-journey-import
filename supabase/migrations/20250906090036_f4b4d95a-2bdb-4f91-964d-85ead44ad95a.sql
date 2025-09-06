-- Ensure robust restore behavior and data integrity for unsubscribes/contacts
-- 1) Update check_unsubscribe_on_contact_insert to merge tags and clean unsubscribe records
-- 2) Create trigger on contacts BEFORE INSERT to call it
-- 3) Update handle_restore_contact to handle cases without unsubscribed_contacts record
-- 4) Create trigger on unsubscribes BEFORE INSERT to auto-populate user_id

-- 1) Replace function: check_unsubscribe_on_contact_insert
CREATE OR REPLACE FUNCTION public.check_unsubscribe_on_contact_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  unsubscribed_record RECORD;
BEGIN
  -- Merge tags from unsubscribed_contacts if exists
  SELECT * INTO unsubscribed_record
  FROM public.unsubscribed_contacts
  WHERE email = NEW.email AND user_id = NEW.user_id
  LIMIT 1;

  IF unsubscribed_record IS NOT NULL THEN
    -- Merge tags (preserve both old and new)
    IF unsubscribed_record.tags IS NOT NULL THEN
      IF NEW.tags IS NULL THEN
        NEW.tags := unsubscribed_record.tags;
      ELSE
        NEW.tags := ARRAY(
          SELECT DISTINCT trim(t)
          FROM unnest(NEW.tags || unsubscribed_record.tags) AS t
        );
      END IF;
    END IF;

    -- Remove from unsubscribed_contacts once restored/added
    DELETE FROM public.unsubscribed_contacts WHERE id = unsubscribed_record.id;
  END IF;

  -- Always remove from unsubscribes (they're re-engaging)
  DELETE FROM public.unsubscribes WHERE email = NEW.email AND user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

-- 2) Create trigger on contacts BEFORE INSERT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_unsubscribe_on_contact_insert'
  ) THEN
    DROP TRIGGER trg_check_unsubscribe_on_contact_insert ON public.contacts;
  END IF;
END$$;

CREATE TRIGGER trg_check_unsubscribe_on_contact_insert
BEFORE INSERT ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.check_unsubscribe_on_contact_insert();

-- 3) Replace function: handle_restore_contact to cover missing unsubscribed_contacts cases
CREATE OR REPLACE FUNCTION public.handle_restore_contact(p_email text, p_user_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000'::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  unsubscribed_record RECORD;
BEGIN
  -- Try to get the unsubscribed contact record (with tags)
  SELECT * INTO unsubscribed_record 
  FROM public.unsubscribed_contacts 
  WHERE email = p_email AND user_id = p_user_id
  LIMIT 1;
  
  IF unsubscribed_record IS NOT NULL THEN
    -- Restore to contacts with tag union behavior on conflict
    INSERT INTO public.contacts (
      user_id, email, first_name, last_name, tags, status
    ) VALUES (
      unsubscribed_record.user_id,
      unsubscribed_record.email,
      unsubscribed_record.first_name,
      unsubscribed_record.last_name,
      unsubscribed_record.tags,
      'subscribed'
    ) ON CONFLICT (user_id, email) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      tags = CASE 
        WHEN contacts.tags IS NULL THEN EXCLUDED.tags
        WHEN EXCLUDED.tags IS NULL THEN contacts.tags
        ELSE ARRAY(SELECT DISTINCT unnest(contacts.tags || EXCLUDED.tags))
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
$$;

-- 4) Add trigger to auto-populate user_id on unsubscribes insert
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_populate_user_id_for_unsubscribe'
  ) THEN
    DROP TRIGGER trg_auto_populate_user_id_for_unsubscribe ON public.unsubscribes;
  END IF;
END$$;

CREATE TRIGGER trg_auto_populate_user_id_for_unsubscribe
BEFORE INSERT ON public.unsubscribes
FOR EACH ROW
EXECUTE FUNCTION public.auto_populate_user_id_for_unsubscribe();
