-- 1. Add city_id column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city_id text;

-- 2. Add helper role to app_role enum
-- (PostgreSQL 12+ allows ADD VALUE inside a transaction; Supabase uses pg14+)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'helper'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'helper';
  END IF;
END $$;

-- 3. Create avatars storage bucket (public so <img src> works without signed URLs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies for avatars
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars public read' AND tablename = 'objects') THEN
    CREATE POLICY "avatars public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars auth upload' AND tablename = 'objects') THEN
    CREATE POLICY "avatars auth upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars auth update' AND tablename = 'objects') THEN
    CREATE POLICY "avatars auth update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars auth delete' AND tablename = 'objects') THEN
    CREATE POLICY "avatars auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');
  END IF;
END $$;

-- 5. Rebuild handle_new_user to also save city_id
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
  v_city_id text;
BEGIN
  v_code     := NEW.raw_user_meta_data->>'signup_code';
  v_name     := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''), split_part(NEW.email, '@', 1));
  v_username := split_part(NEW.email, '@', 1);
  v_city_id  := NULLIF(trim(NEW.raw_user_meta_data->>'city_id'), '');

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

  INSERT INTO public.profiles (id, display_name, username, department, city_id)
  VALUES (NEW.id, v_name, v_username, v_dept, v_city_id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END; $$;
