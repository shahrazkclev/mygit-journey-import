-- Fix RLS policies to use authenticated users instead of hardcoded demo UUID

-- Fix contact_products policies
DROP POLICY IF EXISTS "Allow demo user manage contact products" ON public.contact_products;

CREATE POLICY "Users can manage contact products for their contacts" 
ON public.contact_products 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = contact_products.contact_id 
    AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = contact_products.contact_id 
    AND c.user_id = auth.uid()
  )
);

-- Fix contact_lists policies  
DROP POLICY IF EXISTS "Allow demo user to manage contact lists" ON public.contact_lists;

CREATE POLICY "Users can manage contact lists for their contacts" 
ON public.contact_lists 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.contacts 
    WHERE contacts.id = contact_lists.contact_id 
    AND contacts.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contacts 
    WHERE contacts.id = contact_lists.contact_id 
    AND contacts.user_id = auth.uid()
  )
);

-- Fix campaign_sends policies
DROP POLICY IF EXISTS "Users can view sends for their campaigns" ON public.campaign_sends;
DROP POLICY IF EXISTS "Users can insert sends for their campaigns" ON public.campaign_sends;  
DROP POLICY IF EXISTS "Users can update sends for their campaigns" ON public.campaign_sends;

CREATE POLICY "Users can view sends for their campaigns" 
ON public.campaign_sends 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = campaign_sends.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert sends for their campaigns" 
ON public.campaign_sends 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = campaign_sends.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update sends for their campaigns" 
ON public.campaign_sends 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = campaign_sends.campaign_id 
    AND campaigns.user_id = auth.uid()
  )
);

-- Fix unsubscribes policies
DROP POLICY IF EXISTS "Allow demo user to delete unsubscribes" ON public.unsubscribes;

CREATE POLICY "Users can delete their own unsubscribes" 
ON public.unsubscribes 
FOR DELETE 
USING (auth.uid() = user_id);