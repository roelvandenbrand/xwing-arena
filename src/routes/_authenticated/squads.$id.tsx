import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  getSquad,
  updateSquad,
  addPilotToSquad,
  removePilotFromSquad,
  addUpgradeToPilot,
  removeUpgradeFromPilot,
} from "@/lib/squads.functions";
import { listPilots, listUpgrades, listShips } from "@/lib/catalog.functions";
import { FACTIONS } from "@/lib/games.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { toast } from "sonner";

// Pilots store factions by full label; squads store a short code.
// Some factions can mix together when building a squad.
const FACTION_GROUPS: Record<string, string[]> = {
  imperial: ["Galactic Empire", "First Order"],
  rebel: ["Rebel Alliance", "Resistance"],
  scum: ["Scum and Villainy"],
};

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
  const isMobile = useIsMobile();

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{(error as Error).message}</p>;
  if (!data) return null;

  const { squad, squadPilots, squadPilotUpgrades, isOwner } = data;
  const pilotByXws = new Map((pilotsData?.pilots ?? []).map((p: any) => [p.xws, p]));
  const upgradeByXws = new Map((upgradesData?.upgrades ?? []).map((u: any) => [u.xws, u]));

  // Squad stores a short code; multiple full-label factions can mix into one group.
  const allowedFactionLabels =
    FACTION_GROUPS[squad.faction] ??
    [FACTIONS.find((f) => f.value === squad.faction)?.label ?? squad.faction];
  const factionPilots = (pilotsData?.pilots ?? []).filter((p: any) =>
    allowedFactionLabels.includes(p.faction),
  );

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
          const myUps = squadPilotUpgrades
            .filter((u: any) => u.squad_pilot_id === sp.id)
            .sort((a: any, b: any) => a.position - b.position);
          const upPts = myUps.reduce(
            (s: number, u: any) => s + ((upgradeByXws.get(u.upgrade_xws) as any)?.points ?? 0),
            0,
          );
          const pPts = pilot?.points ?? 0;
          const pilotBaseSlots: string[] = pilot?.slots ?? [];
          // Collect grants from equipped upgrades. "-X" entries remove an
          // unused slot of type X; positive entries add a slot.
          const positives: string[] = [];
          const negatives: string[] = [];
          for (const u of myUps) {
            const upg: any = upgradeByXws.get(u.upgrade_xws);
            if (!upg?.grants?.length) continue;
            for (const g of upg.grants as string[]) {
              if (g.startsWith("-")) negatives.push(g.slice(1));
              else positives.push(g);
            }
          }

          // Pool of available slot types = base + positive grants,
          // minus the slot types already occupied by equipped upgrades,
          // minus negative grants (only against the unused pool — never
          // against a slot that's currently filled).
          const grantedSet = new Set(positives);
          const pool: string[] = [...pilotBaseSlots, ...positives];
          for (const u of myUps) {
            const upg: any = upgradeByXws.get(u.upgrade_xws);
            const slotName = upg?.slot;
            if (!slotName) continue;
            const idx = pool.indexOf(slotName);
            if (idx >= 0) pool.splice(idx, 1);
          }
          for (const n of negatives) {
            const idx = pool.indexOf(n);
            if (idx >= 0) pool.splice(idx, 1);
          }

          // Place each filled upgrade at its stored position with its own
          // slot type; fill the remaining positions in order from the pool.
          const filledByPos = new Map<number, { slot: string; granted: boolean }>();
          for (const u of myUps) {
            const upg: any = upgradeByXws.get(u.upgrade_xws);
            const slotName = upg?.slot ?? "?";
            // A filled upgrade is "granted" if its slot type doesn't exist
            // in the pilot's base slots (i.e. only the granted pool offers it).
            const inBase = pilotBaseSlots.includes(slotName);
            filledByPos.set(u.position, { slot: slotName, granted: !inBase && grantedSet.has(slotName) });
          }
          const maxPos = myUps.reduce((m: number, u: any) => Math.max(m, u.position), -1);
          const totalLen = Math.max(maxPos + 1, 0) + pool.length;
          const slots: string[] = [];
          const slotIsGranted: boolean[] = [];
          let poolIdx = 0;
          for (let i = 0; i < totalLen; i++) {
            const f = filledByPos.get(i);
            if (f) {
              slots.push(f.slot);
              slotIsGranted.push(f.granted);
            } else if (poolIdx < pool.length) {
              const s = pool[poolIdx++];
              slots.push(s);
              // Mark as granted only after base slots of that type are
              // exhausted earlier in the layout.
              const baseCount = pilotBaseSlots.filter((b) => b === s).length;
              const seenSoFar = slots.slice(0, -1).filter((x) => x === s).length;
              slotIsGranted.push(seenSoFar >= baseCount);
            } else {
              slots.push("?");
              slotIsGranted.push(false);
            }
          }
          return (
            <Card key={sp.id}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Big pilot card image */}
                  <div className="shrink-0 flex flex-col items-start gap-2">
                    <CatalogImage
                      src={pilot?.image}
                      alt={pilot?.name ?? sp.pilot_xws}
                      className="h-72 w-auto rounded border object-contain bg-muted/30"
                    />
                    <div className="w-full">
                      <CardTitle className="text-lg">{pilot?.name ?? sp.pilot_xws}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pilot?.ship_xws} · skill {pilot?.skill ?? "?"} · {pPts}pt
                        {upPts > 0 && ` + ${upPts} = ${pPts + upPts}pt`}
                      </p>
                      {isOwner && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-1 px-0 h-7"
                          onClick={() => {
                            if (confirm(`Remove ${pilot?.name ?? "pilot"}?`))
                              rmPilotMut.mutate({ data: { squad_pilot_id: sp.id } });
                          }}
                        >Remove pilot</Button>
                      )}
                    </div>
                  </div>

                  {/* Slots in two rows next to the pilot */}
                  <div className="flex-1 min-w-0">
                    {slots.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No upgrade slots.</p>
                    ) : (
                      <div
                        className="grid gap-2"
                        style={{
                          gridTemplateColumns: isMobile
                            ? "repeat(2, minmax(0, 1fr))"
                            : "repeat(auto-fill, minmax(160px, 1fr))",
                        }}
                      >
                        {slots.map((slot, slotIndex) => {
                          const filled = myUps.find((u: any) => u.position === slotIndex);
                          if (slot === "?" && !filled) return null;
                          const upg: any = filled ? upgradeByXws.get(filled.upgrade_xws) : null;
                          const isGranted = slotIsGranted[slotIndex] ?? false;
                          return (
                            <div
                              key={slotIndex}
                              className="rounded border p-2 text-sm flex flex-col gap-1 min-h-[13rem]"
                            >
                              {filled && upg ? (
                                <HoverCard openDelay={120}>
                                  <HoverCardTrigger asChild>
                                    <div className="flex flex-col gap-1 cursor-help">
                                      <CatalogImage
                                        src={upg.image}
                                        alt={upg.name}
                                        className="h-48 w-auto rounded object-contain"
                                      />
                                      <div className="font-medium text-xs truncate">{upg.name}</div>
                                      <div className="text-[10px] text-muted-foreground">
                                        {slot}{isGranted ? " ★" : ""} · {upg.points ?? 0}pt
                                      </div>
                                      {isOwner && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 px-1 self-start text-xs"
                                          onClick={() => rmUpMut.mutate({ data: { id: filled.id } })}
                                        >Remove</Button>
                                      )}
                                    </div>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-80">
                                    <div className="space-y-2">
                                      <div>
                                        <div className="font-semibold">{upg.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {upg.slot} · {upg.points ?? 0}pt
                                          {upg.faction ? ` · ${upg.faction}` : ""}
                                          {upg.ship_xws ? ` · ${upg.ship_xws}` : ""}
                                        </div>
                                      </div>
                                      {upg.text && (
                                        <div
                                          className="text-xs leading-relaxed"
                                          dangerouslySetInnerHTML={{ __html: upg.text }}
                                        />
                                      )}
                                      {upg.grants?.length > 0 && (
                                        <div className="text-xs text-muted-foreground">
                                          Grants: {upg.grants.join(", ")}
                                        </div>
                                      )}
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              ) : (
                                <div className="flex flex-col items-start justify-between gap-2 h-full">
                                  <span className="text-muted-foreground text-xs">
                                    Empty {slot}{isGranted ? " ★" : ""}
                                  </span>
                                  {isOwner && (
                                    <AddUpgradeForSlotDialog
                                      slot={slot}
                                      upgrades={(upgradesData?.upgrades ?? []).filter(
                                        (u: any) =>
                                          u.slot === slot &&
                                          (!u.faction || allowedFactionLabels.includes(u.faction)) &&
                                          (!u.ship_xws || u.ship_xws === pilot?.ship_xws),
                                      )}
                                      squadTotal={totalPoints}
                                      onAdd={(xws) =>
                                        addUpMut.mutate({
                                          data: {
                                            squad_pilot_id: sp.id,
                                            upgrade_xws: xws,
                                            position: slotIndex,
                                          },
                                        })
                                      }
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function CatalogImage({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [err, setErr] = useState(false);
  if (!src || err) return null;
  const url = src.startsWith("http") || src.startsWith("/") ? src : `/${src}`;
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setErr(true)}
      className={className}
    />
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
  const [step, setStep] = useState<"ship" | "pilot">("ship");
  const [shipXws, setShipXws] = useState<string>("");
  const [q, setQ] = useState("");

  const shipsFn = useServerFn(listShips);
  const { data: shipsData } = useQuery({ queryKey: ["ships"], queryFn: () => shipsFn() });

  // Ships that have at least one pilot in this faction
  const factionShipXws = useMemo(
    () => new Set(factionPilots.map((p) => p.ship_xws)),
    [factionPilots],
  );
  const ships = useMemo(
    () =>
      (shipsData?.ships ?? [])
        .filter((s: any) => factionShipXws.has(s.xws))
        .sort((a: any, b: any) => a.name.localeCompare(b.name)),
    [shipsData, factionShipXws],
  );

  const pilotsForShip = factionPilots
    .filter((p) => p.ship_xws === shipXws)
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.skill ?? 0) - (a.skill ?? 0));

  const reset = () => {
    setStep("ship");
    setShipXws("");
    setQ("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>Add pilot</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {step === "ship" ? "Pick a ship" : `Pick a pilot for ${shipXws}`}
          </DialogTitle>
        </DialogHeader>

        {step === "ship" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[480px] overflow-y-auto">
            {ships.map((s: any) => (
              <button
                key={s.xws}
                type="button"
                onClick={() => {
                  setShipXws(s.xws);
                  setStep("pilot");
                }}
                className="rounded-md border p-3 text-left hover:bg-accent transition-colors"
              >
                <div className="font-medium text-sm">{s.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {s.size ?? ""} · {s.attack ?? "-"}/{s.agility ?? "-"}/{s.hull ?? "-"}/
                  {s.shields ?? "-"}
                </div>
              </button>
            ))}
            {ships.length === 0 && (
              <p className="col-span-full p-3 text-sm text-muted-foreground">
                No ships for this faction. Import ships in Admin → Catalog.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => reset()}>
                ← Ships
              </Button>
              <Input
                placeholder="Search pilots…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <ul className="divide-y rounded-md border max-h-[480px] overflow-y-auto">
              {pilotsForShip.map((p) => (
                <li
                  key={p.xws}
                  className="flex items-center justify-between gap-2 p-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <CatalogImage
                      src={p.image}
                      alt={p.name}
                      className="h-16 w-auto rounded object-cover"
                    />
                    <div>
                      <div className="font-medium">
                        {p.name}
                        {p.unique_pilot && (
                          <span className="text-xs text-muted-foreground ml-1">•</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        skill {p.skill} · {p.points}pt · {(p.slots ?? []).join(", ") || "no slots"}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      onAdd(p.xws);
                      setOpen(false);
                      reset();
                    }}
                  >Add</Button>
                </li>
              ))}
              {pilotsForShip.length === 0 && (
                <li className="p-3 text-sm text-muted-foreground">No pilots match.</li>
              )}
            </ul>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddUpgradeForSlotDialog({
  slot,
  upgrades,
  squadTotal,
  onAdd,
}: {
  slot: string;
  upgrades: any[];
  squadTotal: number;
  onAdd: (xws: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = upgrades
    .filter((u) => !q || u.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.points ?? 0) - (b.points ?? 0));
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setQ("");
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Add {slot}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Add {slot} upgrade
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              Squad total: {squadTotal} pts
            </span>
          </DialogTitle>
        </DialogHeader>
        <Input
          placeholder={`Search ${slot} upgrades…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul className="divide-y rounded-md border max-h-[480px] overflow-y-auto">
          {filtered.map((u) => {
            const pts = u.points ?? 0;
            return (
              <li
                key={u.xws}
                className="flex items-center justify-between gap-2 p-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <CatalogImage
                    src={u.image}
                    alt={u.name}
                    className="h-12 w-auto rounded object-cover"
                  />
                  <div>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {pts}pt → total {squadTotal + pts} pts
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    onAdd(u.xws);
                    setOpen(false);
                    setQ("");
                  }}
                >Add</Button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">
              No {slot} upgrades available.
            </li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}