ALTER TABLE public.upgrades
  ADD COLUMN IF NOT EXISTS faction text,
  ADD COLUMN IF NOT EXISTS ship_xws text,
  ADD COLUMN IF NOT EXISTS grants text[] NOT NULL DEFAULT '{}';