
-- set search_path on the trigger function
create or replace function public.set_game_winner()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.player1_points = new.player2_points then
    new.is_draw := true; new.winner_id := null;
  else
    new.is_draw := false;
    new.winner_id := case when new.player1_points > new.player2_points then new.player1_id else new.player2_id end;
  end if;
  return new;
end;
$$;

-- revoke broad execute, grant only to authenticated
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.is_competition_member(uuid, uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_game_winner() from public, anon, authenticated;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_competition_member(uuid, uuid) to authenticated;
