-- Direct fix for the specific problematic contact
INSERT INTO public.unsubscribed_contacts (
  user_id, email, first_name, last_name, tags, unsubscribed_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'cgdora4@gmail.com',
  NULL,
  NULL,
  ARRAY['[bundle] Textify: Callouts & Titles', '[bundle] Ice Off', '[bundle] Motion Path'],
  now()
) ON CONFLICT (user_id, email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  tags = EXCLUDED.tags,
  unsubscribed_at = EXCLUDED.unsubscribed_at;

-- Add to unsubscribes table
INSERT INTO public.unsubscribes (user_id, email, reason, unsubscribed_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'cgdora4@gmail.com',
  'Contact was unsubscribed but not properly processed',
  now()
) ON CONFLICT (user_id, email) DO UPDATE SET
  reason = EXCLUDED.reason,
  unsubscribed_at = EXCLUDED.unsubscribed_at;

-- Remove from contacts table  
DELETE FROM public.contacts WHERE email = 'cgdora4@gmail.com';