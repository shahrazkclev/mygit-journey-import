-- Update generate_unsubscribe_token function to accept and store contact_id
CREATE OR REPLACE FUNCTION public.generate_unsubscribe_token(
  p_contact_id uuid,
  p_campaign_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000'::uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_value text;
  contact_email text;
BEGIN
  -- Get contact email from contact_id
  SELECT email INTO contact_email
  FROM public.contacts
  WHERE id = p_contact_id AND user_id = p_user_id;
  
  -- Check if contact exists
  IF contact_email IS NULL THEN
    RAISE EXCEPTION 'Contact not found';
  END IF;
  
  -- Generate a secure random token
  token_value := encode(gen_random_bytes(32), 'base64url');
  
  -- Insert the token record with both contact_id and email
  INSERT INTO public.unsubscribe_tokens (token, contact_id, email, campaign_id, user_id)
  VALUES (token_value, p_contact_id, contact_email, p_campaign_id, p_user_id);
  
  RETURN token_value;
END;
$$;
