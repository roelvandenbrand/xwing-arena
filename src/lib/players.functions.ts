import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listPlayers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .order("display_name");

    const { data: closedComps } = await supabase
      .from("competitions")
      .select("id")
      .eq("status", "finished");

    const closedIds = (closedComps ?? []).map((c) => c.id);

    const counts = new Map<string, number>();
    if (closedIds.length > 0) {
      const { data: members } = await supabase
        .from("competition_members")
        .select("user_id")
        .eq("status", "approved")
        .in("competition_id", closedIds);

      for (const m of members ?? []) {
        counts.set(m.user_id, (counts.get(m.user_id) ?? 0) + 1);
      }
    }

    return {
      players: (profiles ?? []).map((p) => ({
        id: p.id,
        display_name: p.display_name,
        closed_competitions: counts.get(p.id) ?? 0,
      })),
    };
  });

export const listPlayerSquads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const isOwnProfile = data.user_id === userId;
    let query = supabase
      .from("squads")
      .select("*")
      .eq("user_id", data.user_id)
      .eq("is_snapshot", false)
      .order("updated_at", { ascending: false });

    if (!isOwnProfile) {
      query = query.eq("is_public", true);
    }

    const { data: squads, error } = await query;
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
