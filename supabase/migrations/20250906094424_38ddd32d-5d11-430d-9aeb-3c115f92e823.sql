-- Manual fix for the specific contact that's causing issues
INSERT INTO public.unsubscribed_contacts (
  user_id, email, first_name, last_name, tags, unsubscribed_at
)
SELECT 
  user_id, email, first_name, last_name, tags, now()
FROM public.contacts 
WHERE email = 'cgdora4@gmail.com' AND status = 'unsubscribed'
ON CONFLICT (user_id, email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  tags = EXCLUDED.tags,
  unsubscribed_at = EXCLUDED.unsubscribed_at;

-- Add to unsubscribes table
INSERT INTO public.unsubscribes (user_id, email, reason, unsubscribed_at)
SELECT user_id, email, 'Contact was unsubscribed but not properly processed', now()
FROM public.contacts 
WHERE email = 'cgdora4@gmail.com' AND status = 'unsubscribed'
ON CONFLICT (user_id, email) DO UPDATE SET
  reason = EXCLUDED.reason,
  unsubscribed_at = EXCLUDED.unsubscribed_at;

-- Remove from contacts table
DELETE FROM public.contacts WHERE email = 'cgdora4@gmail.com' AND status = 'unsubscribed';