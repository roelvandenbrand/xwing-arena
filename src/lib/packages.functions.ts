import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const packageSchema = z.object({
  xws: z.string().min(1).max(120).regex(/^[a-z0-9_-]+$/i, "xws must be alphanumeric, dashes, underscores"),
  name: z.string().min(1).max(200),
  wave: z.string().max(100).nullable().optional(),
  release_date: z.string().nullable().optional(), // ISO date string
  image: z.string().max(500).nullable().optional(),
});

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");
  if (!data || data.length === 0) throw new Error("Admin only");
}

// ---------- Packages list ----------

export const listPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: packages, error } = await supabase
      .from("packages")
      .select("*")
      .order("wave", { ascending: true, nullsFirst: false })
      .order("name");
    if (error) throw new Error(error.message);
    const ids = (packages ?? []).map((p: any) => p.id);
    if (ids.length === 0) return { packages: [] };

    const [{ data: ships }, { data: pilots }, { data: upgrades }] = await Promise.all([
      supabase.from("package_ships").select("package_id, quantity").in("package_id", ids),
      supabase.from("package_pilots").select("package_id, quantity").in("package_id", ids),
      supabase.from("package_upgrades").select("package_id, quantity").in("package_id", ids),
    ]);

    const counts = new Map<string, { ships: number; pilots: number; upgrades: number }>();
    for (const id of ids) counts.set(id, { ships: 0, pilots: 0, upgrades: 0 });
    for (const r of ships ?? []) counts.get(r.package_id)!.ships += r.quantity;
    for (const r of pilots ?? []) counts.get(r.package_id)!.pilots += r.quantity;
    for (const r of upgrades ?? []) counts.get(r.package_id)!.upgrades += r.quantity;

    return {
      packages: (packages ?? []).map((p: any) => ({
        ...p,
        ship_count: counts.get(p.id)!.ships,
        pilot_count: counts.get(p.id)!.pilots,
        upgrade_count: counts.get(p.id)!.upgrades,
      })),
    };
  });

export const getPackage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: pkg, error } = await supabase
      .from("packages")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pkg) throw new Error("Package not found");

    const [{ data: ships }, { data: pilots }, { data: upgrades }] = await Promise.all([
      supabase.from("package_ships").select("*").eq("package_id", pkg.id),
      supabase.from("package_pilots").select("*").eq("package_id", pkg.id),
      supabase.from("package_upgrades").select("*").eq("package_id", pkg.id),
    ]);

    return {
      pkg,
      ships: ships ?? [],
      pilots: pilots ?? [],
      upgrades: upgrades ?? [],
    };
  });

// ---------- Admin write ----------

export const createPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => packageSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("packages")
      .insert({
        xws: data.xws,
        name: data.name,
        wave: data.wave ?? null,
        release_date: data.release_date || null,
        image: data.image ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updatePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), patch: packageSchema.partial() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const patch: Record<string, unknown> = { ...data.patch };
    if ("release_date" in patch && !patch.release_date) patch.release_date = null;
    const { error } = await context.supabase
      .from("packages")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("packages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Contents (admin) ----------

const contentInput = z.object({
  package_id: z.string().uuid(),
  xws: z.string().min(1).max(120),
  quantity: z.number().int().min(1).max(99),
});

function tableFor(kind: "ship" | "pilot" | "upgrade") {
  if (kind === "ship") return { table: "package_ships", col: "ship_xws" } as const;
  if (kind === "pilot") return { table: "package_pilots", col: "pilot_xws" } as const;
  return { table: "package_upgrades", col: "upgrade_xws" } as const;
}

export const setPackageContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ kind: z.enum(["ship", "pilot", "upgrade"]), ...contentInput.shape }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { table, col } = tableFor(data.kind);
    const { error } = await context.supabase
      .from(table)
      .upsert(
        { package_id: data.package_id, [col]: data.xws, quantity: data.quantity },
        { onConflict: `package_id,${col}` },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePackageContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        kind: z.enum(["ship", "pilot", "upgrade"]),
        package_id: z.string().uuid(),
        xws: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { table, col } = tableFor(data.kind);
    const { error } = await context.supabase
      .from(table)
      .delete()
      .eq("package_id", data.package_id)
      .eq(col, data.xws);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- User ownership ----------

export const listMyOwnership = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_packages")
      .select("package_id, quantity, acquired_at")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ownership: data ?? [] };
  });

export const setMyPackageQuantity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        package_id: z.string().uuid(),
        quantity: z.number().int().min(0).max(99),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.quantity === 0) {
      const { error } = await supabase
        .from("user_packages")
        .delete()
        .eq("user_id", userId)
        .eq("package_id", data.package_id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await supabase.from("user_packages").upsert(
      {
        user_id: userId,
        package_id: data.package_id,
        quantity: data.quantity,
        acquired_at: new Date().toISOString(),
      },
      { onConflict: "user_id,package_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Derived collection ----------

export type CollectionMap = Record<string, number>;
export type Collection = {
  ships: CollectionMap;
  pilots: CollectionMap;
  upgrades: CollectionMap;
};

export const getMyCollection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ collection: Collection }> => {
    const { supabase, userId } = context;
    const { data: owned, error } = await supabase
      .from("user_packages")
      .select("package_id, quantity")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    const ships: CollectionMap = {};
    const pilots: CollectionMap = {};
    const upgrades: CollectionMap = {};
    if (!owned || owned.length === 0) {
      return { collection: { ships, pilots, upgrades } };
    }

    const packageIds = owned.map((o: any) => o.package_id);
    const qtyByPkg = new Map<string, number>(owned.map((o: any) => [o.package_id, o.quantity]));

    const [{ data: pShips }, { data: pPilots }, { data: pUpgrades }] = await Promise.all([
      supabase.from("package_ships").select("package_id, ship_xws, quantity").in("package_id", packageIds),
      supabase.from("package_pilots").select("package_id, pilot_xws, quantity").in("package_id", packageIds),
      supabase.from("package_upgrades").select("package_id, upgrade_xws, quantity").in("package_id", packageIds),
    ]);

    for (const r of pShips ?? []) {
      const mult = qtyByPkg.get(r.package_id) ?? 0;
      ships[r.ship_xws] = (ships[r.ship_xws] ?? 0) + r.quantity * mult;
    }
    for (const r of pPilots ?? []) {
      const mult = qtyByPkg.get(r.package_id) ?? 0;
      pilots[r.pilot_xws] = (pilots[r.pilot_xws] ?? 0) + r.quantity * mult;
    }
    for (const r of pUpgrades ?? []) {
      const mult = qtyByPkg.get(r.package_id) ?? 0;
      upgrades[r.upgrade_xws] = (upgrades[r.upgrade_xws] ?? 0) + r.quantity * mult;
    }

    return { collection: { ships, pilots, upgrades } };
  });