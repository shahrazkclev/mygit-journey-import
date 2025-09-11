-- Create function to restrict signups to only cgdora4@gmail.com
CREATE OR REPLACE FUNCTION public.restrict_signup_to_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow cgdora4@gmail.com to create accounts
  IF NEW.email != 'cgdora4@gmail.com' THEN
    RAISE EXCEPTION 'Account creation is restricted. Access denied.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run before any user is inserted into auth.users
DROP TRIGGER IF EXISTS restrict_signup_trigger ON auth.users;
CREATE TRIGGER restrict_signup_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.restrict_signup_to_admin();