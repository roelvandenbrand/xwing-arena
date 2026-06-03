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
  const fn = useServerFn(listMySquads);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["my-squads"], queryFn: () => fn() });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">My Squads</h1>
        <NewSquadDialog />
      </div>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {data && data.squads.length === 0 && (
        <p className="text-muted-foreground">No squads yet. Create your first one above.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.squads.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                <Link to="/squads/$id" params={{ id: s.id }} className="hover:underline">
                  {s.name}
                </Link>
              </CardTitle>
              <p className="text-xs text-muted-foreground capitalize">{s.faction}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                {s.pilot_count} pilot{s.pilot_count === 1 ? "" : "s"} · {s.total_points} pts
              </p>
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