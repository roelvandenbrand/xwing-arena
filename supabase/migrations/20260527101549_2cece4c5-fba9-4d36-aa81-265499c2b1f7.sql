
-- =========== Catalog tables ===========

CREATE TABLE public.ships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  xws text NOT NULL UNIQUE,
  name text NOT NULL,
  faction text[] NOT NULL DEFAULT '{}',
  attack int,
  agility int,
  hull int,
  shields int,
  actions text[] NOT NULL DEFAULT '{}',
  firing_arcs text[] NOT NULL DEFAULT '{}',
  maneuvers jsonb,
  dial text[] NOT NULL DEFAULT '{}',
  size text,
  legacy_id int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ships TO authenticated;
GRANT ALL ON public.ships TO service_role;
ALTER TABLE public.ships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ships readable by authenticated" ON public.ships FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins insert ships" ON public.ships FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update ships" ON public.ships FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete ships" ON public.ships FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TABLE public.pilots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  xws text NOT NULL UNIQUE,
  name text NOT NULL,
  faction text NOT NULL,
  ship_xws text NOT NULL REFERENCES public.ships(xws) ON UPDATE CASCADE,
  skill int NOT NULL DEFAULT 0,
  points int NOT NULL DEFAULT 0,
  unique_pilot boolean NOT NULL DEFAULT false,
  slots text[] NOT NULL DEFAULT '{}',
  text text,
  image text,
  legacy_id int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pilots_ship_xws ON public.pilots(ship_xws);
CREATE INDEX idx_pilots_faction ON public.pilots(faction);
GRANT SELECT ON public.pilots TO authenticated;
GRANT ALL ON public.pilots TO service_role;
ALTER TABLE public.pilots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pilots readable by authenticated" ON public.pilots FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins insert pilots" ON public.pilots FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update pilots" ON public.pilots FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete pilots" ON public.pilots FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TABLE public.upgrades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  xws text NOT NULL UNIQUE,
  name text NOT NULL,
  slot text NOT NULL,
  points int NOT NULL DEFAULT 0,
  attack int,
  range text,
  text text,
  image text,
  legacy_id int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_upgrades_slot ON public.upgrades(slot);
GRANT SELECT ON public.upgrades TO authenticated;
GRANT ALL ON public.upgrades TO service_role;
ALTER TABLE public.upgrades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "upgrades readable by authenticated" ON public.upgrades FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins insert upgrades" ON public.upgrades FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update upgrades" ON public.upgrades FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete upgrades" ON public.upgrades FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- =========== Squads (user-owned) ===========

CREATE TABLE public.squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  faction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_squads_user ON public.squads(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.squads TO authenticated;
GRANT ALL ON public.squads TO service_role;
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "squads owner or admin select" ON public.squads FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "squads owner insert" ON public.squads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "squads owner or admin update" ON public.squads FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "squads owner or admin delete" ON public.squads FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE TABLE public.squad_pilots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  pilot_xws text NOT NULL REFERENCES public.pilots(xws) ON UPDATE CASCADE,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_squad_pilots_squad ON public.squad_pilots(squad_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.squad_pilots TO authenticated;
GRANT ALL ON public.squad_pilots TO service_role;
ALTER TABLE public.squad_pilots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "squad_pilots via squad" ON public.squad_pilots FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.squads s WHERE s.id = squad_id AND (s.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))));
CREATE POLICY "squad_pilots insert via owned squad" ON public.squad_pilots FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.squads s WHERE s.id = squad_id AND s.user_id = auth.uid()));
CREATE POLICY "squad_pilots update via owned squad" ON public.squad_pilots FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.squads s WHERE s.id = squad_id AND (s.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))));
CREATE POLICY "squad_pilots delete via owned squad" ON public.squad_pilots FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.squads s WHERE s.id = squad_id AND (s.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))));

CREATE TABLE public.squad_pilot_upgrades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_pilot_id uuid NOT NULL REFERENCES public.squad_pilots(id) ON DELETE CASCADE,
  upgrade_xws text NOT NULL REFERENCES public.upgrades(xws) ON UPDATE CASCADE,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_spu_pilot ON public.squad_pilot_upgrades(squad_pilot_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.squad_pilot_upgrades TO authenticated;
GRANT ALL ON public.squad_pilot_upgrades TO service_role;
ALTER TABLE public.squad_pilot_upgrades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spu via squad" ON public.squad_pilot_upgrades FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.squad_pilots sp
    JOIN public.squads s ON s.id = sp.squad_id
    WHERE sp.id = squad_pilot_id AND (s.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  ));
CREATE POLICY "spu insert via owned squad" ON public.squad_pilot_upgrades FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.squad_pilots sp
    JOIN public.squads s ON s.id = sp.squad_id
    WHERE sp.id = squad_pilot_id AND s.user_id = auth.uid()
  ));
CREATE POLICY "spu update via owned squad" ON public.squad_pilot_upgrades FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.squad_pilots sp
    JOIN public.squads s ON s.id = sp.squad_id
    WHERE sp.id = squad_pilot_id AND (s.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  ));
CREATE POLICY "spu delete via owned squad" ON public.squad_pilot_upgrades FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.squad_pilots sp
    JOIN public.squads s ON s.id = sp.squad_id
    WHERE sp.id = squad_pilot_id AND (s.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  ));

-- =========== updated_at triggers ===========

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER ships_touch BEFORE UPDATE ON public.ships FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER pilots_touch BEFORE UPDATE ON public.pilots FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER upgrades_touch BEFORE UPDATE ON public.upgrades FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER squads_touch BEFORE UPDATE ON public.squads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========== Games: link to saved squads ===========

ALTER TABLE public.games
  ADD COLUMN player1_squad_id uuid REFERENCES public.squads(id) ON DELETE SET NULL,
  ADD COLUMN player2_squad_id uuid REFERENCES public.squads(id) ON DELETE SET NULL;
