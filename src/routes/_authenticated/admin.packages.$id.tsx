import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  getPackage,
  updatePackage,
  setPackageContent,
  removePackageContent,
} from "@/lib/packages.functions";
import { listShips, listPilots, listUpgrades } from "@/lib/catalog.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/packages/$id")({
  head: () => ({ meta: [{ title: "Edit Package — X-Wing League" }] }),
  component: EditPackagePage,
});

type Kind = "ship" | "pilot" | "upgrade";

function EditPackagePage() {
  const { isAdmin } = useAuth();
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const getFn = useServerFn(getPackage);
  const { data, isLoading } = useQuery({
    queryKey: ["package", id],
    queryFn: () => getFn({ data: { id } }),
    enabled: isAdmin,
  });

  const updFn = useServerFn(updatePackage);
  const updMut = useMutation({
    mutationFn: updFn,
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["package", id] });
      qc.invalidateQueries({ queryKey: ["packages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [name, setName] = useState("");
  const [xws, setXws] = useState("");
  const [wave, setWave] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [image, setImage] = useState("");
  const [loadedId, setLoadedId] = useState<string | null>(null);

  // Populate form when data first loads
  if (data?.pkg && loadedId !== data.pkg.id) {
    setName(data.pkg.name);
    setXws(data.pkg.xws);
    setWave(data.pkg.wave ?? "");
    setReleaseDate(data.pkg.release_date ?? "");
    setImage(data.pkg.image ?? "");
    setLoadedId(data.pkg.id);
  }

  if (!isAdmin) return <p className="text-muted-foreground">Admin only.</p>;
  if (isLoading || !data) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit package</h1>
        <Button asChild variant="outline">
          <Link to="/admin/packages">← Back</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>xws</Label>
              <Input value={xws} onChange={(e) => setXws(e.target.value)} />
            </div>
            <div>
              <Label>Wave</Label>
              <Input value={wave} onChange={(e) => setWave(e.target.value)} />
            </div>
            <div>
              <Label>Release date</Label>
              <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Image</Label>
              <ImageUpload
                value={image}
                onChange={(url) => setImage(url)}
                pathBase={`packages/${(xws || data.pkg.xws).trim()}`}
                previewClassName="h-40 w-auto"
              />
            </div>
          </div>
          <div className="mt-3">
            <Button
              onClick={() =>
                updMut.mutate({
                  data: {
                    id,
                    patch: {
                      name: name.trim(),
                      xws: xws.trim(),
                      wave: wave.trim() || null,
                      release_date: releaseDate || null,
                      image: image.trim() || null,
                    },
                  },
                })
              }
            >
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <ContentsSection packageId={id} kind="ship" rows={data.ships} />
      <ContentsSection packageId={id} kind="pilot" rows={data.pilots} />
      <ContentsSection packageId={id} kind="upgrade" rows={data.upgrades} />
    </div>
  );
}

function ContentsSection({
  packageId,
  kind,
  rows,
}: {
  packageId: string;
  kind: Kind;
  rows: any[];
}) {
  const qc = useQueryClient();
  const shipsFn = useServerFn(listShips);
  const pilotsFn = useServerFn(listPilots);
  const upgradesFn = useServerFn(listUpgrades);

  const catalog = useQuery({
    queryKey: [kind === "ship" ? "ships" : kind === "pilot" ? "pilots" : "upgrades"],
    queryFn: async () =>
      kind === "ship"
        ? ((await shipsFn()) as any)
        : kind === "pilot"
          ? ((await pilotsFn()) as any)
          : ((await upgradesFn()) as any),
  });

  const items = useMemo(() => {
    if (!catalog.data) return [] as any[];
    if (kind === "ship") return (catalog.data as any).ships as any[];
    if (kind === "pilot") return (catalog.data as any).pilots as any[];
    return (catalog.data as any).upgrades as any[];
  }, [catalog.data, kind]);

  const byXws = useMemo(() => new Map(items.map((i: any) => [i.xws, i])), [items]);

  const col = kind === "ship" ? "ship_xws" : kind === "pilot" ? "pilot_xws" : "upgrade_xws";
  const label = kind === "ship" ? "Ships" : kind === "pilot" ? "Pilots" : "Upgrades";

  const setFn = useServerFn(setPackageContent);
  const rmFn = useServerFn(removePackageContent);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["package", packageId] });

  const setMut = useMutation({
    mutationFn: setFn,
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const rmMut = useMutation({
    mutationFn: rmFn,
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const [q, setQ] = useState("");
  const existing = new Set(rows.map((r) => r[col]));
  const suggestions = useMemo(() => {
    if (!q.trim()) return [] as any[];
    const needle = q.toLowerCase();
    return items
      .filter((i: any) => !existing.has(i.xws) && i.name.toLowerCase().includes(needle))
      .slice(0, 10);
  }, [items, q, existing]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {label} ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Input
            placeholder={`Add ${kind}… (type to search)`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-md border bg-popover shadow">
              {suggestions.map((s: any) => (
                <button
                  key={s.xws}
                  type="button"
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => {
                    setMut.mutate({
                      data: { kind, package_id: packageId, xws: s.xws, quantity: 1 },
                    });
                    setQ("");
                  }}
                >
                  <span className="font-medium">{s.name}</span>{" "}
                  <span className="text-xs text-muted-foreground">({s.xws})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">None.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {rows.map((r) => {
              const xwsVal = r[col];
              const it: any = byXws.get(xwsVal);
              return (
                <li key={r.id} className="flex items-center justify-between gap-2 p-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{it?.name ?? xwsVal}</div>
                    <div className="text-xs text-muted-foreground truncate">{xwsVal}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() =>
                        setMut.mutate({
                          data: {
                            kind,
                            package_id: packageId,
                            xws: xwsVal,
                            quantity: Math.max(1, r.quantity - 1),
                          },
                        })
                      }
                    >
                      −
                    </Button>
                    <span className="w-6 text-center">{r.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() =>
                        setMut.mutate({
                          data: {
                            kind,
                            package_id: packageId,
                            xws: xwsVal,
                            quantity: r.quantity + 1,
                          },
                        })
                      }
                    >
                      +
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        rmMut.mutate({ data: { kind, package_id: packageId, xws: xwsVal } })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}