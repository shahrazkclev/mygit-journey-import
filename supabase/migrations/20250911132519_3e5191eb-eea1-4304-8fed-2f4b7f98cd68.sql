-- Update RLS policies for contacts to allow admin to see all contacts
DROP POLICY IF EXISTS "Users can access their own contacts" ON public.contacts;

-- Create new policy that allows admin to see all contacts and regular users to see their own
CREATE POLICY "Admin can see all contacts, users see their own" ON public.contacts
FOR ALL
USING (
  -- Allow if user is admin (cgdora4@gmail.com) or if it's their own contact
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
  OR auth.uid() = user_id
)
WITH CHECK (
  -- Allow admin to insert/update any contact, users only their own
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
  OR auth.uid() = user_id
);

-- Create a function to automatically assign contacts to admin when created via API
CREATE OR REPLACE FUNCTION public.auto_assign_contacts_to_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- If user_id is the demo user ID, assign to admin instead
  IF NEW.user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid THEN
    NEW.user_id := '3e01343e-9ad5-452e-95ac-d16c58c6cae2'::uuid;
  END IF;
  
  -- If no user_id provided, assign to admin by default
  IF NEW.user_id IS NULL THEN
    NEW.user_id := '3e01343e-9ad5-452e-95ac-d16c58c6cae2'::uuid;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign contacts to admin
CREATE TRIGGER auto_assign_contacts_to_admin_trigger
  BEFORE INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_contacts_to_admin();

-- Migrate existing demo contacts to admin user
UPDATE public.contacts 
SET user_id = '3e01343e-9ad5-452e-95ac-d16c58c6cae2'::uuid 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;

-- Also update other tables to migrate demo data to admin
UPDATE public.campaigns 
SET user_id = '3e01343e-9ad5-452e-95ac-d16c58c6cae2'::uuid 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;

UPDATE public.products 
SET user_id = '3e01343e-9ad5-452e-95ac-d16c58c6cae2'::uuid 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;

UPDATE public.email_lists 
SET user_id = '3e01343e-9ad5-452e-95ac-d16c58c6cae2'::uuid 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;

UPDATE public.user_settings 
SET user_id = '3e01343e-9ad5-452e-95ac-d16c58c6cae2'::uuid 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;

UPDATE public.style_guides 
SET user_id = '3e01343e-9ad5-452e-95ac-d16c58c6cae2'::uuid 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;

UPDATE public.tag_rules 
SET user_id = '3e01343e-9ad5-452e-95ac-d16c58c6cae2'::uuid 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;

UPDATE public.unsubscribed_contacts 
SET user_id = '3e01343e-9ad5-452e-95ac-d16c58c6cae2'::uuid 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;

UPDATE public.unsubscribes 
SET user_id = '3e01343e-9ad5-452e-95ac-d16c58c6cae2'::uuid 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;

UPDATE public.unsubscribe_tokens 
SET user_id = '3e01343e-9ad5-452e-95ac-d16c58c6cae2'::uuid 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;