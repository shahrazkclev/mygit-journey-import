-- Create a more efficient approach by removing orphaned contact_lists entries
-- that reference unsubscribed contacts
DELETE FROM contact_lists 
WHERE contact_id IN (
  SELECT c.id 
  FROM contacts c 
  WHERE c.status = 'unsubscribed'
);

-- Also remove any contact_lists entries that reference contacts that don't exist
DELETE FROM contact_lists 
WHERE contact_id NOT IN (
  SELECT c.id 
  FROM contacts c 
  WHERE c.status = 'subscribed'
);