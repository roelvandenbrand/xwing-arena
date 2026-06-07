CREATE TABLE public.user_singles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('ship','pilot','upgrade')),
  xws text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 0 AND quantity <= 999),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, xws)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_singles TO authenticated;
GRANT ALL ON public.user_singles TO service_role;

ALTER TABLE public.user_singles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own singles" ON public.user_singles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "users insert own singles" ON public.user_singles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users update own singles" ON public.user_singles
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users delete own singles" ON public.user_singles
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_user_singles_updated_at BEFORE UPDATE ON public.user_singles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();