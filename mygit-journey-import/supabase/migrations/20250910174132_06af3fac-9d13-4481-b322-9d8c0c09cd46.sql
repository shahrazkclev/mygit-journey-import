-- Create profile for the admin user if it doesn't exist
INSERT INTO public.profiles (id, email, role)
VALUES ('3e01343e-9ad5-452e-95ac-d16c58c6cae2', 'cgdora4@gmail.com', 'admin')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role;

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    CASE 
      WHEN NEW.email = 'cgdora4@gmail.com' THEN 'admin'
      ELSE 'user'
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = CASE 
      WHEN NEW.email = 'cgdora4@gmail.com' THEN 'admin'
      ELSE profiles.role  -- Keep existing role for other users
    END;
  RETURN NEW;
END;
$function$;