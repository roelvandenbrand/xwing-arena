import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const FACTIONS = [
  { value: "imperial", label: "Galactic Empire" },
  { value: "rebel", label: "Rebel Alliance" },
  { value: "scum", label: "Scum and Villainy" },
] as const;

const logInput = z.object({
  competition_id: z.string().uuid(),
  opponent_id: z.string().uuid(),
  my_squad: z.string().max(5000).default(""),
  opponent_squad: z.string().max(5000).default(""),
  my_points: z.number().int().min(0).max(10000),
  opponent_points: z.number().int().min(0).max(10000),
  my_faction: z.enum(["imperial", "rebel", "scum"]),
  opponent_faction: z.enum(["imperial", "rebel", "scum"]),
  my_squad_id: z.string().uuid().nullable().optional(),
  opponent_squad_id: z.string().uuid().nullable().optional(),
});

export const logGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => logInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.opponent_id === userId) throw new Error("You can't log a game against yourself");

    // If the user picked one of their saved squads, snapshot it so the squad
    // (and its pilots/upgrades) stays viewable from the game even if the user
    // later deletes the original from their squad list.
    let snapshotSquadId: string | null = null;
    if (data.my_squad_id) {
      const { data: src, error: e0 } = await supabase
        .from("squads")
        .select("name, faction, user_id")
        .eq("id", data.my_squad_id)
        .maybeSingle();
      if (e0) throw new Error(e0.message);
      if (src) {
        const { data: snap, error: e1 } = await supabase
          .from("squads")
          .insert({
            user_id: src.user_id,
            name: `${src.name} (game snapshot)`,
            faction: src.faction,
            is_snapshot: true,
          })
          .select("id")
          .single();
        if (e1) throw new Error(e1.message);
        snapshotSquadId = snap.id;

        const { data: sps } = await supabase
          .from("squad_pilots")
          .select("pilot_xws, position, id")
          .eq("squad_id", data.my_squad_id)
          .order("position");
        if (sps && sps.length) {
          const spIds = sps.map((sp) => sp.id);
          const { data: ups } = await supabase
            .from("squad_pilot_upgrades")
            .select("squad_pilot_id, upgrade_xws, position")
            .in("squad_pilot_id", spIds);
          for (const sp of sps) {
            const { data: newSp, error: e2 } = await supabase
              .from("squad_pilots")
              .insert({
                squad_id: snapshotSquadId,
                pilot_xws: sp.pilot_xws,
                position: sp.position,
              })
              .select("id")
              .single();
            if (e2) throw new Error(e2.message);
            const mine = (ups ?? []).filter((u) => u.squad_pilot_id === sp.id);
            if (mine.length) {
              const { error: e3 } = await supabase.from("squad_pilot_upgrades").insert(
                mine.map((u) => ({
                  squad_pilot_id: newSp.id,
                  upgrade_xws: u.upgrade_xws,
                  position: u.position,
                })),
              );
              if (e3) throw new Error(e3.message);
            }
          }
        }
      }
    }

    const { error } = await supabase.from("games").insert({
      competition_id: data.competition_id,
      player1_id: userId,
      player2_id: data.opponent_id,
      player1_squad_text: data.my_squad,
      player2_squad_text: data.opponent_squad,
      player1_points: data.my_points,
      player2_points: data.opponent_points,
      player1_faction: data.my_faction,
      player2_faction: data.opponent_faction,
      player1_squad_id: snapshotSquadId ?? data.my_squad_id ?? null,
      player2_squad_id: data.opponent_squad_id ?? null,
      reported_by: userId,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const decideGameInput = z.object({
  game_id: z.string().uuid(),
  decision: z.enum(["confirmed", "rejected"]),
});

export const decideGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => decideGameInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("games")
      .update({
        status: data.decision,
        confirmed_by: context.userId,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", data.game_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ game_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("games").delete().eq("id", data.game_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });