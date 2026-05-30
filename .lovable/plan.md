## 1. Faction grouping (Imperial ↔ First Order, Rebel ↔ Resistance)

Pilots store `faction` as a free-text label (e.g. `"Galactic Empire"`, `"First Order"`, `"Rebel Alliance"`, `"Resistance"`, `"Scum and Villainy"`). Today the squad builder filters pilots by an exact match to a single label, so cross-faction mixing is impossible.

- Introduce a `FACTION_GROUPS` map (frontend):
  - `imperial` → `["Galactic Empire", "First Order"]`
  - `rebel` → `["Rebel Alliance", "Resistance"]`
  - `scum` → `["Scum and Villainy"]`
- In `squads.$id.tsx`, replace the single-label filter with a group-membership check using this map. This affects:
  - the faction → pilots filter in `SquadDetail`
  - the ship list in `AddPilotDialog` (ships that have at least one pilot in the squad's faction group)
- Leave the existing 3-value `FACTIONS` export untouched (games still use the short code). Only the catalog filter logic changes.

No DB migration required — pilots keep their existing faction label.

## 2. Bigger pilot card + slots in two rows

In `squads.$id.tsx`, for each `squadPilots` entry:

- Render pilot image roughly 3× current size (`h-24` → ~`h-72`, with `max-w-[18rem]`), aligned left.
- To the right of the pilot image, render the slots grid as a 2-row, multi-column flex/grid (e.g. `grid-cols-[repeat(auto-fill,minmax(180px,1fr))] grid-rows-2 auto-flow-column` — actual layout chosen to fit the slot count cleanly with wrapping).
- Pilot name / stats stay above the slot grid in the right column.

## 3. Bigger upgrade thumbnails with hover-to-read full text

For filled slots:
- Upgrade thumbnail roughly 2× current (`h-12` → ~`h-24`, width auto).
- Wrap the upgrade row in `HoverCard` (shadcn) — `HoverCardTrigger` is the thumbnail/name; `HoverCardContent` shows the upgrade card text (`u.text`, rendered via `dangerouslySetInnerHTML` since text is HTML per the admin form), name, slot, and points.

## 4. Slot-aware upgrade filtering by faction + ship

`AddUpgradeForSlotDialog` already filters by `slot`. Extend the filter:

- Pass the squad's faction code and the pilot's `ship_xws` into the dialog.
- Keep an upgrade if **all** of the following hold:
  - `u.slot === slot`
  - `!u.faction` OR `u.faction` is in the squad's faction group (using the same `FACTION_GROUPS` map)
  - `!u.ship_xws` OR `u.ship_xws === pilot.ship_xws`

## 5. New upgrade fields: `faction`, `ship_xws`, `grants[]`

Add three nullable columns to `public.upgrades`:

- `faction text` — single faction label this upgrade is restricted to (e.g. `"First Order"`), null = any
- `ship_xws text` — single ship this upgrade is restricted to, null = any
- `grants text[] default '{}'` — list of extra slot names this upgrade grants when equipped

Migration:

```sql
ALTER TABLE public.upgrades
  ADD COLUMN IF NOT EXISTS faction text,
  ADD COLUMN IF NOT EXISTS ship_xws text,
  ADD COLUMN IF NOT EXISTS grants text[] NOT NULL DEFAULT '{}';
```

Update `upgradeSchema` in `src/lib/catalog.functions.ts` to include the new optional fields so `updateUpgrade` / `importUpgrades` accept them.

## 6. Admin "Edit upgrade" UI

In `admin.catalog.tsx` upgrade edit dialog, add:

- **Faction restriction** — `<select>` with options: *Any*, `Galactic Empire`, `First Order`, `Rebel Alliance`, `Resistance`, `Scum and Villainy`. *Any* writes `null`.
- **Ship restriction** — searchable select sourced from `listShips`, with an *Any* option that writes `null`.
- **Grants extra slots** — multi-select / checkbox group over a known slot list (Astromech, Cannon, Crew, Device, Force Power, Gunner, Hardpoint, Illicit, Missile, Modification, Sensor, Talent, Tech, Title, Torpedo, Turret). Stored as `text[]`.

Wire these three fields into the `updateUpgrade` patch payload.

## 7. Slots granted by upgrades show up in the builder

When computing the slot list for a pilot in `squads.$id.tsx`, concatenate:

- `pilot.slots` (base)
- For each equipped upgrade on this pilot: append `upgrade.grants` (in equip order).

The combined list drives the slot grid rendering. Granted slots use the same slot-aware upgrade filter from §4. Removing an upgrade that granted slots also removes any upgrades occupying those granted slots (cascade by trimming to the new slot length; entries beyond the new length are deleted via `removeUpgradeFromPilot`).

## Technical notes

- Files touched:
  - `src/routes/_authenticated/squads.$id.tsx` — faction grouping, layout, hover card, slot filtering, granted-slot handling
  - `src/routes/_authenticated/admin.catalog.tsx` — upgrade edit dialog (faction / ship / grants)
  - `src/lib/catalog.functions.ts` — extend `upgradeSchema`
  - New migration adding `faction`, `ship_xws`, `grants` to `public.upgrades`
- No changes to RLS or games. No changes to the squad's stored `faction` column (still the short code).
- `HoverCard` is already a shadcn component in the project (`src/components/ui/hover-card.tsx`).

## Open question

The slot list in §6 is hard-coded. Is the list above complete, or should I derive it dynamically from all distinct `slot` values currently in the `upgrades` table?
