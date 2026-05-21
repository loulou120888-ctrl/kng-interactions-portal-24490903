-- Recurring schedule templates: slots that auto-appear every week on a given day/time
CREATE TABLE IF NOT EXISTS public.recurring_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_type public.schedule_type NOT NULL,
  day_of_week   smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  slot_index    smallint NOT NULL CHECK (slot_index BETWEEN 0 AND 47),
  department    public.department NOT NULL,
  title         text NOT NULL,
  notes         text,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read recurring" ON public.recurring_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "staff manage recurring" ON public.recurring_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
