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
  .inputValidator((d) => z.object({ items: z.array(pilotSchema).max(5000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("pilots")
      .upsert(data.items, { onConflict: "xws" });
    if (error) throw new Error(error.message);
    return { ok: true, count: data.items.length };
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