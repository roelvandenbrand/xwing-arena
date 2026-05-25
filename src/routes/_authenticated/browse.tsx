import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listOpenCompetitions, requestJoin } from "@/lib/competitions.functions";
import { CompetitionCard } from "@/components/competition-card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/browse")({
  head: () => ({ meta: [{ title: "Browse — X-Wing League" }] }),
  component: BrowsePage,
});

function BrowsePage() {
  const fn = useServerFn(listOpenCompetitions);
  const joinFn = useServerFn(requestJoin);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["open-competitions"],
    queryFn: () => fn(),
  });
  const m = useMutation({
    mutationFn: joinFn,
    onSuccess: () => {
      toast.success("Join request sent");
      qc.invalidateQueries({ queryKey: ["open-competitions"] });
      qc.invalidateQueries({ queryKey: ["my-competitions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Open competitions</h1>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {!isLoading && (data?.competitions.length ?? 0) === 0 && (
        <p className="text-muted-foreground">No competitions are open for joining right now.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.competitions.map((c) => (
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
                  onClick={() => m.mutate({ data: { id: c.id } })}
                  disabled={m.isPending}
                >
                  Request to join
                </Button>
              )
            }
          />
        ))}
      </div>
    </div>
  );
}