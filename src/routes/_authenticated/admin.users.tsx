import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUsersWithRoles, setUserSuperuser } from "@/lib/players.functions";
import { useAuth } from "@/hooks/use-auth";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin — X-Wing League" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listUsersWithRoles);
  const setRoleFn = useServerFn(setUserSuperuser);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listFn(),
    enabled: isAdmin,
  });

  const mutation = useMutation({
    mutationFn: ({ user_id, superuser }: { user_id: string; superuser: boolean }) =>
      setRoleFn({ data: { user_id, superuser } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed to update role");
    },
  });

  if (!isAdmin) {
    return <p className="text-muted-foreground">Admin only.</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Users</h1>
      <p className="text-sm text-muted-foreground">
        Toggle superuser to allow a player to create and manage competitions.
      </p>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      <div className="divide-y rounded-md border">
        {data?.users.map((u) => {
          const isSuperuser = u.roles.includes("superuser");
          const isAdminUser = u.roles.includes("admin");
          return (
            <div key={u.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="font-medium">{u.display_name}</span>
                {isAdminUser && (
                  <Badge variant="secondary">Admin</Badge>
                )}
                {isSuperuser && (
                  <Badge>Superuser</Badge>
                )}
              </div>
              {!isAdminUser && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Superuser</span>
                  <Switch
                    checked={isSuperuser}
                    disabled={mutation.isPending}
                    onCheckedChange={(checked) =>
                      mutation.mutate({ user_id: u.id, superuser: checked })
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
