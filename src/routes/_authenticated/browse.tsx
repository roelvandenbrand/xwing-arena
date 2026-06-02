import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listOpenCompetitions,
  listClosedCompetitions,
  requestJoin,
} from "@/lib/competitions.functions";
import { CompetitionCard } from "@/components/competition-card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/browse")({
  head: () => ({ meta: [{ title: "Browse — X-Wing League" }] }),
  component: BrowsePage,
});

function fmt(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function BrowsePage() {
  const [view, setView] = useState<"open" | "closed">("open");
  const [page, setPage] = useState(0);

  const openFn = useServerFn(listOpenCompetitions);
  const closedFn = useServerFn(listClosedCompetitions);
  const joinFn = useServerFn(requestJoin);
  const qc = useQueryClient();

  const openQuery = useQuery({
    queryKey: ["open-competitions"],
    queryFn: () => openFn(),
    enabled: view === "open",
  });

  const closedQuery = useQuery({
    queryKey: ["closed-competitions", page],
    queryFn: () => closedFn({ data: { page } }),
    enabled: view === "closed",
  });

  const joinMut = useMutation({
    mutationFn: joinFn,
    onSuccess: () => {
      toast.success("Join request sent");
      qc.invalidateQueries({ queryKey: ["open-competitions"] });
      qc.invalidateQueries({ queryKey: ["my-competitions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPages = closedQuery.data
    ? Math.ceil(closedQuery.data.total / 10)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Browse</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={view === "open" ? "default" : "outline"}
            onClick={() => setView("open")}
          >
            Open competitions
          </Button>
          <Button
            size="sm"
            variant={view === "closed" ? "default" : "outline"}
            onClick={() => { setView("closed"); setPage(0); }}
          >
            Past competitions
          </Button>
        </div>
      </div>

      {view === "open" && (
        <>
          {openQuery.isLoading && <p className="text-muted-foreground">Loading…</p>}
          {!openQuery.isLoading && (openQuery.data?.competitions.length ?? 0) === 0 && (
            <p className="text-muted-foreground">No competitions are open for joining right now.</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {openQuery.data?.competitions.map((c) => (
              <CompetitionCard
                key={c.id}
                {...c}
                action={
                  c.membership === "approved" ? (
                    <p className="text-xs text-emerald-600">You're a member</p>
                  ) : c.membership === "pending" ? (
                    <p className="text-xs text-amber-600">Request pending</p>
                  ) : c.membership === "rejected" ? (
                    <p className="text-xs text-destructive">Request rejected</p>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => joinMut.mutate({ data: { id: c.id } })}
                      disabled={joinMut.isPending}
                    >
                      Request to join
                    </Button>
                  )
                }
              />
            ))}
          </div>
        </>
      )}

      {view === "closed" && (
        <>
          {closedQuery.isLoading && <p className="text-muted-foreground">Loading…</p>}
          {!closedQuery.isLoading && (closedQuery.data?.competitions.length ?? 0) === 0 && (
            <p className="text-muted-foreground">No past competitions yet.</p>
          )}
          {(closedQuery.data?.competitions.length ?? 0) > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Version</th>
                    <th className="px-4 py-2 font-medium">Points</th>
                    <th className="px-4 py-2 font-medium">Players</th>
                    <th className="px-4 py-2 font-medium">Winner</th>
                    <th className="px-4 py-2 font-medium">Start</th>
                    <th className="px-4 py-2 font-medium">End</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {closedQuery.data?.competitions.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">{c.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{c.rules_version}</td>
                      <td className="px-4 py-2 text-muted-foreground">{c.squad_points_limit ?? "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{c.player_count}</td>
                      <td className="px-4 py-2">{c.winner_name ?? "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{fmt(c.started_at)}</td>
                      <td className="px-4 py-2 text-muted-foreground">{fmt(c.finished_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page + 1} of {totalPages}
                {closedQuery.data && (
                  <span className="ml-1">({closedQuery.data.total} total)</span>
                )}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
