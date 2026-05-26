CREATE TYPE public.xwing_faction AS ENUM ('imperial', 'rebel', 'scum');

ALTER TABLE public.games
  ADD COLUMN player1_faction public.xwing_faction,
  ADD COLUMN player2_faction public.xwing_faction;