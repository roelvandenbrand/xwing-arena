-- Fix: Add WITH CHECK to games update policy and enforce immutable fields via trigger
DROP POLICY IF EXISTS "opponent or admin updates game" ON public.games;

CREATE POLICY "opponent or admin updates game"
ON public.games
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (((auth.uid() = player1_id) OR (auth.uid() = player2_id)) AND (auth.uid() <> reported_by))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (((auth.uid() = player1_id) OR (auth.uid() = player2_id)) AND (auth.uid() <> reported_by))
);

-- Trigger to restrict non-admin opponents to only changing confirmation/status fields
CREATE OR REPLACE FUNCTION public.enforce_game_update_restrictions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Non-admin updaters (the opponent) may only change status / confirmation fields.
  IF NEW.competition_id   IS DISTINCT FROM OLD.competition_id
     OR NEW.player1_id     IS DISTINCT FROM OLD.player1_id
     OR NEW.player2_id     IS DISTINCT FROM OLD.player2_id
     OR NEW.reported_by    IS DISTINCT FROM OLD.reported_by
     OR NEW.player1_points IS DISTINCT FROM OLD.player1_points
     OR NEW.player2_points IS DISTINCT FROM OLD.player2_points
     OR NEW.player1_squad_id   IS DISTINCT FROM OLD.player1_squad_id
     OR NEW.player2_squad_id   IS DISTINCT FROM OLD.player2_squad_id
     OR NEW.player1_squad_ref  IS DISTINCT FROM OLD.player1_squad_ref
     OR NEW.player2_squad_ref  IS DISTINCT FROM OLD.player2_squad_ref
     OR NEW.player1_squad_text IS DISTINCT FROM OLD.player1_squad_text
     OR NEW.player2_squad_text IS DISTINCT FROM OLD.player2_squad_text
     OR NEW.player1_faction IS DISTINCT FROM OLD.player1_faction
     OR NEW.player2_faction IS DISTINCT FROM OLD.player2_faction
     OR NEW.winner_id IS DISTINCT FROM OLD.winner_id
     OR NEW.is_draw IS DISTINCT FROM OLD.is_draw
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Only status and confirmation fields may be updated by the opponent';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS games_enforce_update_restrictions ON public.games;
CREATE TRIGGER games_enforce_update_restrictions
BEFORE UPDATE ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.enforce_game_update_restrictions();