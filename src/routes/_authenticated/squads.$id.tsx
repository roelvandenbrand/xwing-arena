import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  getSquad,
  updateSquad,
  addPilotToSquad,
  removePilotFromSquad,
  addUpgradeToPilot,
  removeUpgradeFromPilot,
} from "@/lib/squads.functions";
import { listPilots, listUpgrades } from "@/lib/catalog.functions";
import { FACTIONS } from "@/lib/games.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/squads/$id")({
  head: () => ({ meta: [{ title: "Squad — X-Wing League" }] }),
  component: SquadDetail,
});

function SquadDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const sqFn = useServerFn(getSquad);
  const { data, isLoading, error } = useQuery({
    queryKey: ["squad", id],
    queryFn: () => sqFn({ data: { id } }),
  });

  const pilotsFn = useServerFn(listPilots);
  const { data: pilotsData } = useQuery({ queryKey: ["pilots"], queryFn: () => pilotsFn() });

  const upgradesFn = useServerFn(listUpgrades);
  const { data: upgradesData } = useQuery({ queryKey: ["upgrades"], queryFn: () => upgradesFn() });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["squad", id] });

  const updateFn = useServerFn(updateSquad);
  const updateMut = useMutation({
    mutationFn: updateFn,
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ["my-squads"] }); toast.success("Saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addPilotFn = useServerFn(addPilotToSquad);
  const addPilotMut = useMutation({
    mutationFn: addPilotFn,
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const rmPilotFn = useServerFn(removePilotFromSquad);
  const rmPilotMut = useMutation({
    mutationFn: rmPilotFn,
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const addUpFn = useServerFn(addUpgradeToPilot);
  const addUpMut = useMutation({
    mutationFn: addUpFn,
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const rmUpFn = useServerFn(removeUpgradeFromPilot);
  const rmUpMut = useMutation({
    mutationFn: rmUpFn,
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  // Local edit state for header
  const [editName, setEditName] = useState<string | null>(null);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{(error as Error).message}</p>;
  if (!data) return null;

  const { squad, squadPilots, squadPilotUpgrades, isOwner } = data;
  const pilotByXws = new Map((pilotsData?.pilots ?? []).map((p: any) => [p.xws, p]));
  const upgradeByXws = new Map((upgradesData?.upgrades ?? []).map((u: any) => [u.xws, u]));

  // Filter pilots to this squad's faction
  const factionPilots = (pilotsData?.pilots ?? []).filter((p: any) => p.faction === squad.faction);

  const totalPoints = squadPilots.reduce((acc: number, sp: any) => {
    const p: any = pilotByXws.get(sp.pilot_xws);
    const pPts = p?.points ?? 0;
    const upPts = squadPilotUpgrades
      .filter((u: any) => u.squad_pilot_id === sp.id)
      .reduce((s: number, u: any) => s + ((upgradeByXws.get(u.upgrade_xws) as any)?.points ?? 0), 0);
    return acc + pPts + upPts;
  }, 0);

  const factionLabel = FACTIONS.find((f) => f.value === squad.faction)?.label ?? squad.faction;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          {editName === null ? (
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {squad.name}
              {isOwner && (
                <Button size="sm" variant="ghost" onClick={() => setEditName(squad.name)}>
                  Rename
                </Button>
              )}
            </h1>
          ) : (
            <div className="flex gap-2 items-center">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              <Button
                size="sm"
                onClick={() => {
                  updateMut.mutate({ data: { id: squad.id, name: editName } });
                  setEditName(null);
                }}
              >Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditName(null)}>Cancel</Button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {factionLabel} · {squadPilots.length} pilot{squadPilots.length === 1 ? "" : "s"} ·{" "}
            <span className="font-semibold text-foreground">{totalPoints} pts</span>
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/squads">← Back to squads</Link>
        </Button>
      </div>

      {isOwner && (
        <AddPilotDialog
          factionPilots={factionPilots}
          onAdd={(xws) => addPilotMut.mutate({ data: { squad_id: squad.id, pilot_xws: xws } })}
        />
      )}

      <div className="space-y-3">
        {squadPilots.length === 0 && (
          <p className="text-muted-foreground text-sm">No pilots yet. Add one above.</p>
        )}
        {squadPilots.map((sp: any) => {
          const pilot: any = pilotByXws.get(sp.pilot_xws);
          const myUps = squadPilotUpgrades.filter((u: any) => u.squad_pilot_id === sp.id);
          const upPts = myUps.reduce(
            (s: number, u: any) => s + ((upgradeByXws.get(u.upgrade_xws) as any)?.points ?? 0),
            0,
          );
          const pPts = pilot?.points ?? 0;
          const slots: string[] = pilot?.slots ?? [];
          const slotUpgrades = (upgradesData?.upgrades ?? []).filter((u: any) =>
            slots.includes(u.slot),
          );
          return (
            <Card key={sp.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">
                    {pilot?.name ?? sp.pilot_xws}
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      skill {pilot?.skill ?? "?"} · {pPts}pt
                      {upPts > 0 && ` + ${upPts}pt upgrades = ${pPts + upPts}pt`}
                    </span>
                  </CardTitle>
                  {isOwner && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Remove ${pilot?.name ?? "pilot"}?`))
                          rmPilotMut.mutate({ data: { squad_pilot_id: sp.id } });
                      }}
                    >Remove</Button>
                  )}
                </div>
                {slots.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Slots: {slots.join(", ")}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {myUps.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No upgrades.</p>
                ) : (
                  <ul className="space-y-1">
                    {myUps.map((u: any) => {
                      const upg: any = upgradeByXws.get(u.upgrade_xws);
                      return (
                        <li key={u.id} className="flex items-center justify-between text-sm">
                          <span>
                            <span className="font-medium">{upg?.name ?? u.upgrade_xws}</span>{" "}
                            <span className="text-muted-foreground text-xs">
                              {upg?.slot} · {upg?.points ?? 0}pt
                            </span>
                          </span>
                          {isOwner && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => rmUpMut.mutate({ data: { id: u.id } })}
                            >×</Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {isOwner && slots.length > 0 && (
                  <AddUpgradeDialog
                    slots={slots}
                    upgrades={slotUpgrades}
                    onAdd={(xws) =>
                      addUpMut.mutate({ data: { squad_pilot_id: sp.id, upgrade_xws: xws } })
                    }
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function AddPilotDialog({
  factionPilots,
  onAdd,
}: {
  factionPilots: any[];
  onAdd: (xws: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [ship, setShip] = useState("");
  const ships = useMemo(
    () => [...new Set(factionPilots.map((p) => p.ship_xws))].sort(),
    [factionPilots],
  );
  const filtered = factionPilots.filter(
    (p) =>
      (!ship || p.ship_xws === ship) &&
      (!q || p.name.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add pilot</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add pilot</DialogTitle></DialogHeader>
        <div className="flex gap-2">
          <Input placeholder="Search pilots…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={ship || "__all"} onValueChange={(v) => setShip(v === "__all" ? "" : v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Any ship" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Any ship</SelectItem>
              {ships.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ul className="divide-y rounded-md border max-h-[400px] overflow-y-auto">
          {filtered.map((p) => (
            <li key={p.xws} className="flex items-center justify-between p-2 text-sm">
              <span>
                <span className="font-medium">{p.name}</span>{" "}
                <span className="text-muted-foreground text-xs">
                  {p.ship_xws} · skill {p.skill} · {p.points}pt
                </span>
              </span>
              <Button
                size="sm"
                onClick={() => {
                  onAdd(p.xws);
                  setOpen(false);
                  setQ("");
                  setShip("");
                }}
              >Add</Button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">
              No pilots match. Import pilots in the Admin → Catalog page first.
            </li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function AddUpgradeDialog({
  slots,
  upgrades,
  onAdd,
}: {
  slots: string[];
  upgrades: any[];
  onAdd: (xws: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [slot, setSlot] = useState("");
  const filtered = upgrades.filter(
    (u) =>
      (!slot || u.slot === slot) &&
      (!q || u.name.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Add upgrade</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add upgrade</DialogTitle></DialogHeader>
        <div className="flex gap-2">
          <Input placeholder="Search upgrades…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={slot || "__all"} onValueChange={(v) => setSlot(v === "__all" ? "" : v)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Any slot" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Any slot</SelectItem>
              {[...new Set(slots)].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ul className="divide-y rounded-md border max-h-[400px] overflow-y-auto">
          {filtered.map((u) => (
            <li key={u.xws} className="flex items-center justify-between p-2 text-sm">
              <span>
                <span className="font-medium">{u.name}</span>{" "}
                <span className="text-muted-foreground text-xs">{u.slot} · {u.points}pt</span>
              </span>
              <Button
                size="sm"
                onClick={() => {
                  onAdd(u.xws);
                  setOpen(false);
                  setQ("");
                  setSlot("");
                }}
              >Add</Button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">No upgrades match this pilot's slots.</li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}