-- Create unsubscribe tokens table for secure one-time links
CREATE TABLE public.unsubscribe_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token text NOT NULL UNIQUE,
  email text NOT NULL,
  campaign_id uuid,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamp with time zone,
  is_used boolean NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for reading tokens (needed for validation)
CREATE POLICY "Allow reading unsubscribe tokens for validation" 
ON public.unsubscribe_tokens 
FOR SELECT 
USING (true);

-- Create policy for updating tokens (marking as used)
CREATE POLICY "Allow updating tokens to mark as used" 
ON public.unsubscribe_tokens 
FOR UPDATE 
USING (true);

-- Create policy for inserting tokens
CREATE POLICY "Allow inserting unsubscribe tokens" 
ON public.unsubscribe_tokens 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster token lookups
CREATE INDEX idx_unsubscribe_tokens_token ON public.unsubscribe_tokens(token);
CREATE INDEX idx_unsubscribe_tokens_email ON public.unsubscribe_tokens(email);
CREATE INDEX idx_unsubscribe_tokens_expires_at ON public.unsubscribe_tokens(expires_at);

-- Create function to generate secure unsubscribe token
CREATE OR REPLACE FUNCTION public.generate_unsubscribe_token(
  p_email text,
  p_campaign_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT '550e8400-e29b-41d4-a716-446655440000'::uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
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