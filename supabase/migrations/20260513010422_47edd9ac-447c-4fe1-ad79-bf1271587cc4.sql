
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivated boolean NOT NULL DEFAULT false;
