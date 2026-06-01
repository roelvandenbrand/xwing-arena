import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMySquads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: squads, error } = await supabase
      .from("squads")
      .select("*")
      .eq("user_id", userId)
      .eq("is_snapshot", false)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (squads ?? []).map((s) => s.id);
    if (ids.length === 0) return { squads: [] };

    const { data: sps } = await supabase
      .from("squad_pilots")
      .select("id, squad_id, pilot_xws")
      .in("squad_id", ids);

    const pilotXws = [...new Set((sps ?? []).map((sp) => sp.pilot_xws))];
    const { data: pilots } = pilotXws.length
      ? await supabase.from("pilots").select("xws, points").in("xws", pilotXws)
      : { data: [] as any[] };
    const pPoints = new Map((pilots ?? []).map((p: any) => [p.xws, p.points]));

    const spIds = (sps ?? []).map((sp) => sp.id);
    const { data: spUps } = spIds.length
      ? await supabase
          .from("squad_pilot_upgrades")
          .select("squad_pilot_id, upgrade_xws")
          .in("squad_pilot_id", spIds)
      : { data: [] as any[] };

    const upXws = [...new Set((spUps ?? []).map((u) => u.upgrade_xws))];
    const { data: upgrades } = upXws.length
      ? await supabase.from("upgrades").select("xws, points").in("xws", upXws)
      : { data: [] as any[] };
    const uPoints = new Map((upgrades ?? []).map((u: any) => [u.xws, u.points]));

    const pilotCountBySquad = new Map<string, number>();
    const pointsBySquad = new Map<string, number>();
    for (const sp of sps ?? []) {
      pilotCountBySquad.set(sp.squad_id, (pilotCountBySquad.get(sp.squad_id) ?? 0) + 1);
      pointsBySquad.set(
        sp.squad_id,
        (pointsBySquad.get(sp.squad_id) ?? 0) + (pPoints.get(sp.pilot_xws) ?? 0),
      );
    }
    const spIdToSquad = new Map((sps ?? []).map((sp) => [sp.id, sp.squad_id]));
    for (const u of spUps ?? []) {
      const sqId = spIdToSquad.get(u.squad_pilot_id);
      if (!sqId) continue;
      pointsBySquad.set(sqId, (pointsBySquad.get(sqId) ?? 0) + (uPoints.get(u.upgrade_xws) ?? 0));
    }

    return {
      squads: (squads ?? []).map((s) => ({
        ...s,
        pilot_count: pilotCountBySquad.get(s.id) ?? 0,
        total_points: pointsBySquad.get(s.id) ?? 0,
      })),
    };
  });

export const getSquad = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: squad, error } = await supabase
      .from("squads")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!squad) throw new Error("Squad not found");

    const { data: sps } = await supabase
      .from("squad_pilots")
      .select("*")
      .eq("squad_id", squad.id)
      .order("position");

    const spIds = (sps ?? []).map((sp) => sp.id);
    const { data: spUps } = spIds.length
      ? await supabase
          .from("squad_pilot_upgrades")
          .select("*")
          .in("squad_pilot_id", spIds)
          .order("position")
      : { data: [] as any[] };

    const isOwner = squad.user_id === userId;
    return { squad, squadPilots: sps ?? [], squadPilotUpgrades: spUps ?? [], isOwner };
  });

export const createSquad = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().min(1).max(120),
        faction: z.string().min(1).max(60),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("squads")
      .insert({ name: data.name, faction: data.faction, user_id: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateSquad = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().min(1).max(120).optional(),
        faction: z.string().min(1).max(60).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: { name?: string; faction?: string } = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.faction !== undefined) patch.faction = data.faction;
    const { error } = await context.supabase
      .from("squads")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSquad = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("squads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateSquad = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: src, error: e1 } = await supabase
      .from("squads")
      .select("*")
      .eq("id", data.id)
      .single();
    if (e1) throw new Error(e1.message);
    const { data: newSquad, error: e2 } = await supabase
      .from("squads")
      .insert({ user_id: userId, name: `${src.name} (copy)`, faction: src.faction })
      .select("id")
      .single();
    if (e2) throw new Error(e2.message);

    const { data: sps } = await supabase
      .from("squad_pilots")
      .select("*")
      .eq("squad_id", src.id)
      .order("position");
    if (!sps || sps.length === 0) return { id: newSquad.id };

    const spIds = sps.map((sp) => sp.id);
    const { data: ups } = await supabase
      .from("squad_pilot_upgrades")
      .select("*")
      .in("squad_pilot_id", spIds);

    for (const sp of sps) {
      const { data: newSp, error: e3 } = await supabase
        .from("squad_pilots")
        .insert({ squad_id: newSquad.id, pilot_xws: sp.pilot_xws, position: sp.position })
        .select("id")
        .single();
      if (e3) throw new Error(e3.message);
      const mine = (ups ?? []).filter((u) => u.squad_pilot_id === sp.id);
      if (mine.length) {
        const { error: e4 } = await supabase.from("squad_pilot_upgrades").insert(
          mine.map((u) => ({
            squad_pilot_id: newSp.id,
            upgrade_xws: u.upgrade_xws,
            position: u.position,
          })),
        );
        if (e4) throw new Error(e4.message);
      }
    }
    return { id: newSquad.id };
  });

export const addPilotToSquad = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ squad_id: z.string().uuid(), pilot_xws: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { count } = await supabase
      .from("squad_pilots")
      .select("id", { count: "exact", head: true })
      .eq("squad_id", data.squad_id);
    const { error } = await supabase.from("squad_pilots").insert({
      squad_id: data.squad_id,
      pilot_xws: data.pilot_xws,
      position: count ?? 0,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePilotFromSquad = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ squad_pilot_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("squad_pilots")
      .delete()
      .eq("id", data.squad_pilot_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addUpgradeToPilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        squad_pilot_id: z.string().uuid(),
        upgrade_xws: z.string().min(1),
        position: z.number().int().min(0).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let position = data.position;
    if (position === undefined) {
      const { count } = await supabase
        .from("squad_pilot_upgrades")
        .select("id", { count: "exact", head: true })
        .eq("squad_pilot_id", data.squad_pilot_id);
      position = count ?? 0;
    }
    const { error } = await supabase.from("squad_pilot_upgrades").insert({
      squad_pilot_id: data.squad_pilot_id,
      upgrade_xws: data.upgrade_xws,
      position,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeUpgradeFromPilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("squad_pilot_upgrades")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });