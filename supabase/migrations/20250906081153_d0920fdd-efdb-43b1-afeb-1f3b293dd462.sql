-- Fix security warning by setting search_path for the function
CREATE OR REPLACE FUNCTION public.generate_unsubscribe_token(
  p_email text,
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
BEGIN
  -- Generate a secure random token
  token_value := encode(gen_random_bytes(32), 'base64url');
  
  -- Insert the token record
  INSERT INTO public.unsubscribe_tokens (token, email, campaign_id, user_id)
  VALUES (token_value, p_email, p_campaign_id, p_user_id);
  
  RETURN token_value;
END;
$$;