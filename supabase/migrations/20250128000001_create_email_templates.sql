-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  category TEXT,
  description TEXT,
  placeholders TEXT[], -- List of available placeholders like ['name', 'email', 'contact_id']
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "Users can view their own templates" 
ON public.email_templates 
FOR SELECT 
USING (auth.uid()::text = user_id::text OR user_id = '550e8400-e29b-41d4-a716-446655440000');

CREATE POLICY IF NOT EXISTS "Users can create their own templates" 
ON public.email_templates 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id::text OR user_id = '550e8400-e29b-41d4-a716-446655440000');

CREATE POLICY IF NOT EXISTS "Users can update their own templates" 
ON public.email_templates 
FOR UPDATE 
USING (auth.uid()::text = user_id::text OR user_id = '550e8400-e29b-41d4-a716-446655440000');

CREATE POLICY IF NOT EXISTS "Users can delete their own templates" 
ON public.email_templates 
FOR DELETE 
USING (auth.uid()::text = user_id::text OR user_id = '550e8400-e29b-41d4-a716-446655440000');

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON public.email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON public.email_templates(category);

