-- Fix RLS policies for contact_lists table to work with demo user
-- Drop existing policies
DROP POLICY IF EXISTS "Users can create contact lists for their contacts" ON contact_lists;
DROP POLICY IF EXISTS "Users can view contact lists for their contacts" ON contact_lists;
DROP POLICY IF EXISTS "Users can update contact lists for their contacts" ON contact_lists;
DROP POLICY IF EXISTS "Users can delete contact lists for their contacts" ON contact_lists;

-- Create new policies that work with demo user
CREATE POLICY "Allow demo user to manage contact lists" 
ON contact_lists 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM contacts 
    WHERE contacts.id = contact_lists.contact_id 
    AND contacts.user_id = '550e8400-e29b-41d4-a716-446655440000'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM contacts 
    WHERE contacts.id = contact_lists.contact_id 
    AND contacts.user_id = '550e8400-e29b-41d4-a716-446655440000'
  )
);