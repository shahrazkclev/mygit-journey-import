-- Add contact_id column to unsubscribe_tokens table
ALTER TABLE public.unsubscribe_tokens 
ADD COLUMN contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE;

-- Create index for faster contact_id lookups
CREATE INDEX idx_unsubscribe_tokens_contact_id ON public.unsubscribe_tokens(contact_id);

-- Update existing records to populate contact_id from email
UPDATE public.unsubscribe_tokens 
SET contact_id = c.id
FROM public.contacts c
WHERE unsubscribe_tokens.email = c.email 
  AND unsubscribe_tokens.user_id = c.user_id;
