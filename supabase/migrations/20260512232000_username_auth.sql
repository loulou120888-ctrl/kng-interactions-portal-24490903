-- Add username column to profiles (extracted from internal email at signup)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(lower(username));

-- Add deactivated flag so managers can block sign-in without deleting data
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deactivated boolean NOT NULL DEFAULT false;

-- Rebuild handle_new_user to extract username from internal email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code text;
  v_row public.signup_codes%ROWTYPE;
  v_user_count int;
  v_role public.app_role;
  v_dept public.department;
  v_name text;
  v_username text;
BEGIN
  v_code := NEW.raw_user_meta_data->>'signup_code';
  v_name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''), split_part(NEW.email, '@', 1));
  -- Username is the part before @ in the internal email (e.g. john_doe@kng.internal → john_doe)
  v_username := split_part(NEW.email, '@', 1);

  SELECT count(*) INTO v_user_count FROM public.user_roles;

  IF v_user_count = 0 THEN
    v_role := 'manager';
    v_dept := NULL;
  ELSE
    IF v_code IS NULL OR length(v_code) = 0 THEN
      RAISE EXCEPTION 'Signup code required';
    END IF;
    SELECT * INTO v_row FROM public.signup_codes WHERE code = v_code FOR UPDATE;
    IF NOT FOUND OR v_row.revoked OR v_row.used_by IS NOT NULL THEN
      RAISE EXCEPTION 'Invalid or used signup code';
    END IF;
    v_role := v_row.role;
    v_dept := v_row.department;
    UPDATE public.signup_codes SET used_by = NEW.id, used_at = now() WHERE id = v_row.id;
  END IF;

  INSERT INTO public.profiles (id, display_name, username, department)
  VALUES (NEW.id, v_name, v_username, v_dept);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow aux+ to set deactivated (manager-only in the UI, but aux+ at DB level for flexibility)
-- Existing "profiles aux+ update any" policy covers this already.
-- Add realtime for profiles so clients can react to deactivation instantly
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- already added
  END;
END $$;
