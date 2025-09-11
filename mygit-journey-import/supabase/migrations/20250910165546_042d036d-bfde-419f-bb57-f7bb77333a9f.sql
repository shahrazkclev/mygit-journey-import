-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, CASE 
    WHEN NEW.email = 'cgdora4@gmail.com' THEN 'admin'
    ELSE 'user'
  END);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to migrate existing data from demo user to real admin
CREATE OR REPLACE FUNCTION public.migrate_demo_data_to_admin(admin_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update contacts
  UPDATE public.contacts 
  SET user_id = admin_user_id 
  WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
  
  -- Update campaigns
  UPDATE public.campaigns 
  SET user_id = admin_user_id 
  WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
  
  -- Update products
  UPDATE public.products 
  SET user_id = admin_user_id 
  WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
  
  -- Update email_lists
  UPDATE public.email_lists 
  SET user_id = admin_user_id 
  WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
  
  -- Update user_settings
  UPDATE public.user_settings 
  SET user_id = admin_user_id 
  WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
  
  -- Update style_guides
  UPDATE public.style_guides 
  SET user_id = admin_user_id 
  WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
  
  -- Update tag_rules
  UPDATE public.tag_rules 
  SET user_id = admin_user_id 
  WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
  
  -- Update unsubscribed_contacts
  UPDATE public.unsubscribed_contacts 
  SET user_id = admin_user_id 
  WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
  
  -- Update unsubscribes
  UPDATE public.unsubscribes 
  SET user_id = admin_user_id 
  WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
  
  -- Update unsubscribe_tokens
  UPDATE public.unsubscribe_tokens 
  SET user_id = admin_user_id 
  WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update RLS policies to work with real users instead of demo UUID
-- Update contacts policies
DROP POLICY IF EXISTS "Allow demo user access to contacts" ON public.contacts;
CREATE POLICY "Users can access their own contacts" 
ON public.contacts 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update campaigns policies  
DROP POLICY IF EXISTS "Allow demo user access to campaigns" ON public.campaigns;
CREATE POLICY "Users can access their own campaigns" 
ON public.campaigns 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update products policies
DROP POLICY IF EXISTS "Allow demo user access to products" ON public.products;
CREATE POLICY "Users can access their own products" 
ON public.products 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update email_lists policies
DROP POLICY IF EXISTS "Allow demo user access to email lists" ON public.email_lists;
CREATE POLICY "Users can access their own email lists" 
ON public.email_lists 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update user_settings policies
DROP POLICY IF EXISTS "Allow demo user access to settings" ON public.user_settings;
CREATE POLICY "Users can access their own settings" 
ON public.user_settings 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update style_guides policies
DROP POLICY IF EXISTS "Allow demo user access to style guides" ON public.style_guides;
CREATE POLICY "Users can access their own style guides" 
ON public.style_guides 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update tag_rules policies
DROP POLICY IF EXISTS "Allow demo user access to tag rules" ON public.tag_rules;
CREATE POLICY "Users can access their own tag rules" 
ON public.tag_rules 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update unsubscribed_contacts policies
DROP POLICY IF EXISTS "Allow demo user access to unsubscribed contacts" ON public.unsubscribed_contacts;
CREATE POLICY "Users can access their own unsubscribed contacts" 
ON public.unsubscribed_contacts 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update unsubscribe_tokens policies (keep existing public access)
-- These stay public for unsubscribe functionality

-- Add trigger for automatic timestamp updates on profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();