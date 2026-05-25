
create type public.app_role as enum ('admin', 'player');
create type public.competition_status as enum ('draft', 'open', 'running', 'finished');
create type public.member_status as enum ('pending', 'approved', 'rejected');
create type public.game_status as enum ('pending', 'confirmed', 'rejected');
create type public.rules_version as enum ('1.0', '2.0', '2.5');

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles readable by authenticated" on public.profiles
  for select to authenticated using (true);
create policy "users can insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "users can update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- user_roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users can read own roles" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- competitions
create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  rules_version public.rules_version not null default '1.0',
  squad_points_limit integer not null default 100 check (squad_points_limit > 0),
  status public.competition_status not null default 'draft',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
alter table public.competitions enable row level security;

-- competition_members (created before the helper function that references it)
create table public.competition_members (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.member_status not null default 'pending',
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id),
  unique (competition_id, user_id)
);
alter table public.competition_members enable row level security;

create or replace function public.is_competition_member(_user_id uuid, _competition_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.competition_members
    where competition_id = _competition_id and user_id = _user_id and status = 'approved'
  )
$$;

-- competitions policies (now that helper exists)
create policy "competitions visible to members, admins, or open" on public.competitions
  for select to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or public.is_competition_member(auth.uid(), id)
    or status = 'open'
  );
create policy "admins insert competitions" on public.competitions
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "admins update competitions" on public.competitions
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins delete competitions" on public.competitions
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- competition_members policies
create policy "members visible to admins, fellow members, or self" on public.competition_members
  for select to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or user_id = auth.uid()
    or public.is_competition_member(auth.uid(), competition_id)
  );
create policy "users request to join open/running comps" on public.competition_members
  for insert to authenticated
  with check (
    user_id = auth.uid() and status = 'pending'
    and exists (select 1 from public.competitions c where c.id = competition_id and c.status in ('open','running'))
  );
create policy "admins update members" on public.competition_members
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins delete members" on public.competition_members
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- games
create table public.games (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  player1_id uuid not null references auth.users(id),
  player2_id uuid not null references auth.users(id),
  player1_squad_text text not null default '',
  player2_squad_text text not null default '',
  player1_squad_ref uuid,
  player2_squad_ref uuid,
  player1_points integer not null check (player1_points >= 0),
  player2_points integer not null check (player2_points >= 0),
  winner_id uuid references auth.users(id),
  is_draw boolean not null default false,
  status public.game_status not null default 'pending',
  reported_by uuid not null references auth.users(id),
  confirmed_by uuid references auth.users(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  check (player1_id <> player2_id)
);
create index games_competition_idx on public.games(competition_id);
alter table public.games enable row level security;

create or replace function public.set_game_winner()
returns trigger language plpgsql as $$
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
create trigger trg_set_game_winner
  before insert or update of player1_points, player2_points on public.games
  for each row execute function public.set_game_winner();

create policy "games visible to admins and approved members" on public.games
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.is_competition_member(auth.uid(), competition_id));

create policy "approved members log games" on public.games
  for insert to authenticated
  with check (
    reported_by = auth.uid()
    and (auth.uid() = player1_id or auth.uid() = player2_id)
    and public.is_competition_member(auth.uid(), competition_id)
    and exists (select 1 from public.competitions c where c.id = competition_id and c.status in ('running','finished'))
    and public.is_competition_member(player1_id, competition_id)
    and public.is_competition_member(player2_id, competition_id)
  );

create policy "opponent or admin updates game" on public.games
  for update to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or (auth.uid() in (player1_id, player2_id) and auth.uid() <> reported_by)
  );

create policy "admins delete games" on public.games
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
