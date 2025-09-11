-- Restore the lost contact data to unsubscribed_contacts
INSERT INTO public.unsubscribed_contacts (
  user_id, 
  email, 
  first_name, 
  last_name, 
  tags, 
  original_contact_id, 
  unsubscribed_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'cgdora4@gmail.com',
  'Cgdora4',
  null,
  ARRAY['purchase updates only'],
  '59002d14-4992-4e4b-ae5c-57f2c49d844d'::uuid,
  '2025-09-06 13:06:24.755669+00'::timestamp with time zone
) ON CONFLICT (user_id, email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  tags = EXCLUDED.tags,
  original_contact_id = EXCLUDED.original_contact_id,
  unsubscribed_at = EXCLUDED.unsubscribed_at;