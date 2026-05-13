ALTER TABLE public.hall_of_fame_frames
  ADD COLUMN IF NOT EXISTS region_x numeric,
  ADD COLUMN IF NOT EXISTS region_y numeric,
  ADD COLUMN IF NOT EXISTS region_w numeric,
  ADD COLUMN IF NOT EXISTS region_h numeric;