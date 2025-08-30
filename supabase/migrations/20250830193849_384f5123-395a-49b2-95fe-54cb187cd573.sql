-- Fix the remaining function security warning
CREATE OR REPLACE FUNCTION public.auto_populate_user_id_for_unsubscribe()
RETURNS TRIGGER AS $$
BEGIN
  -- If user_id is not provided, try to find it from contacts table
  IF NEW.user_id IS NULL THEN
    SELECT user_id INTO NEW.user_id 
    FROM public.contacts 
    WHERE email = NEW.email 
    LIMIT 1;
    
    -- If still no user_id found, use the demo user ID as fallback
    IF NEW.user_id IS NULL THEN
      NEW.user_id := '550e8400-e29b-41d4-a716-446655440000'::uuid;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';