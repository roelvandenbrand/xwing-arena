import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeStandings } from "@/lib/standings";

const idInput = z.object({ id: z.string().uuid() });

export const listMyCompetitions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdminRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");
    const isAdmin = (isAdminRows?.length ?? 0) > 0;

    if (isAdmin) {
      const { data, error } = await supabase
        .from("competitions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return { competitions: data ?? [], isAdmin };
    }

    // approved member of
    const { data: memberships } = await supabase
      .from("competition_members")
      .select("competition_id, status")
      .eq("user_id", userId);
    const approvedIds = (memberships ?? []).filter((m) => m.status === "approved").map((m) => m.competition_id);
    const pendingIds = (memberships ?? []).filter((m) => m.status === "pending").map((m) => m.competition_id);
    if (approvedIds.length === 0 && pendingIds.length === 0) {
      return { competitions: [], isAdmin, pendingIds };
    }
    const ids = [...new Set([...approvedIds, ...pendingIds])];
    const { data, error } = await supabase
      .from("competitions")
      .select("*")
      .in("id", ids)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { competitions: data ?? [], isAdmin, pendingIds };
  });

export const listOpenCompetitions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("competitions")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: mine } = await supabase
      .from("competition_members")
      .select("competition_id, status")
      .eq("user_id", userId);
    const membershipMap = new Map((mine ?? []).map((m) => [m.competition_id, m.status]));
    return {
      competitions: (data ?? []).map((c) => ({
        ...c,
        membership: membershipMap.get(c.id) ?? null,
      })),
    };
  });

const PAGE_SIZE = 10;

export const listClosedCompetitions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ page: z.number().int().min(0) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const from = data.page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: comps, error, count } = await supabase
      .from("competitions")
      .select("*", { count: "exact" })
      .eq("status", "finished")
      .order("finished_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);

    const ids = (comps ?? []).map((c) => c.id);
    if (ids.length === 0) return { competitions: [], total: count ?? 0 };

    const { data: members } = await supabase
      .from("competition_members")
      .select("competition_id, user_id, status")
      .in("competition_id", ids);

    const userIds = [...new Set((members ?? []).map((m) => m.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
      : { data: [] as { id: string; display_name: string }[] };
    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

    const { data: games } = await supabase
      .from("games")
      .select("competition_id, player1_id, player2_id, player1_points, player2_points, winner_id, is_draw, status")
      .in("competition_id", ids);

    return {
      competitions: (comps ?? []).map((c) => {
        const compMembers = (members ?? [])
          .filter((m) => m.competition_id === c.id)
          .map((m) => ({
            user_id: m.user_id,
            display_name: nameMap.get(m.user_id) ?? "Unknown",
            status: m.status,
          }));
        const compGames = (games ?? []).filter((g) => g.competition_id === c.id);
        const standings = computeStandings(compGames, compMembers);
        const playerCount = compMembers.filter((m) => m.status === "approved").length;
        return {
          ...c,
          player_count: playerCount,
          winner_name: standings[0]?.display_name ?? null,
        };
      }),
      total: count ?? 0,
    };
  });

export const getCompetition = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: comp, error: e1 } = await supabase
      .from("competitions")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!comp) throw new Error("Competition not found or you don't have access");

    const { data: members, error: e2 } = await supabase
      .from("competition_members")
      .select("id,user_id,status,requested_at,decided_at")
      .eq("competition_id", data.id);
    if (e2) throw new Error(e2.message);

    const userIds = [...new Set((members ?? []).map((m) => m.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
      : { data: [] as { id: string; display_name: string }[] };
    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

    const { data: games, error: e3 } = await supabase
      .from("games")
      .select("*")
      .eq("competition_id", data.id)
      .order("created_at", { ascending: false });
    if (e3) throw new Error(e3.message);

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");
    const isAdmin = (roleRows?.length ?? 0) > 0;

    const myMembership = (members ?? []).find((m) => m.user_id === userId) ?? null;

    return {
      competition: comp,
      members: (members ?? []).map((m) => ({ ...m, display_name: nameMap.get(m.user_id) ?? "Unknown" })),
      games: games ?? [],
      profiles: Object.fromEntries(nameMap),
      isAdmin,
      myMembership,
      currentUserId: userId,
    };
  });

export const requestJoin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("competition_members").insert({
      competition_id: data.id,
      user_id: userId,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const createInput = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  rules_version: z.enum(["1.0", "2.0", "2.5"]).default("1.0"),
  squad_points_limit: z.number().int().min(1).max(1000).default(100),
});

export const createCompetition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("competitions")
      .insert({ ...data, created_by: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

const updateInput = createInput.partial().extend({ id: z.string().uuid() });

export const updateCompetition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("competitions").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCompetition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: comp } = await context.supabase
      .from("competitions")
      .select("status")
      .eq("id", data.id)
      .single();
    if (comp?.status === "finished") throw new Error("Closed competitions cannot be deleted.");
    const { error } = await context.supabase.from("competitions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const statusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "open", "running", "finished"]),
});

export const setCompetitionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => statusInput.parse(d))
  .handler(async ({ data, context }) => {
    const patch: {
      status: typeof data.status;
      started_at?: string;
      finished_at?: string;
    } = { status: data.status };
    if (data.status === "running") patch.started_at = new Date().toISOString();
    if (data.status === "finished") patch.finished_at = new Date().toISOString();
    const { error } = await context.supabase.from("competitions").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const decideInput = z.object({
  member_id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
});

export const decideJoinRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => decideInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("competition_members")
      .update({
        status: data.decision,
        decided_at: new Date().toISOString(),
        decided_by: context.userId,
      })
      .eq("id", data.member_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ member_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("competition_members")
      .delete()
      .eq("id", data.member_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminJoinCompetition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");
    if ((roleRows?.length ?? 0) === 0) throw new Error("Admin only");
    const { error } = await supabase.from("competition_members").upsert(
      {
        competition_id: data.id,
        user_id: userId,
        status: "approved",
        decided_at: new Date().toISOString(),
        decided_by: userId,
      },
      { onConflict: "competition_id,user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });