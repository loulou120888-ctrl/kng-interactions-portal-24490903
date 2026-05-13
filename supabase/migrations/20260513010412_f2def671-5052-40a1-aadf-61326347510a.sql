
-- Interactions: drop location, add poster fields
ALTER TABLE public.interactions DROP COLUMN IF EXISTS location;
ALTER TABLE public.interactions
  ADD COLUMN IF NOT EXISTS poster_message text,
  ADD COLUMN IF NOT EXISTS poster_image_url text,
  ADD COLUMN IF NOT EXISTS f3_message text;

-- Schedule slots: add claimed_by
ALTER TABLE public.schedule_slots
  ADD COLUMN IF NOT EXISTS claimed_by uuid;

-- Custom Hall of Fame frames
CREATE TABLE IF NOT EXISTS public.hall_of_fame_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hall_of_fame_frames ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "frames select all" ON public.hall_of_fame_frames;
CREATE POLICY "frames select all" ON public.hall_of_fame_frames
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "frames manager insert" ON public.hall_of_fame_frames;
CREATE POLICY "frames manager insert" ON public.hall_of_fame_frames
  FOR INSERT TO authenticated
  WITH CHECK (public.is_manager(auth.uid()) AND auth.uid() = created_by);

DROP POLICY IF EXISTS "frames manager delete" ON public.hall_of_fame_frames;
CREATE POLICY "frames manager delete" ON public.hall_of_fame_frames
  FOR DELETE TO authenticated USING (public.is_manager(auth.uid()));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('posters', 'posters', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('hof-frames', 'hof-frames', true)
  ON CONFLICT (id) DO NOTHING;

-- Posters bucket policies: public read, authed users upload to their own folder
DROP POLICY IF EXISTS "posters public read" ON storage.objects;
CREATE POLICY "posters public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'posters');

DROP POLICY IF EXISTS "posters authed insert own folder" ON storage.objects;
CREATE POLICY "posters authed insert own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'posters' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "posters owner delete" ON storage.objects;
CREATE POLICY "posters owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'posters' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Hall of fame frames bucket policies: public read, manager-only upload/delete
DROP POLICY IF EXISTS "hof-frames public read" ON storage.objects;
CREATE POLICY "hof-frames public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'hof-frames');

DROP POLICY IF EXISTS "hof-frames manager insert" ON storage.objects;
CREATE POLICY "hof-frames manager insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hof-frames' AND public.is_manager(auth.uid()));

DROP POLICY IF EXISTS "hof-frames manager delete" ON storage.objects;
CREATE POLICY "hof-frames manager delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'hof-frames' AND public.is_manager(auth.uid()));
