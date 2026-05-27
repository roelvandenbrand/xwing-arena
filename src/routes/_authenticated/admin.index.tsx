import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyCompetitions } from "@/lib/competitions.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/competition-card";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — X-Wing League" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, user } = useAuth();
  const fn = useServerFn(listMyCompetitions);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-competitions", user?.id],
    queryFn: () => fn(),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-muted-foreground">
          You don't have admin access. Ask the site owner to promote your account.
        </p>
        <p className="text-xs text-muted-foreground">
          Your user ID: <code className="bg-muted px-1 rounded">{user?.id}</code>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin panel</h1>
      <p className="text-sm text-muted-foreground">
        Manage join requests, game confirmations, and lifecycle from each competition's page.
      </p>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.competitions.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg">
                  <Link to="/competitions/$id" params={{ id: c.id }} className="hover:underline">
                    {c.name}
                  </Link>
                </CardTitle>
                <StatusBadge status={c.status} />
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Rules {c.rules_version} · {c.squad_points_limit} pts
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}