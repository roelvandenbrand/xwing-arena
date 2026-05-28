import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Schemas for bulk import ----------

const shipSchema = z.object({
  xws: z.string().min(1),
  name: z.string().min(1),
  faction: z.array(z.string()).default([]),
  attack: z.number().int().nullable().optional(),
  agility: z.number().int().nullable().optional(),
  hull: z.number().int().nullable().optional(),
  shields: z.number().int().nullable().optional(),
  actions: z.array(z.string()).default([]),
  firing_arcs: z.array(z.string()).default([]),
  maneuvers: z.any().optional(),
  dial: z.array(z.string()).default([]),
  size: z.string().nullable().optional(),
  legacy_id: z.number().int().nullable().optional(),
});

const pilotSchema = z.object({
  xws: z.string().min(1),
  name: z.string().min(1),
  faction: z.string().min(1),
  ship_xws: z.string().min(1),
  skill: z.number().int().default(0),
  points: z.number().int().default(0),
  unique_pilot: z.boolean().default(false),
  slots: z.array(z.string()).default([]),
  text: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  legacy_id: z.number().int().nullable().optional(),
});

// Bulk-import accepts the upstream JSON shape: ship by name, `unique`, numeric `id`.
const pilotImportSchema = z.object({
  xws: z.string().min(1),
  name: z.string().min(1),
  faction: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  ship_xws: z.string().min(1).optional(),
  ship: z.string().min(1).optional(),
  skill: z.number().int().default(0),
  points: z.number().int().default(0),
  unique_pilot: z.boolean().optional(),
  unique: z.boolean().optional(),
  slots: z.array(z.string()).default([]),
  text: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  legacy_id: z.number().int().nullable().optional(),
  id: z.number().int().nullable().optional(),
});

const upgradeSchema = z.object({
  xws: z.string().min(1),
  name: z.string().min(1),
  slot: z.string().min(1),
  points: z.number().int().default(0),
  attack: z.number().int().nullable().optional(),
  range: z.string().nullable().optional(),
  text: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  legacy_id: z.number().int().nullable().optional(),
});

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");
  if (!data || data.length === 0) throw new Error("Admin only");
}

// ---------- Bulk import ----------

export const importShips = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ items: z.array(shipSchema).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("ships")
      .upsert(data.items, { onConflict: "xws" });
    if (error) throw new Error(error.message);
    return { ok: true, count: data.items.length };
  });

export const importPilots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ items: z.array(pilotImportSchema).max(5000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    // Build ship name -> xws lookup so imports can reference ships by display name.
    const { data: ships, error: shipsErr } = await context.supabase
      .from("ships")
      .select("xws,name");
    if (shipsErr) throw new Error(shipsErr.message);
    const byName = new Map<string, string>();
    const byXws = new Set<string>();
    for (const s of ships ?? []) {
      byName.set(s.name.toLowerCase(), s.xws);
      byXws.add(s.xws);
    }

    const normalized = data.items.map((p) => {
      const rawShip = p.ship_xws ?? p.ship ?? "";
      let ship_xws = rawShip;
      if (ship_xws && !byXws.has(ship_xws)) {
        const mapped = byName.get(ship_xws.toLowerCase());
        if (mapped) ship_xws = mapped;
      }
      if (!ship_xws) {
        throw new Error(`Pilot "${p.name}" is missing a ship reference`);
      }
      if (!byXws.has(ship_xws) && !byName.has(rawShip.toLowerCase())) {
        throw new Error(`Ship "${rawShip}" not found for pilot "${p.name}". Import ships first.`);
      }
      return {
        xws: p.xws,
        name: p.name,
        faction: Array.isArray(p.faction) ? p.faction[0] : p.faction,
        ship_xws,
        skill: p.skill,
        points: p.points,
        unique_pilot: p.unique_pilot ?? p.unique ?? false,
        slots: p.slots,
        text: p.text ?? null,
        image: p.image ?? null,
        legacy_id: p.legacy_id ?? p.id ?? null,
      };
    });

    const { error } = await context.supabase
      .from("pilots")
      .upsert(normalized, { onConflict: "xws" });
    if (error) throw new Error(error.message);
    return { ok: true, count: normalized.length };
  });

export const importUpgrades = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ items: z.array(upgradeSchema).max(5000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("upgrades")
      .upsert(data.items, { onConflict: "xws" });
    if (error) throw new Error(error.message);
    return { ok: true, count: data.items.length };
  });

// ---------- List ----------

export const listShips = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ships")
      .select("*")
      .order("name");
    if (error) throw new Error(error.message);
    return { ships: data ?? [] };
  });

export const listPilots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("pilots")
      .select("*")
      .order("faction")
      .order("skill", { ascending: false })
      .order("name");
    if (error) throw new Error(error.message);
    return { pilots: data ?? [] };
  });

export const listUpgrades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("upgrades")
      .select("*")
      .order("slot")
      .order("name");
    if (error) throw new Error(error.message);
    return { upgrades: data ?? [] };
  });

// ---------- Update single record (admin) ----------

export const updateShip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ xws: z.string(), patch: shipSchema.partial() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("ships")
      .update(data.patch)
      .eq("xws", data.xws);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updatePilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ xws: z.string(), patch: pilotSchema.partial() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("pilots")
      .update(data.patch)
      .eq("xws", data.xws);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateUpgrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ xws: z.string(), patch: upgradeSchema.partial() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("upgrades")
      .update(data.patch)
      .eq("xws", data.xws);
    if (error) throw new Error(error.message);
    return { ok: true };
  });