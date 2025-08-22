-- Create comprehensive email marketing database schema

-- Style guides table for storing user style preferences
CREATE TABLE public.style_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand_name TEXT NOT NULL DEFAULT 'Your Brand',
  primary_color TEXT NOT NULL DEFAULT '#684cff',
  secondary_color TEXT NOT NULL DEFAULT '#22d3ee',
  accent_color TEXT NOT NULL DEFAULT '#34d399',
  font_family TEXT NOT NULL DEFAULT 'Segoe UI, sans-serif',
  tone TEXT NOT NULL DEFAULT 'friendly',
  brand_voice TEXT,
  logo_url TEXT,
  email_signature TEXT DEFAULT 'Best regards,\nThe Team',
  page_theme_primary TEXT NOT NULL DEFAULT '#684cff',
  page_theme_secondary TEXT NOT NULL DEFAULT '#22d3ee',
  page_theme_accent TEXT NOT NULL DEFAULT '#34d399',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email lists table
CREATE TABLE public.email_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  category TEXT,
  sku TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contacts table
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  status TEXT NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'bounced')),
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, email)
);

-- Contact list memberships
CREATE TABLE public.contact_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES public.email_lists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contact_id, list_id)
);

-- Contact product purchases
CREATE TABLE public.contact_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  price_paid DECIMAL(10,2),
  UNIQUE(contact_id, product_id)
);

-- Campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
  list_ids UUID[],
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unsubscribes table
CREATE TABLE public.unsubscribes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  reason TEXT,
  unsubscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, email)
);

-- Enable Row Level Security
ALTER TABLE public.style_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unsubscribes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user access
CREATE POLICY "Users can view their own style guides" ON public.style_guides FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can create their own style guides" ON public.style_guides FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own style guides" ON public.style_guides FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own style guides" ON public.style_guides FOR DELETE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own email lists" ON public.email_lists FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can create their own email lists" ON public.email_lists FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own email lists" ON public.email_lists FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own email lists" ON public.email_lists FOR DELETE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own products" ON public.products FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can create their own products" ON public.products FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own products" ON public.products FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own products" ON public.products FOR DELETE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own contacts" ON public.contacts FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can create their own contacts" ON public.contacts FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own contacts" ON public.contacts FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own contacts" ON public.contacts FOR DELETE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view contact lists for their contacts" ON public.contact_lists FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.contacts WHERE contacts.id = contact_lists.contact_id AND auth.uid()::text = contacts.user_id::text)
);
CREATE POLICY "Users can create contact lists for their contacts" ON public.contact_lists FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.contacts WHERE contacts.id = contact_lists.contact_id AND auth.uid()::text = contacts.user_id::text)
);
CREATE POLICY "Users can update contact lists for their contacts" ON public.contact_lists FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.contacts WHERE contacts.id = contact_lists.contact_id AND auth.uid()::text = contacts.user_id::text)
);
CREATE POLICY "Users can delete contact lists for their contacts" ON public.contact_lists FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.contacts WHERE contacts.id = contact_lists.contact_id AND auth.uid()::text = contacts.user_id::text)
);

CREATE POLICY "Users can view contact products for their contacts" ON public.contact_products FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.contacts WHERE contacts.id = contact_products.contact_id AND auth.uid()::text = contacts.user_id::text)
);
CREATE POLICY "Users can create contact products for their contacts" ON public.contact_products FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.contacts WHERE contacts.id = contact_products.contact_id AND auth.uid()::text = contacts.user_id::text)
);
CREATE POLICY "Users can update contact products for their contacts" ON public.contact_products FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.contacts WHERE contacts.id = contact_products.contact_id AND auth.uid()::text = contacts.user_id::text)
);
CREATE POLICY "Users can delete contact products for their contacts" ON public.contact_products FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.contacts WHERE contacts.id = contact_products.contact_id AND auth.uid()::text = contacts.user_id::text)
);

CREATE POLICY "Users can view their own campaigns" ON public.campaigns FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can create their own campaigns" ON public.campaigns FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own campaigns" ON public.campaigns FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own campaigns" ON public.campaigns FOR DELETE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own unsubscribes" ON public.unsubscribes FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can create their own unsubscribes" ON public.unsubscribes FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own unsubscribes" ON public.unsubscribes FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own unsubscribes" ON public.unsubscribes FOR DELETE USING (auth.uid()::text = user_id::text);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_style_guides_updated_at BEFORE UPDATE ON public.style_guides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_email_lists_updated_at BEFORE UPDATE ON public.email_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_style_guides_user_id ON public.style_guides(user_id);
CREATE INDEX idx_email_lists_user_id ON public.email_lists(user_id);
CREATE INDEX idx_products_user_id ON public.products(user_id);
CREATE INDEX idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX idx_unsubscribes_user_id ON public.unsubscribes(user_id);