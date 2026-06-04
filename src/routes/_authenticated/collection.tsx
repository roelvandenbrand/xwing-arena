import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  listPackages,
  listMyOwnership,
  setMyPackageQuantity,
  getMyCollection,
} from "@/lib/packages.functions";
import { listShips, listPilots, listUpgrades } from "@/lib/catalog.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {list.map((p: any) => {
              const qty = ownMap.get(p.id) ?? 0;
              return (
                <Card key={p.id}>
                  <CardContent className="p-3 space-y-2">
                    <div className="aspect-[4/3] rounded border bg-muted/30 overflow-hidden flex items-center justify-center">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs text-muted-foreground">no image</span>
                      )}
                    </div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.ship_count} ship{p.ship_count === 1 ? "" : "s"}, {p.pilot_count}{" "}
                      pilot{p.pilot_count === 1 ? "" : "s"}, {p.upgrade_count} upgrade
                      {p.upgrade_count === 1 ? "" : "s"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        disabled={qty === 0}
                        onClick={() =>
                          setMut.mutate({
                            data: { package_id: p.id, quantity: Math.max(0, qty - 1) },
                          })
                        }
                      >
                        −
                      </Button>
                      <span className="w-10 text-center font-medium">
                        {qty === 0 ? "—" : `× ${qty}`}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() =>
                          setMut.mutate({
                            data: { package_id: p.id, quantity: qty + 1 },
                          })
                        }
                      >
                        +
                      </Button>
                      {qty === 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          Not owned
                        </span>
                      )}
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

function WhatIHave() {
  const collFn = useServerFn(getMyCollection);
  const { data } = useQuery({ queryKey: ["my-collection"], queryFn: () => collFn() });

  const shipsFn = useServerFn(listShips);
  const pilotsFn = useServerFn(listPilots);
  const upgradesFn = useServerFn(listUpgrades);
  const { data: ships } = useQuery({ queryKey: ["ships"], queryFn: () => shipsFn() });
  const { data: pilots } = useQuery({ queryKey: ["pilots"], queryFn: () => pilotsFn() });
  const { data: upgrades } = useQuery({ queryKey: ["upgrades"], queryFn: () => upgradesFn() });

  const col = data?.collection ?? { ships: {}, pilots: {}, upgrades: {} };

  const shipName = new Map((ships?.ships ?? []).map((s: any) => [s.xws, s.name]));
  const pilotName = new Map((pilots?.pilots ?? []).map((p: any) => [p.xws, p.name]));
  const upgradeName = new Map((upgrades?.upgrades ?? []).map((u: any) => [u.xws, u.name]));

  const list = (m: Record<string, number>, names: Map<string, string>) =>
    Object.entries(m)
      .map(([xws, qty]) => ({ xws, qty, name: names.get(xws) ?? xws }))
      .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <CollectionList title="Ships" items={list(col.ships, shipName as any)} />
      <CollectionList title="Pilots" items={list(col.pilots, pilotName as any)} />
      <CollectionList title="Upgrades" items={list(col.upgrades, upgradeName as any)} />
    </div>
  );
}

function CollectionList({
  title,
  items,
}: {
  title: string;
  items: { xws: string; qty: number; name: string }[];
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
                <span className="truncate">{i.name}</span>
                <span className="text-muted-foreground tabular-nums">× {i.qty}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}