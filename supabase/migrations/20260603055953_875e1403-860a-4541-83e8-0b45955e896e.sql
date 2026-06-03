ALTER TABLE public.squads ADD COLUMN is_public boolean NOT NULL DEFAULT false;

CREATE POLICY "authenticated users can view public squads"
ON public.squads
FOR SELECT
TO authenticated
USING (is_public = true AND is_snapshot = false);