import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  listPackages,
  createPackage,
  deletePackage,
} from "@/lib/packages.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/packages/")({
  head: () => ({ meta: [{ title: "Packages — X-Wing League" }] }),
  component: PackagesAdminPage,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 60);
}

function PackagesAdminPage() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <p className="text-muted-foreground">Admin only.</p>;

  const qc = useQueryClient();
  const listFn = useServerFn(listPackages);
  const { data, isLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: () => listFn(),
  });

  const [search, setSearch] = useState("");
  const [waveFilter, setWaveFilter] = useState<string>("all");

  const waves = useMemo(() => {
    const set = new Set<string>();
    for (const p of data?.packages ?? []) if (p.wave) set.add(p.wave);
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    return (data?.packages ?? [])
      .filter((p: any) => waveFilter === "all" || p.wave === waveFilter)
      .filter((p: any) => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  }, [data, search, waveFilter]);

  const createFn = useServerFn(createPackage);
  const deleteFn = useServerFn(deletePackage);
  const delMut = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      toast.success("Package deleted");
      qc.invalidateQueries({ queryKey: ["packages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Packages</h1>
        <CreatePackageDialog
          onCreate={async (vals) => {
            const res = await createFn({ data: vals });
            toast.success("Package created");
            qc.invalidateQueries({ queryKey: ["packages"] });
            return res.id;
          }}
        />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search packages…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={waveFilter} onValueChange={setWaveFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All waves" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All waves</SelectItem>
            {waves.map((w) => (
              <SelectItem key={w} value={w}>
                {w}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      <div className="space-y-2">
        {filtered.map((p: any) => (
          <Card key={p.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 rounded border bg-muted/30 overflow-hidden flex items-center justify-center">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">no img</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.wave ?? "—"} · {p.ship_count} ship{p.ship_count === 1 ? "" : "s"},{" "}
                  {p.pilot_count} pilot{p.pilot_count === 1 ? "" : "s"}, {p.upgrade_count}{" "}
                  upgrade{p.upgrade_count === 1 ? "" : "s"} · xws: {p.xws}
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/packages/$id" params={{ id: p.id }}>
                  Edit
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (confirm(`Delete package "${p.name}"? This cannot be undone.`)) {
                    delMut.mutate({ data: { id: p.id } });
                  }
                }}
              >
                Delete
              </Button>
            </CardContent>
          </Card>
        ))}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No packages match.</p>
        )}
      </div>
    </div>
  );
}

function CreatePackageDialog({
  onCreate,
}: {
  onCreate: (vals: {
    xws: string;
    name: string;
    wave: string | null;
    release_date: string | null;
    image: string | null;
  }) => Promise<string>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [xws, setXws] = useState("");
  const [xwsTouched, setXwsTouched] = useState(false);
  const [wave, setWave] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setName("");
    setXws("");
    setXwsTouched(false);
    setWave("");
    setReleaseDate("");
    setImage("");
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
        <Button>New package</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create package</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!xwsTouched) setXws(slugify(e.target.value));
              }}
            />
          </div>
          <div>
            <Label>xws (unique code)</Label>
            <Input
              value={xws}
              onChange={(e) => {
                setXws(e.target.value);
                setXwsTouched(true);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Wave</Label>
              <Input value={wave} onChange={(e) => setWave(e.target.value)} placeholder="e.g. Wave 1" />
            </div>
            <div>
              <Label>Release date</Label>
              <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Image URL</Label>
            <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={busy || !name.trim() || !xws.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await onCreate({
                  name: name.trim(),
                  xws: xws.trim(),
                  wave: wave.trim() || null,
                  release_date: releaseDate || null,
                  image: image.trim() || null,
                });
                setOpen(false);
                reset();
              } catch (e: any) {
                toast.error(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
