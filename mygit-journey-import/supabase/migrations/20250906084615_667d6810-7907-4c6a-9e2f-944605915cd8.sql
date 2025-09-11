-- First, let's create a backup table to store tags for unsubscribed contacts
CREATE TABLE IF NOT EXISTS public.unsubscribed_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  tags TEXT[],
  original_contact_id UUID,
  unsubscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, email)
);

-- Enable RLS
ALTER TABLE public.unsubscribed_contacts ENABLE ROW LEVEL SECURITY;

-- Create policy for demo user
CREATE POLICY "Allow demo user access to unsubscribed contacts" 
ON public.unsubscribed_contacts 
FOR ALL 
USING (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid)
WITH CHECK (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid);

-- Create function to handle unsubscribe process
CREATE OR REPLACE FUNCTION public.handle_unsubscribe(p_email text, p_user_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000'::uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  contact_record RECORD;
BEGIN
  -- Get the contact record first
  SELECT * INTO contact_record 
  FROM public.contacts 
  WHERE email = p_email AND user_id = p_user_id;
  
  IF contact_record IS NOT NULL THEN
    -- Store the contact in unsubscribed_contacts table
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
    
    -- Remove from contacts table
    DELETE FROM public.contacts WHERE id = contact_record.id;
  END IF;
  
  -- Add to unsubscribes table
  INSERT INTO public.unsubscribes (user_id, email, reason, unsubscribed_at)
  VALUES (p_user_id, p_email, p_reason, now())
  ON CONFLICT (user_id, email) DO UPDATE SET
    reason = EXCLUDED.reason,
    unsubscribed_at = EXCLUDED.unsubscribed_at;
END;
$function$;

-- Create function to handle restore process
CREATE OR REPLACE FUNCTION public.handle_restore_contact(p_email text, p_user_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000'::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  unsubscribed_record RECORD;
BEGIN
  -- Get the unsubscribed contact record
  SELECT * INTO unsubscribed_record 
  FROM public.unsubscribed_contacts 
  WHERE email = p_email AND user_id = p_user_id;
  
  IF unsubscribed_record IS NOT NULL THEN
    -- Restore to contacts table
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
        ELSE array(SELECT DISTINCT unnest(contacts.tags || EXCLUDED.tags))
      END,
      status = 'subscribed';
    
    -- Remove from unsubscribed_contacts table
    DELETE FROM public.unsubscribed_contacts WHERE id = unsubscribed_record.id;
  END IF;
  
  -- Remove from unsubscribes table
  DELETE FROM public.unsubscribes WHERE email = p_email AND user_id = p_user_id;
END;
$function$;

-- Create trigger function for when contacts are added
CREATE OR REPLACE FUNCTION public.check_unsubscribe_on_contact_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If this email exists in unsubscribes, remove it (they're re-engaging)
  DELETE FROM public.unsubscribes WHERE email = NEW.email AND user_id = NEW.user_id;
  
  -- Also remove from unsubscribed_contacts
  DELETE FROM public.unsubscribed_contacts WHERE email = NEW.email AND user_id = NEW.user_id;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER check_unsubscribe_on_contact_insert_trigger
  BEFORE INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_unsubscribe_on_contact_insert();