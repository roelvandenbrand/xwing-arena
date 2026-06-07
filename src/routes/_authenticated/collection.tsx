import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  listPackages,
  listMyOwnership,
  setMyPackageQuantity,
  getMyCollection,
  getItemDetails,
  listMySingles,
  setMySingleQuantity,
} from "@/lib/packages.functions";
import { listShips, listPilots, listUpgrades } from "@/lib/catalog.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/collection")({
  head: () => ({ meta: [{ title: "My Collection — X-Wing League" }] }),
  component: CollectionPage,
});

function CollectionPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Collection</h1>
      <Tabs defaultValue="packages">
        <TabsList>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="have">What I have</TabsTrigger>
        </TabsList>
        <TabsContent value="packages" className="space-y-4">
          <PackagesBrowse />
        </TabsContent>
        <TabsContent value="have" className="space-y-4">
          <WhatIHave />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PackagesBrowse() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPackages);
  const ownFn = useServerFn(listMyOwnership);
  const setFn = useServerFn(setMyPackageQuantity);

  const { data: pkgs } = useQuery({ queryKey: ["packages"], queryFn: () => listFn() });
  const { data: own } = useQuery({ queryKey: ["my-ownership"], queryFn: () => ownFn() });

  const ownMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of own?.ownership ?? []) m.set(o.package_id, o.quantity);
    return m;
  }, [own]);

  const setMut = useMutation({
    mutationFn: setFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-ownership"] });
      qc.invalidateQueries({ queryKey: ["my-collection"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [search, setSearch] = useState("");

  const grouped = useMemo(() => {
    const byWave = new Map<string, any[]>();
    for (const p of pkgs?.packages ?? []) {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) continue;
      const key = p.wave ?? "Other";
      if (!byWave.has(key)) byWave.set(key, []);
      byWave.get(key)!.push(p);
    }
    return Array.from(byWave.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [pkgs, search]);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search packages…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />
      {grouped.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No packages yet. Ask an admin to add some.
        </p>
      )}
      {grouped.map(([wave, list]) => (
        <section key={wave} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{wave}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {list.map((p: any) => {
              const qty = ownMap.get(p.id) ?? 0;
              return (
                <Card key={p.id}>
                  <CardContent className="p-2 space-y-1.5">
                    <div className="aspect-[3/2] rounded border bg-muted/30 overflow-hidden flex items-center justify-center">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs text-muted-foreground">no image</span>
                      )}
                    </div>
                    <div className="font-medium text-sm leading-tight">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.ship_count}s · {p.pilot_count}p · {p.upgrade_count}u
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0 text-xs"
                        disabled={qty === 0}
                        onClick={() =>
                          setMut.mutate({
                            data: { package_id: p.id, quantity: Math.max(0, qty - 1) },
                          })
                        }
                      >
                        −
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">
                        {qty === 0 ? "—" : `×${qty}`}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0 text-xs"
                        onClick={() =>
                          setMut.mutate({
                            data: { package_id: p.id, quantity: qty + 1 },
                          })
                        }
                      >
                        +
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

type SelectedItem = { kind: "ship" | "pilot" | "upgrade"; xws: string; name: string };

function WhatIHave() {
  const collFn = useServerFn(getMyCollection);
  const { data } = useQuery({ queryKey: ["my-collection"], queryFn: () => collFn() });

  const shipsFn = useServerFn(listShips);
  const pilotsFn = useServerFn(listPilots);
  const upgradesFn = useServerFn(listUpgrades);
  const { data: shipsData } = useQuery({ queryKey: ["ships"], queryFn: () => shipsFn() });
  const { data: pilotsData } = useQuery({ queryKey: ["pilots"], queryFn: () => pilotsFn() });
  const { data: upgradesData } = useQuery({ queryKey: ["upgrades"], queryFn: () => upgradesFn() });

  const col = data?.collection ?? { ships: {}, pilots: {}, upgrades: {} };

  const shipMap = new Map((shipsData?.ships ?? []).map((s: any) => [s.xws, s]));
  const pilotMap = new Map((pilotsData?.pilots ?? []).map((p: any) => [p.xws, p]));
  const upgradeMap = new Map((upgradesData?.upgrades ?? []).map((u: any) => [u.xws, u]));

  const toList = (m: Record<string, number>, lookup: Map<string, any>) =>
    Object.entries(m)
      .map(([xws, qty]) => ({ xws, qty, name: lookup.get(xws)?.name ?? xws }))
      .sort((a, b) => a.name.localeCompare(b.name));

  const [selected, setSelected] = useState<SelectedItem | null>(null);

  return (
    <>
      <AddSingles
        shipMap={shipMap}
        pilotMap={pilotMap}
        upgradeMap={upgradeMap}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CollectionList
          title="Ships"
          items={toList(col.ships, shipMap)}
          kind="ship"
          onSelect={setSelected}
        />
        <CollectionList
          title="Pilots"
          items={toList(col.pilots, pilotMap)}
          kind="pilot"
          onSelect={setSelected}
        />
        <CollectionList
          title="Upgrades"
          items={toList(col.upgrades, upgradeMap)}
          kind="upgrade"
          onSelect={setSelected}
        />
      </div>
      <ItemDetailDialog
        selected={selected}
        onClose={() => setSelected(null)}
        shipMap={shipMap}
        pilotMap={pilotMap}
        upgradeMap={upgradeMap}
      />
    </>
  );
}

function AddSingles({
  shipMap,
  pilotMap,
  upgradeMap,
}: {
  shipMap: Map<string, any>;
  pilotMap: Map<string, any>;
  upgradeMap: Map<string, any>;
}) {
  const qc = useQueryClient();
  const listFn = useServerFn(listMySingles);
  const setFn = useServerFn(setMySingleQuantity);
  const { data } = useQuery({ queryKey: ["my-singles"], queryFn: () => listFn() });

  const [kind, setKind] = useState<"ship" | "pilot" | "upgrade">("pilot");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const setMut = useMutation({
    mutationFn: setFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-singles"] });
      qc.invalidateQueries({ queryKey: ["my-collection"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lookup = kind === "ship" ? shipMap : kind === "pilot" ? pilotMap : upgradeMap;
  const options = useMemo(() => {
    if (!query) return [] as { xws: string; name: string; sub?: string }[];
    const q = query.toLowerCase();
    const out: { xws: string; name: string; sub?: string }[] = [];
    for (const [xws, item] of lookup.entries()) {
      const name = item.name ?? xws;
      if (!name.toLowerCase().includes(q)) continue;
      const sub =
        kind === "pilot"
          ? `${item.faction ?? ""} · ${item.ship_xws ?? ""}`
          : kind === "upgrade"
          ? `${item.slot ?? ""}${item.points != null ? ` · ${item.points}pt` : ""}`
          : Array.isArray(item.faction)
          ? item.faction.join(", ")
          : item.faction;
      out.push({ xws, name, sub });
      if (out.length >= 20) break;
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [query, lookup, kind]);

  const singles = data?.singles ?? [];
  const nameOf = (kind: string, xws: string) => {
    const m = kind === "ship" ? shipMap : kind === "pilot" ? pilotMap : upgradeMap;
    return m.get(xws)?.name ?? xws;
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div>
          <h2 className="font-semibold">Add singles</h2>
          <p className="text-xs text-muted-foreground">
            Track individual ship miniatures, pilot cards, or upgrade cards you bought on their own.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={kind} onValueChange={(v) => { setKind(v as any); setQuery(""); }}>
            <TabsList>
              <TabsTrigger value="ship">Ship</TabsTrigger>
              <TabsTrigger value="pilot">Pilot</TabsTrigger>
              <TabsTrigger value="upgrade">Upgrade</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1 min-w-[220px]">
            <Input
              placeholder={`Search ${kind}s…`}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
            {open && options.length > 0 && (
              <div className="absolute z-10 mt-1 w-full max-h-72 overflow-auto rounded-md border bg-popover shadow">
                {options.map((o) => (
                  <button
                    key={o.xws}
                    type="button"
                    className="w-full text-left px-3 py-1.5 hover:bg-accent text-sm flex justify-between gap-2"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const current = singles.find((s) => s.kind === kind && s.xws === o.xws);
                      setMut.mutate({
                        data: { kind, xws: o.xws, quantity: (current?.quantity ?? 0) + 1 },
                      });
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{o.name}</span>
                    {o.sub && <span className="text-xs text-muted-foreground shrink-0">{o.sub}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {singles.length > 0 && (
          <div className="space-y-1 pt-2 border-t">
            <p className="text-xs font-semibold text-muted-foreground">Your singles</p>
            <ul className="divide-y text-sm">
              {singles
                .slice()
                .sort((a, b) =>
                  a.kind === b.kind
                    ? nameOf(a.kind, a.xws).localeCompare(nameOf(b.kind, b.xws))
                    : a.kind.localeCompare(b.kind),
                )
                .map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-1.5 gap-2">
                    <div className="min-w-0">
                      <span className="text-xs uppercase text-muted-foreground mr-2">{s.kind}</span>
                      <span className="truncate">{nameOf(s.kind, s.xws)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0 text-xs"
                        onClick={() =>
                          setMut.mutate({
                            data: { kind: s.kind, xws: s.xws, quantity: Math.max(0, s.quantity - 1) },
                          })
                        }
                      >
                        −
                      </Button>
                      <span className="w-8 text-center tabular-nums">×{s.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0 text-xs"
                        onClick={() =>
                          setMut.mutate({
                            data: { kind: s.kind, xws: s.xws, quantity: s.quantity + 1 },
                          })
                        }
                      >
                        +
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-muted-foreground"
                        onClick={() =>
                          setMut.mutate({ data: { kind: s.kind, xws: s.xws, quantity: 0 } })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CollectionList({
  title,
  items,
  kind,
  onSelect,
}: {
  title: string;
  items: { xws: string; qty: number; name: string }[];
  kind: "ship" | "pilot" | "upgrade";
  onSelect: (item: SelectedItem) => void;
}) {
  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <h2 className="font-semibold">
          {title} <span className="text-xs text-muted-foreground">({items.length})</span>
        </h2>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing yet — mark packages you own.</p>
        ) : (
          <ul className="divide-y text-sm">
            {items.map((i) => (
              <li key={i.xws} className="flex items-center justify-between py-1">
                <button
                  className="truncate text-left hover:underline focus:outline-none"
                  onClick={() => onSelect({ kind, xws: i.xws, name: i.name })}
                >
                  {i.name}
                </button>
                <span className="ml-2 shrink-0 text-muted-foreground tabular-nums">× {i.qty}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ItemDetailDialog({
  selected,
  onClose,
  shipMap,
  pilotMap,
  upgradeMap,
}: {
  selected: SelectedItem | null;
  onClose: () => void;
  shipMap: Map<string, any>;
  pilotMap: Map<string, any>;
  upgradeMap: Map<string, any>;
}) {
  const detailFn = useServerFn(getItemDetails);
  const { data, isLoading } = useQuery({
    queryKey: ["item-detail", selected?.kind, selected?.xws],
    queryFn: () => detailFn({ data: { kind: selected!.kind, xws: selected!.xws } }),
    enabled: !!selected,
  });

  const detail =
    selected?.kind === "ship"
      ? shipMap.get(selected.xws)
      : selected?.kind === "pilot"
      ? pilotMap.get(selected.xws)
      : upgradeMap.get(selected?.xws ?? "");

  return (
    <Dialog open={!!selected} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{selected?.name}</DialogTitle>
        </DialogHeader>
        <ItemDetailBody kind={selected?.kind} detail={detail} />
        <div className="space-y-1 pt-2 border-t">
          <p className="text-xs font-semibold text-muted-foreground">Found in</p>
          {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {!isLoading && (data?.foundIn.length ?? 0) === 0 && (
            <p className="text-xs text-muted-foreground">Not found in any package.</p>
          )}
          <ul className="space-y-0.5">
            {data?.foundIn.map((p: any, i: number) => (
              <li key={i} className="text-sm flex items-center justify-between">
                <span>{p.name}{p.wave ? <span className="text-xs text-muted-foreground ml-1">({p.wave})</span> : null}</span>
                <span className="text-muted-foreground tabular-nums">×{p.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ItemDetailBody({ kind, detail }: { kind?: string; detail: any }) {
  if (!detail) return null;
  if (kind === "ship") return <ShipDetail ship={detail} />;
  if (kind === "pilot") return <PilotDetail pilot={detail} />;
  if (kind === "upgrade") return <UpgradeDetail upgrade={detail} />;
  return null;
}

function ShipDetail({ ship }: { ship: any }) {
  const factions = Array.isArray(ship.faction) ? ship.faction.join(", ") : ship.faction;
  return (
    <div className="space-y-1 text-sm">
      {factions && <p className="text-muted-foreground">{factions}</p>}
      {ship.size && <p>Size: {ship.size}</p>}
      <div className="flex flex-wrap gap-3 text-xs">
        {ship.attack != null && <span>ATK {ship.attack}</span>}
        {ship.agility != null && <span>AGI {ship.agility}</span>}
        {ship.hull != null && <span>HUL {ship.hull}</span>}
        {ship.shields != null && <span>SHD {ship.shields}</span>}
      </div>
    </div>
  );
}

function PilotDetail({ pilot }: { pilot: any }) {
  return (
    <div className="space-y-1 text-sm">
      {pilot.image && (
        <img src={pilot.image} alt={pilot.name} className="h-40 w-auto rounded object-contain" />
      )}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {pilot.faction && <span>{pilot.faction}</span>}
        {pilot.ship_xws && <span>{pilot.ship_xws}</span>}
        {pilot.skill != null && <span>Skill {pilot.skill}</span>}
        {pilot.points != null && <span>{pilot.points}pt</span>}
      </div>
      {pilot.slots?.length > 0 && (
        <p className="text-xs text-muted-foreground">Slots: {pilot.slots.join(", ")}</p>
      )}
      {pilot.text && (
        <p
          className="text-xs text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: pilot.text }}
        />
      )}
    </div>
  );
}

function UpgradeDetail({ upgrade }: { upgrade: any }) {
  return (
    <div className="space-y-1 text-sm">
      {upgrade.image && (
        <img src={upgrade.image} alt={upgrade.name} className="h-40 w-auto rounded object-contain" />
      )}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {upgrade.slot && <span>{upgrade.slot}</span>}
        {upgrade.points != null && <span>{upgrade.points}pt</span>}
        {upgrade.faction && <span>{upgrade.faction}</span>}
        {upgrade.ship_xws && <span>{upgrade.ship_xws}</span>}
      </div>
      {upgrade.text && (
        <p
          className="text-xs text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: upgrade.text }}
        />
      )}
    </div>
  );
}
