-- First, let's clean up the duplicate state for cgdora4@gmail.com
-- Delete from contacts table since they're already properly unsubscribed
DELETE FROM contacts 
WHERE email = 'cgdora4@gmail.com' 
AND user_id = '550e8400-e29b-41d4-a716-446655440000';

-- Let's also check and fix the handle_unsubscribe function to ensure it properly deletes contacts
-- The issue might be that it's trying to delete by ID but the ID might not match
CREATE OR REPLACE FUNCTION public.handle_unsubscribe(p_email text DEFAULT NULL::text, p_user_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000'::uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  contact_record RECORD;
BEGIN
  -- If email is provided, use it to find the contact
  IF p_email IS NOT NULL THEN
    SELECT * INTO contact_record 
    FROM public.contacts 
    WHERE email = p_email AND user_id = p_user_id;
  ELSE
    -- If no email provided, find any contact for this user_id (for user_id-only unsubscribes)
    contact_record := NULL;
  END IF;
  
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
    
    -- Add to unsubscribes table FIRST
    INSERT INTO public.unsubscribes (user_id, email, reason, unsubscribed_at)
    VALUES (p_user_id, contact_record.email, p_reason, now())
    ON CONFLICT (user_id, email) DO UPDATE SET
      reason = EXCLUDED.reason,
      unsubscribed_at = EXCLUDED.unsubscribed_at;
    
    -- THEN Remove from contacts table (do this last to avoid trigger issues)
    DELETE FROM public.contacts WHERE email = contact_record.email AND user_id = p_user_id;
    
  ELSE
    -- No specific contact found, but still mark user_id as unsubscribed
    INSERT INTO public.unsubscribes (user_id, email, reason, unsubscribed_at)
    VALUES (p_user_id, p_email, p_reason, now())
    ON CONFLICT (user_id, email) DO UPDATE SET
      reason = EXCLUDED.reason,
      unsubscribed_at = EXCLUDED.unsubscribed_at;
      
    -- Also remove all contacts for this user_id if no email specified
    IF p_email IS NULL THEN
      -- Move all contacts for this user to unsubscribed_contacts
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
      
      -- Remove all contacts for this user_id
      DELETE FROM public.contacts WHERE user_id = p_user_id;
    END IF;
  END IF;
END;
$function$;