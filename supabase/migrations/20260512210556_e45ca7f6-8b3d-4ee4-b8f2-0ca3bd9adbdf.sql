
-- Drop old tables to rebuild (project is fresh)
DROP TABLE IF EXISTS public.warnings CASCADE;
DROP TABLE IF EXISTS public.staff_activity CASCADE;
DROP TABLE IF EXISTS public.interactions CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Enums
CREATE TYPE public.app_role AS ENUM ('member','sld','ld','aux','adm','manager');
CREATE TYPE public.department AS ENUM ('events','parties','entertainment');
CREATE TYPE public.schedule_type AS ENUM ('events_parties','entertainment');
CREATE TYPE public.slot_status AS ENUM ('booked','in_progress','completed','cancelled');

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text,
  department public.department,
  status text NOT NULL DEFAULT 'offline',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

CREATE OR REPLACE FUNCTION public.is_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role='manager')
$$;

CREATE OR REPLACE FUNCTION public.is_aux_plus(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('aux','adm','manager'))
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Signup codes (one-time)
CREATE TABLE public.signup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  role public.app_role NOT NULL DEFAULT 'member',
  department public.department,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.signup_codes ENABLE ROW LEVEL SECURITY;

-- Handle new user: read code from metadata, validate, assign role+dept, consume code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code text;
  v_row public.signup_codes%ROWTYPE;
  v_user_count int;
  v_role public.app_role;
  v_dept public.department;
  v_name text;
BEGIN
  v_code := NEW.raw_user_meta_data->>'signup_code';
  v_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1));

  SELECT count(*) INTO v_user_count FROM public.user_roles;

  IF v_user_count = 0 THEN
    -- First user becomes manager (top rank)
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

  INSERT INTO public.profiles (id, display_name, department) VALUES (NEW.id, v_name, v_dept);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Schedule slots
CREATE TABLE public.schedule_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_type public.schedule_type NOT NULL,
  slot_start timestamptz NOT NULL,
  department public.department NOT NULL,
  title text NOT NULL,
  notes text,
  booked_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.slot_status NOT NULL DEFAULT 'booked',
  interaction_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX schedule_slots_unique_active
  ON public.schedule_slots(schedule_type, slot_start)
  WHERE status <> 'cancelled';
ALTER TABLE public.schedule_slots ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER schedule_slots_touch BEFORE UPDATE ON public.schedule_slots
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Interactions
CREATE TABLE public.interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department public.department NOT NULL,
  title text NOT NULL,
  location text,
  summary text,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id uuid REFERENCES public.schedule_slots(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER interactions_touch BEFORE UPDATE ON public.interactions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.interaction_attendees (
  interaction_id uuid NOT NULL REFERENCES public.interactions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (interaction_id, user_id)
);
ALTER TABLE public.interaction_attendees ENABLE ROW LEVEL SECURITY;

-- Prizes
CREATE TABLE public.prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  default_quantity int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER prizes_touch BEFORE UPDATE ON public.prizes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Winners
CREATE TABLE public.interaction_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id uuid NOT NULL REFERENCES public.interactions(id) ON DELETE CASCADE,
  winner_id text NOT NULL,
  prize_code text NOT NULL,
  prize_name text,
  quantity int NOT NULL DEFAULT 1,
  comped boolean NOT NULL DEFAULT false,
  comped_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  comped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.interaction_winners ENABLE ROW LEVEL SECURITY;

-- Points log
CREATE TABLE public.points_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_id uuid REFERENCES public.interactions(id) ON DELETE CASCADE,
  amount int NOT NULL DEFAULT 1,
  awarded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.points_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX points_log_user_time ON public.points_log(user_id, awarded_at DESC);

-- Award points trigger: 1 point to author when interaction created
CREATE OR REPLACE FUNCTION public.award_author_point()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.points_log (user_id, interaction_id, amount) VALUES (NEW.author_id, NEW.id, 1);
  RETURN NEW;
END; $$;
CREATE TRIGGER award_author AFTER INSERT ON public.interactions
FOR EACH ROW EXECUTE FUNCTION public.award_author_point();

-- Award points to attendee on insert
CREATE OR REPLACE FUNCTION public.award_attendee_point()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.points_log (user_id, interaction_id, amount) VALUES (NEW.user_id, NEW.interaction_id, 1);
  RETURN NEW;
END; $$;
CREATE TRIGGER award_attendee AFTER INSERT ON public.interaction_attendees
FOR EACH ROW EXECUTE FUNCTION public.award_attendee_point();

-- Announcements
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.announcement_reads (
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- Hall of fame
CREATE TABLE public.hall_of_fame (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  winner_id text,
  caption text,
  image_url text NOT NULL,
  frame_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hall_of_fame ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "profiles select all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update self" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles aux+ update any" ON public.profiles FOR UPDATE TO authenticated USING (public.is_aux_plus(auth.uid()));
CREATE POLICY "profiles manager delete" ON public.profiles FOR DELETE TO authenticated USING (public.is_manager(auth.uid()));

-- user_roles
CREATE POLICY "roles select all" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles aux+ manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_aux_plus(auth.uid())) WITH CHECK (public.is_aux_plus(auth.uid()));

-- signup_codes: aux+ manage; user can SELECT their used code
CREATE POLICY "codes aux+ all" ON public.signup_codes FOR ALL TO authenticated
  USING (public.is_aux_plus(auth.uid())) WITH CHECK (public.is_aux_plus(auth.uid()));

-- schedule_slots
CREATE POLICY "slots select all" ON public.schedule_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "slots authed insert" ON public.schedule_slots FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = booked_by);
CREATE POLICY "slots owner or aux+ update" ON public.schedule_slots FOR UPDATE TO authenticated
  USING (auth.uid() = booked_by OR public.is_aux_plus(auth.uid()));
CREATE POLICY "slots owner or aux+ delete" ON public.schedule_slots FOR DELETE TO authenticated
  USING (auth.uid() = booked_by OR public.is_aux_plus(auth.uid()));

-- interactions
CREATE POLICY "interactions select all" ON public.interactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "interactions insert self" ON public.interactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);
CREATE POLICY "interactions update self/aux+" ON public.interactions FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR public.is_aux_plus(auth.uid()));
CREATE POLICY "interactions delete aux+" ON public.interactions FOR DELETE TO authenticated
  USING (public.is_aux_plus(auth.uid()));

-- interaction_attendees
CREATE POLICY "attendees select all" ON public.interaction_attendees FOR SELECT TO authenticated USING (true);
CREATE POLICY "attendees insert by author" ON public.interaction_attendees FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.interactions i WHERE i.id = interaction_id AND (i.author_id = auth.uid() OR public.is_aux_plus(auth.uid()))));
CREATE POLICY "attendees delete by author/aux+" ON public.interaction_attendees FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.interactions i WHERE i.id = interaction_id AND (i.author_id = auth.uid() OR public.is_aux_plus(auth.uid()))));

-- prizes
CREATE POLICY "prizes select all" ON public.prizes FOR SELECT TO authenticated USING (true);
CREATE POLICY "prizes aux+ manage" ON public.prizes FOR ALL TO authenticated
  USING (public.is_aux_plus(auth.uid())) WITH CHECK (public.is_aux_plus(auth.uid()));

-- winners
CREATE POLICY "winners select all" ON public.interaction_winners FOR SELECT TO authenticated USING (true);
CREATE POLICY "winners insert by author" ON public.interaction_winners FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.interactions i WHERE i.id = interaction_id AND (i.author_id = auth.uid() OR public.is_aux_plus(auth.uid()))));
CREATE POLICY "winners update aux+ or author" ON public.interaction_winners FOR UPDATE TO authenticated
  USING (public.is_aux_plus(auth.uid()) OR EXISTS (SELECT 1 FROM public.interactions i WHERE i.id = interaction_id AND i.author_id = auth.uid()));
CREATE POLICY "winners delete aux+" ON public.interaction_winners FOR DELETE TO authenticated
  USING (public.is_aux_plus(auth.uid()));

-- points_log
CREATE POLICY "points select all" ON public.points_log FOR SELECT TO authenticated USING (true);

-- announcements
CREATE POLICY "ann select all" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "ann aux+ insert" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.is_aux_plus(auth.uid()) AND auth.uid() = author_id);
CREATE POLICY "ann aux+ update" ON public.announcements FOR UPDATE TO authenticated
  USING (public.is_aux_plus(auth.uid()));
CREATE POLICY "ann aux+ delete" ON public.announcements FOR DELETE TO authenticated
  USING (public.is_aux_plus(auth.uid()));

-- announcement_reads: user logs own reads; aux+ can see all
CREATE POLICY "reads select self or aux+" ON public.announcement_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_aux_plus(auth.uid()));
CREATE POLICY "reads insert self" ON public.announcement_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- hall of fame
CREATE POLICY "hof select all" ON public.hall_of_fame FOR SELECT TO authenticated USING (true);
CREATE POLICY "hof insert self" ON public.hall_of_fame FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);
CREATE POLICY "hof delete self/aux+" ON public.hall_of_fame FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.is_aux_plus(auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.interactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.interaction_winners;
ALTER PUBLICATION supabase_realtime ADD TABLE public.points_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_reads;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('hall-of-fame','hall-of-fame', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "hof bucket public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'hall-of-fame');
CREATE POLICY "hof bucket auth upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hall-of-fame');
CREATE POLICY "hof bucket auth delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'hall-of-fame' AND owner = auth.uid());
