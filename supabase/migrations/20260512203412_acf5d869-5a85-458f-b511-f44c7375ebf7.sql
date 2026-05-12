
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','moderator'))
$$;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  badge_number text,
  rank text DEFAULT 'Cadet',
  department text DEFAULT 'Unassigned',
  avatar_url text,
  status text NOT NULL DEFAULT 'offline',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Roles viewable by authenticated" ON public.user_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger to create profile + first-user-is-admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count int;
  assigned_role app_role;
BEGIN
  INSERT INTO public.profiles (id, display_name, badge_number, rank, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'badge_number',
    COALESCE(NEW.raw_user_meta_data->>'rank', 'Cadet'),
    COALESCE(NEW.raw_user_meta_data->>'department', 'Unassigned')
  );

  SELECT count(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'user';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Interactions
CREATE TABLE public.interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'Citation',
  citizen_name text NOT NULL,
  location text,
  summary text NOT NULL,
  details text,
  severity text NOT NULL DEFAULT 'low',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Interactions viewable by authenticated" ON public.interactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert interactions" ON public.interactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Author or staff update interactions" ON public.interactions
  FOR UPDATE TO authenticated USING (auth.uid() = author_id OR public.is_staff(auth.uid()));
CREATE POLICY "Author or staff delete interactions" ON public.interactions
  FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.is_staff(auth.uid()));

-- Warnings/notes on staff
CREATE TABLE public.warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  issued_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  severity text NOT NULL DEFAULT 'note',
  reason text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.warnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Warnings viewable by self or staff" ON public.warnings
  FOR SELECT TO authenticated USING (auth.uid() = target_user_id OR public.is_staff(auth.uid()));
CREATE POLICY "Staff insert warnings" ON public.warnings
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND auth.uid() = issued_by);
CREATE POLICY "Staff delete warnings" ON public.warnings
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- Staff activity audit log
CREATE TABLE public.staff_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activity viewable by self or staff" ON public.staff_activity
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "Authenticated insert own activity" ON public.staff_activity
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER interactions_touch BEFORE UPDATE ON public.interactions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_interactions_created ON public.interactions(created_at DESC);
CREATE INDEX idx_interactions_author ON public.interactions(author_id);
CREATE INDEX idx_activity_user ON public.staff_activity(user_id, created_at DESC);
