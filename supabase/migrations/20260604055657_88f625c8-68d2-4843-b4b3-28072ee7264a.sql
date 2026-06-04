-- packages
CREATE TABLE public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  xws text NOT NULL UNIQUE,
  name text NOT NULL,
  wave text,
  release_date date,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packages TO authenticated;
GRANT ALL ON public.packages TO service_role;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packages readable by authenticated" ON public.packages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins insert packages" ON public.packages
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins update packages" ON public.packages
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins delete packages" ON public.packages
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER packages_touch_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- package_ships
CREATE TABLE public.package_ships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  ship_xws text NOT NULL REFERENCES public.ships(xws) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, ship_xws)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.package_ships TO authenticated;
GRANT ALL ON public.package_ships TO service_role;
ALTER TABLE public.package_ships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "package_ships readable" ON public.package_ships
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage package_ships insert" ON public.package_ships
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage package_ships update" ON public.package_ships
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage package_ships delete" ON public.package_ships
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- package_pilots
CREATE TABLE public.package_pilots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  pilot_xws text NOT NULL REFERENCES public.pilots(xws) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, pilot_xws)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.package_pilots TO authenticated;
GRANT ALL ON public.package_pilots TO service_role;
ALTER TABLE public.package_pilots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "package_pilots readable" ON public.package_pilots
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage package_pilots insert" ON public.package_pilots
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage package_pilots update" ON public.package_pilots
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage package_pilots delete" ON public.package_pilots
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- package_upgrades
CREATE TABLE public.package_upgrades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  upgrade_xws text NOT NULL REFERENCES public.upgrades(xws) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, upgrade_xws)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.package_upgrades TO authenticated;
GRANT ALL ON public.package_upgrades TO service_role;
ALTER TABLE public.package_upgrades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "package_upgrades readable" ON public.package_upgrades
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage package_upgrades insert" ON public.package_upgrades
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage package_upgrades update" ON public.package_upgrades
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage package_upgrades delete" ON public.package_upgrades
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- user_packages
CREATE TABLE public.user_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  acquired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, package_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_packages TO authenticated;
GRANT ALL ON public.user_packages TO service_role;
ALTER TABLE public.user_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own packages" ON public.user_packages
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "users insert own packages" ON public.user_packages
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users update own packages" ON public.user_packages
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users delete own packages" ON public.user_packages
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER user_packages_touch_updated_at
  BEFORE UPDATE ON public.user_packages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX user_packages_user_idx ON public.user_packages(user_id);
CREATE INDEX package_ships_package_idx ON public.package_ships(package_id);
CREATE INDEX package_pilots_package_idx ON public.package_pilots(package_id);
CREATE INDEX package_upgrades_package_idx ON public.package_upgrades(package_id);