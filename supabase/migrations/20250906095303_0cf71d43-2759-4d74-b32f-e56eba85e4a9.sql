-- Manually update the restored contact to have the correct tags
UPDATE public.contacts 
SET tags = ARRAY['[bundle] Textify: Callouts & Titles', '[bundle] Ice Off', '[bundle] Motion Path']
WHERE email = 'cgdora4@gmail.com' AND user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;