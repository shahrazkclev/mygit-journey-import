-- Process unsubscribes automatically: move contact to unsubscribed_contacts and remove from contacts
-- 1) Create AFTER INSERT trigger on unsubscribes to process contact removal

CREATE OR REPLACE FUNCTION public.process_unsubscribe_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contact_record RECORD;
BEGIN
  -- Find matching contact
  SELECT * INTO contact_record
  FROM public.contacts
  WHERE email = NEW.email AND user_id = COALESCE(NEW.user_id, '550e8400-e29b-41d4-a716-446655440000'::uuid)
  LIMIT 1;

  IF contact_record IS NOT NULL THEN
    -- Upsert into unsubscribed_contacts preserving tags and names
    INSERT INTO public.unsubscribed_contacts (
      user_id, email, first_name, last_name, tags, original_contact_id, unsubscribed_at
    ) VALUES (
      contact_record.user_id,
      contact_record.email,
      contact_record.first_name,
      contact_record.last_name,
      contact_record.tags,
      contact_record.id,
      COALESCE(NEW.unsubscribed_at, now())
    ) ON CONFLICT (user_id, email) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      tags = EXCLUDED.tags,
      unsubscribed_at = EXCLUDED.unsubscribed_at;

    -- Remove contact from contacts table
    DELETE FROM public.contacts WHERE id = contact_record.id;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_process_unsubscribe_after_insert') THEN
    DROP TRIGGER trg_process_unsubscribe_after_insert ON public.unsubscribes;
  END IF;
END$$;

CREATE TRIGGER trg_process_unsubscribe_after_insert
AFTER INSERT ON public.unsubscribes
FOR EACH ROW
EXECUTE FUNCTION public.process_unsubscribe_after_insert();