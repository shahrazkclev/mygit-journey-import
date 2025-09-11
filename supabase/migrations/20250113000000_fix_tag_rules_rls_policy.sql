-- Fix tag_rules RLS policy to allow admin access like other tables
-- This fixes the issue where locked tags cannot be updated from the app

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can access their own tag rules" ON public.tag_rules;

-- Create new policy that allows admin to see all tag rules and regular users to see their own
CREATE POLICY "Admin can see all tag rules, users see their own" ON public.tag_rules
FOR ALL
USING (
  public.is_current_user_admin() OR auth.uid() = user_id
)
WITH CHECK (
  public.is_current_user_admin() OR auth.uid() = user_id
);
