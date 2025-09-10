-- Fix RLS for contact_products to work in demo (no auth)
-- Drop existing restrictive policies relying on auth.uid()
DROP POLICY IF EXISTS "Users can create contact products for their contacts" ON public.contact_products;
DROP POLICY IF EXISTS "Users can delete contact products for their contacts" ON public.contact_products;
DROP POLICY IF EXISTS "Users can update contact products for their contacts" ON public.contact_products;
DROP POLICY IF EXISTS "Users can view contact products for their contacts" ON public.contact_products;

-- Allow the demo user (fixed UUID) to manage contact_products via the owning contact
CREATE POLICY "Allow demo user manage contact products"
ON public.contact_products
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = contact_products.contact_id
      AND c.user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = contact_products.contact_id
      AND c.user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
  )
);
