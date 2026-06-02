import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPlayers, listPlayerSquads } from "@/lib/players.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/players/$id")({
  head: () => ({ meta: [{ title: "Player Squads — X-Wing League" }] }),
  component: PlayerSquads,
});

function PlayerSquads() {
  const { id } = Route.useParams();

  const playersFn = useServerFn(listPlayers);
  const { data: playersData } = useQuery({
    queryKey: ["players"],
    queryFn: () => playersFn(),
  });
  const player = playersData?.players.find((p) => p.id === id);

  const squadsFn = useServerFn(listPlayerSquads);
  const { data: squadsData, isLoading } = useQuery({
    queryKey: ["player-squads", id],
    queryFn: () => squadsFn({ data: { user_id: id } }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/players" className="text-sm text-muted-foreground hover:underline">
          ← Players
        </Link>
        <h1 className="text-2xl font-bold">
          {player?.display_name ?? "Player"}'s Squads
        </h1>
      </div>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {squadsData && squadsData.squads.length === 0 && (
        <p className="text-muted-foreground">This player has no squads.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {squadsData?.squads.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                <Link to="/squads/$id" params={{ id: s.id }} className="hover:underline">
                  {s.name}
                </Link>
              </CardTitle>
              <p className="text-xs text-muted-foreground capitalize">{s.faction}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {s.pilot_count} pilot{s.pilot_count === 1 ? "" : "s"} · {s.total_points} pts
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
