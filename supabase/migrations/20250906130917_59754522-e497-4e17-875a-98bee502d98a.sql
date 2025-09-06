-- Fix the handle_unsubscribe function to properly remove contacts from contacts table
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
      original_contact_id = EXCLUDED.original_contact_id,
      unsubscribed_at = EXCLUDED.unsubscribed_at;
    
    -- Add to unsubscribes table 
    INSERT INTO public.unsubscribes (user_id, email, reason, unsubscribed_at)
    VALUES (p_user_id, contact_record.email, p_reason, now())
    ON CONFLICT (user_id, email) DO UPDATE SET
      reason = EXCLUDED.reason,
      unsubscribed_at = EXCLUDED.unsubscribed_at;
    
    -- CRITICAL: Remove from contacts table (case-insensitive match)
    DELETE FROM public.contacts 
    WHERE user_id = p_user_id AND lower(email) = lower(contact_record.email);
    
  ELSE
    -- No specific contact found, but still mark as unsubscribed
    INSERT INTO public.unsubscribes (user_id, email, reason, unsubscribed_at)
    VALUES (p_user_id, p_email, p_reason, now())
    ON CONFLICT (user_id, email) DO UPDATE SET
      reason = EXCLUDED.reason,
      unsubscribed_at = EXCLUDED.unsubscribed_at;
  END IF;
END;
$function$;

-- Now fix the current broken state by running the function manually for this contact
SELECT public.handle_unsubscribe('cgdora4@gmail.com', '550e8400-e29b-41d4-a716-446655440000'::uuid, 'never_signed_up');