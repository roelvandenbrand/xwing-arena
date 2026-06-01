
-- Add snapshot flag to squads for game-attached copies
ALTER TABLE public.squads
  ADD COLUMN IF NOT EXISTS is_snapshot boolean NOT NULL DEFAULT false;

-- Prevent owners from deleting snapshot squads (admins still can)
DROP POLICY IF EXISTS "squads owner or admin delete" ON public.squads;
CREATE POLICY "squads owner or admin delete"
ON public.squads
FOR DELETE
TO authenticated
USING (
  ((user_id = auth.uid()) AND (is_snapshot = false))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Allow competition members / admins to view snapshot squads referenced by a game they can see
CREATE POLICY "squads snapshot visible via game"
ON public.squads
FOR SELECT
TO authenticated
USING (
  is_snapshot = true
  AND EXISTS (
    SELECT 1 FROM public.games g
    WHERE (g.player1_squad_id = squads.id OR g.player2_squad_id = squads.id)
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR is_competition_member(auth.uid(), g.competition_id)
      )
  )
);

-- Allow viewing the pilots/upgrades of those snapshot squads as well
CREATE POLICY "squad_pilots snapshot via game"
ON public.squad_pilots
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.squads s
    JOIN public.games g
      ON (g.player1_squad_id = s.id OR g.player2_squad_id = s.id)
    WHERE s.id = squad_pilots.squad_id
      AND s.is_snapshot = true
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR is_competition_member(auth.uid(), g.competition_id)
      )
  )
);

CREATE POLICY "spu snapshot via game"
ON public.squad_pilot_upgrades
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.squad_pilots sp
    JOIN public.squads s ON s.id = sp.squad_id
    JOIN public.games g
      ON (g.player1_squad_id = s.id OR g.player2_squad_id = s.id)
    WHERE sp.id = squad_pilot_upgrades.squad_pilot_id
      AND s.is_snapshot = true
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR is_competition_member(auth.uid(), g.competition_id)
      )
  )
);
