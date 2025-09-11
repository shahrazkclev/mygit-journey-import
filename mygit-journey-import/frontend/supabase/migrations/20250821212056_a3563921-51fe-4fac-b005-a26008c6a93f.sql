-- Test insert into contact_lists to verify permissions work
INSERT INTO contact_lists (contact_id, list_id)
SELECT 
  (SELECT id FROM contacts WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' LIMIT 1),
  (SELECT id FROM email_lists WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM contacts WHERE user_id = '550e8400-e29b-41d4-a716-446655440000')
  AND EXISTS (SELECT 1 FROM email_lists WHERE user_id = '550e8400-e29b-41d4-a716-446655440000');