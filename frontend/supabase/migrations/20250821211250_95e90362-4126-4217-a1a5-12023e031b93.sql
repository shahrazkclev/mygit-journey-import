-- Test insert to verify the demo user can create email lists
INSERT INTO email_lists (user_id, name, description) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Test List', 'Test description');

-- Select to verify it worked
SELECT * FROM email_lists WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';