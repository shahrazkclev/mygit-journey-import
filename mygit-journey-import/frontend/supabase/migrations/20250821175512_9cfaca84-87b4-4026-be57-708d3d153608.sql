-- Update RLS policies to work without authentication for single-user mode
-- This allows the demo user ID to work properly

-- Drop existing policies for style_guides
DROP POLICY IF EXISTS "Users can create their own style guides" ON public.style_guides;
DROP POLICY IF EXISTS "Users can view their own style guides" ON public.style_guides;
DROP POLICY IF EXISTS "Users can update their own style guides" ON public.style_guides;
DROP POLICY IF EXISTS "Users can delete their own style guides" ON public.style_guides;

-- Create new policies that allow access for demo user
CREATE POLICY "Allow demo user access to style guides" 
ON public.style_guides 
FOR ALL 
USING (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid)
WITH CHECK (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid);

-- Update policies for other tables too
-- Contacts
DROP POLICY IF EXISTS "Users can create their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.contacts;

CREATE POLICY "Allow demo user access to contacts" 
ON public.contacts 
FOR ALL 
USING (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid)
WITH CHECK (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid);

-- Email lists
DROP POLICY IF EXISTS "Users can create their own email lists" ON public.email_lists;
DROP POLICY IF EXISTS "Users can view their own email lists" ON public.email_lists;
DROP POLICY IF EXISTS "Users can update their own email lists" ON public.email_lists;
DROP POLICY IF EXISTS "Users can delete their own email lists" ON public.email_lists;

CREATE POLICY "Allow demo user access to email lists" 
ON public.email_lists 
FOR ALL 
USING (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid)
WITH CHECK (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid);

-- Products
DROP POLICY IF EXISTS "Users can create their own products" ON public.products;
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;

CREATE POLICY "Allow demo user access to products" 
ON public.products 
FOR ALL 
USING (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid)
WITH CHECK (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid);

-- Campaigns
DROP POLICY IF EXISTS "Users can create their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can view their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can update their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON public.campaigns;

CREATE POLICY "Allow demo user access to campaigns" 
ON public.campaigns 
FOR ALL 
USING (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid)
WITH CHECK (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid);