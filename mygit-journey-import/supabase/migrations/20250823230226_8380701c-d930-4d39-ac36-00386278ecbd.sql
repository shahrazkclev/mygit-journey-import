-- Create function to auto-populate user_id based on email
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on unsubscribes table
DROP TRIGGER IF EXISTS auto_populate_user_id_trigger ON public.unsubscribes;
CREATE TRIGGER auto_populate_user_id_trigger
  BEFORE INSERT ON public.unsubscribes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_user_id_for_unsubscribe();

-- Make user_id nullable in unsubscribes table so it can be auto-populated
ALTER TABLE public.unsubscribes ALTER COLUMN user_id DROP NOT NULL;