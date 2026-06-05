ALTER TABLE public.ships
  ADD COLUMN IF NOT EXISTS image text,
  ADD COLUMN IF NOT EXISTS dial_image text;