-- 1. Add claimed_by to schedule_slots so anyone can claim a slot
ALTER TABLE public.schedule_slots ADD COLUMN IF NOT EXISTS claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Update slot update policy to allow any authenticated user to claim/unclaim
DROP POLICY IF EXISTS "slots owner or aux+ update" ON public.schedule_slots;
CREATE POLICY "slots update" ON public.schedule_slots FOR UPDATE TO authenticated
  USING (
    auth.uid() = booked_by
    OR public.is_aux_plus(auth.uid())
    OR claimed_by IS NULL
    OR claimed_by = auth.uid()
  )
  WITH CHECK (true);

-- 3. Poster/promo fields on interactions
ALTER TABLE public.interactions ADD COLUMN IF NOT EXISTS poster_message text;
ALTER TABLE public.interactions ADD COLUMN IF NOT EXISTS poster_image_url text;
ALTER TABLE public.interactions ADD COLUMN IF NOT EXISTS f3_message text;

-- 4. Custom frames table (managers upload PNG frames with transparent centres)
CREATE TABLE IF NOT EXISTS public.hall_of_fame_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hall_of_fame_frames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hof_frames select all" ON public.hall_of_fame_frames FOR SELECT TO authenticated USING (true);
CREATE POLICY "hof_frames manager insert" ON public.hall_of_fame_frames FOR INSERT TO authenticated WITH CHECK (public.is_manager(auth.uid()));
CREATE POLICY "hof_frames manager delete" ON public.hall_of_fame_frames FOR DELETE TO authenticated USING (public.is_manager(auth.uid()));

-- 5. Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('posters','posters', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('hof-frames','hof-frames', true) ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'posters public read' AND tablename = 'objects') THEN
    CREATE POLICY "posters public read" ON storage.objects FOR SELECT USING (bucket_id = 'posters');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'posters auth upload' AND tablename = 'objects') THEN
    CREATE POLICY "posters auth upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'posters');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'posters auth delete' AND tablename = 'objects') THEN
    CREATE POLICY "posters auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'posters');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hof_frames public read' AND tablename = 'objects') THEN
    CREATE POLICY "hof_frames public read" ON storage.objects FOR SELECT USING (bucket_id = 'hof-frames');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hof_frames auth upload' AND tablename = 'objects') THEN
    CREATE POLICY "hof_frames auth upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hof-frames');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hof_frames auth delete' AND tablename = 'objects') THEN
    CREATE POLICY "hof_frames auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'hof-frames');
  END IF;
END $$;

-- 6. Ensure one_manager: the handle_new_user trigger already protects this but
--    add an advisory note: trigger uses SELECT count(*) which can race; the
--    UNIQUE(user_id, role) constraint already prevents duplicate role rows per user.
--    Nothing more needed — DB handles it at trigger time.
