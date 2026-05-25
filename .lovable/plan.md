
# X-Wing Competitions App — Plan

## Stack
- TanStack Start (already scaffolded) + Tailwind + shadcn/ui
- Lovable Cloud (Supabase) for auth, DB, RLS
- Email/password auth with self-registration
- React Query for data fetching via server functions

## Roles
- `app_role` enum: `admin`, `player`
- Stored in dedicated `user_roles` table (never on profiles) with `has_role()` security-definer function
- Admin is promoted manually via SQL (I'll provide the snippet to run in the Cloud SQL editor)

## Database Schema

```text
profiles
  id (uuid, FK auth.users, PK)
  display_name, created_at

user_roles
  id, user_id (FK auth.users), role (app_role), unique(user_id, role)

competitions
  id, name, description, rules_version ('1.0'|'2.0'|'2.5', default '1.0'),
  squad_points_limit (int, default 100),
  status ('draft'|'open'|'running'|'finished'),
  created_by (FK auth.users), created_at, started_at, finished_at

competition_members
  id, competition_id, user_id,
  status ('pending'|'approved'|'rejected'),
  requested_at, decided_at, decided_by
  unique(competition_id, user_id)

games
  id, competition_id,
  player1_id, player2_id,
  player1_squad_text, player2_squad_text,
  player1_squad_ref (nullable, future squad-builder FK placeholder),
  player2_squad_ref (nullable),
  player1_points, player2_points,
  winner_id (nullable for draws; computed in trigger),
  is_draw (bool),
  status ('pending'|'confirmed'|'rejected'),
  reported_by, confirmed_by, confirmed_at,
  created_at
```

Game squad columns are split (text now + nullable ref later) so a future data-driven squad builder slots in without migration of existing rows.

## RLS Policies (key rules)
- `profiles`: readable by any authenticated user (needed for member lists)
- `competitions`:
  - SELECT: admin OR approved member OR (status='open' AND authenticated) so players can browse joinable comps
  - INSERT/UPDATE/DELETE: admin only
- `competition_members`:
  - SELECT: admin, or members of the same competition, or own row
  - INSERT: authenticated user inserting own pending row for an open/running competition
  - UPDATE/DELETE: admin only (approve/reject/remove)
- `games`:
  - SELECT: admin or approved member of that competition
  - INSERT: approved member of competition where status in ('running','finished'), and reporter is one of the two players
  - UPDATE: admin, or the *other* player to confirm/reject
  - DELETE: admin only

Helper SQL functions (security definer): `has_role(uid, role)`, `is_competition_member(uid, comp_id)`, `is_competition_admin_or_member(uid, comp_id)`.

## Server Functions (createServerFn)
- `listMyCompetitions`, `listOpenCompetitions`, `getCompetition(id)` (includes members + games)
- `requestJoin(competitionId)`
- Admin: `createCompetition`, `updateCompetition`, `deleteCompetition`, `setCompetitionStatus`, `decideJoinRequest`, `removeMember`, `overrideConfirmGame`
- `logGame({...})`, `confirmGame(gameId)`, `rejectGame(gameId)`

All protected with `requireSupabaseAuth`; admin-only ones check `has_role`.

## Standings
Computed in a server function (modular — single `computeStandings(games, members)` helper) from confirmed games only:
- points = sum of points scored
- played, wins, losses, draws
- Sorted by points desc, then wins, then played asc

Kept as a pure function so ranking rules can be tweaked later (e.g., MoV, SoS).

## Routes (TanStack file-based)
```text
src/routes/
  __root.tsx                    (header nav + auth state)
  index.tsx                     (landing — redirects to /competitions if logged in)
  login.tsx, register.tsx
  _authenticated.tsx            (auth gate)
  _authenticated/
    competitions.tsx            (My competitions)
    browse.tsx                  (Open competitions to join)
    competitions.$id.tsx        (Dashboard: members, leaderboard, games, log-game)
    competitions.$id.log.tsx    (or modal — log a game)
    admin.tsx                   (Admin panel: all comps, pending requests, pending games)
```

Each shareable public route gets its own `head()` metadata.

## UI Components
- `CompetitionCard`, `StatusBadge`, `LeaderboardTable`, `GameRow` (with confirm/reject buttons when applicable)
- `LogGameDialog` (select opponent from roster, enter both squads as textarea, enter both scores)
- `JoinRequestList`, `MemberList` (admin actions inline)
- Responsive: stack on mobile, table on desktop

## Status Transitions (admin)
`draft → open → running → finished` (one-way), enforced in `setCompetitionStatus` server fn. Roster does NOT lock at "running" — admin can still approve late join requests (per your choice). Game logging enabled when status is `running` or `finished`.

## Game Confirmation Flow
1. Player A logs game → row inserted with `status='pending'`, `reported_by=A`
2. Player B sees it in their dashboard "Awaiting your confirmation" section
3. B confirms → `status='confirmed'`, included in standings
4. B rejects → `status='rejected'`, excluded
5. Admin can override-confirm or delete at any time

Only `confirmed` games count toward standings.

## Out of scope (deferred)
- Data-driven squad builder (schema leaves nullable `*_squad_ref` columns ready)
- Email notifications
- Rounds/pairings (free-for-all only)

## Admin bootstrap
After first signup, run this once in the Cloud SQL editor:
```sql
insert into public.user_roles (user_id, role)
values ('<your-auth-user-id>', 'admin');
```
I'll surface a small "Your user ID" snippet in the profile area to make this easy.

## Build order
1. Enable Lovable Cloud + migrations (schema, RLS, helper functions)
2. Auth pages + `_authenticated` gate + role-aware nav
3. Competitions CRUD (admin) + browse/join (player)
4. Competition dashboard: members, join-request approval, leaderboard skeleton
5. Game logging + confirmation flow + standings computation
6. Admin panel aggregating pending requests/games across all comps
7. Polish: responsive pass, empty states, toasts
