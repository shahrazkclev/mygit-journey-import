-- Fix the RLS policy issue by creating a security definer function
-- This prevents infinite recursion in RLS policies

-- Create a security definer function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Drop the existing policy that might cause recursion
DROP POLICY IF EXISTS "Admin can see all contacts, users see their own" ON public.contacts;

-- Create new secure policy using the security definer function
CREATE POLICY "Admin can see all contacts, users see their own" ON public.contacts
FOR ALL
USING (
  public.is_current_user_admin() OR auth.uid() = user_id
)
WITH CHECK (
  public.is_current_user_admin() OR auth.uid() = user_id
);

-- Also fix the search path for the auto-assign function
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
$$ LANGUAGE plpgsql SET search_path = public;