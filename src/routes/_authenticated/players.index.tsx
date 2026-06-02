import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPlayers } from "@/lib/players.functions";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/players/")({
  head: () => ({ meta: [{ title: "Players — X-Wing League" }] }),
  component: PlayersIndex,
});

function PlayersIndex() {
  const fn = useServerFn(listPlayers);
  const { data, isLoading } = useQuery({ queryKey: ["players"], queryFn: () => fn() });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Players</h1>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {data && data.players.length === 0 && (
        <p className="text-muted-foreground">No players found.</p>
      )}
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y">
            {data?.players.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="font-medium">{p.display_name}</span>
                <div className="flex items-center gap-6 text-muted-foreground">
                  <span>
                    {p.closed_competitions}{" "}
                    {p.closed_competitions === 1 ? "competition" : "competitions"}
                  </span>
                  <Link
                    to="/players/$id"
                    params={{ id: p.id }}
                    className="text-foreground hover:underline"
                  >
                    View squads →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
