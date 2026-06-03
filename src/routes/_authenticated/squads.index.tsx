import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listMySquads,
  listPublicSquads,
  createSquad,
  deleteSquad,
  duplicateSquad,
} from "@/lib/squads.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FACTIONS } from "@/lib/games.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/squads/")({
  head: () => ({ meta: [{ title: "My Squads — X-Wing League" }] }),
  component: SquadsIndex,
});

function SquadsIndex() {
  const [tab, setTab] = useState<"mine" | "public">("mine");
  const qc = useQueryClient();

  const myFn = useServerFn(listMySquads);
  const publicFn = useServerFn(listPublicSquads);
  const { data: myData, isLoading: myLoading } = useQuery({
    queryKey: ["my-squads"],
    queryFn: () => myFn(),
    enabled: tab === "mine",
  });
  const { data: publicData, isLoading: publicLoading } = useQuery({
    queryKey: ["public-squads"],
    queryFn: () => publicFn(),
    enabled: tab === "public",
  });

  const delFn = useServerFn(deleteSquad);
  const dupFn = useServerFn(duplicateSquad);
  const navigate = useNavigate();

  const delMut = useMutation({
    mutationFn: delFn,
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["my-squads"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const dupMut = useMutation({
    mutationFn: dupFn,
    onSuccess: ({ id }) => { toast.success("Duplicated"); navigate({ to: "/squads/$id", params: { id } }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const squads = tab === "mine" ? myData?.squads : publicData?.squads;
  const isLoading = tab === "mine" ? myLoading : publicLoading;
  const isMine = tab === "mine";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Squads</h1>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={tab === "mine" ? "default" : "outline"}
              onClick={() => setTab("mine")}
            >
              My squads
            </Button>
            <Button
              size="sm"
              variant={tab === "public" ? "default" : "outline"}
              onClick={() => setTab("public")}
            >
              Public squads
            </Button>
          </div>
        </div>
        {isMine && <NewSquadDialog />}
      </div>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {squads && squads.length === 0 && (
        <p className="text-muted-foreground">
          {isMine ? "No squads yet. Create your first one above." : "No public squads yet."}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {squads?.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link to="/squads/$id" params={{ id: s.id }} className="hover:underline">
                  {s.name}
                </Link>
                {s.is_public ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                    Public
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    Private
                  </span>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground capitalize">{s.faction}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                {s.pilot_count} pilot{s.pilot_count === 1 ? "" : "s"} · {s.total_points} pts
              </p>
              {isMine && (
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/squads/$id" params={{ id: s.id }}>Edit</Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => dupMut.mutate({ data: { id: s.id } })}>
                    Duplicate
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete "${s.name}"?`)) delMut.mutate({ data: { id: s.id } });
                    }}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NewSquadDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [faction, setFaction] = useState("");
  const fn = useServerFn(createSquad);
  const navigate = useNavigate();
  const m = useMutation({
    mutationFn: fn,
    onSuccess: ({ id }) => {
      setOpen(false);
      setName("");
      setFaction("");
      navigate({ to: "/squads/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New squad</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New squad</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Faction</Label>
            <Select value={faction} onValueChange={setFaction}>
              <SelectTrigger><SelectValue placeholder="Pick faction" /></SelectTrigger>
              <SelectContent>
                {FACTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!name || !faction || m.isPending}
            onClick={() => m.mutate({ data: { name, faction } })}
          >
            {m.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}