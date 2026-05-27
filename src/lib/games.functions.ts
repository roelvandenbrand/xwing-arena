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
      player1_squad_id: data.my_squad_id ?? null,
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