-- Update email domain validation to use the correct university domain
CREATE OR REPLACE FUNCTION public.validate_email_domain(email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Enforce the correct university domain
  RETURN email LIKE '%@elizadeuniversity.edu.ng';
END;
$$;

-- Optional: Update any existing profiles that might have the old domain (if necessary)
-- UPDATE public.profiles
-- SET email = REPLACE(email, '@elizade.edu.ng', '@elizadeuniversity.edu.ng')
-- WHERE email LIKE '%@elizade.edu.ng';

-- UPDATE public.profiles
-- SET email = REPLACE(email, '@student.elizade.edu.ng', '@elizadeuniversity.edu.ng')
-- WHERE email LIKE '%@student.elizade.edu.ng';