import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  importShips,
  importPilots,
  importUpgrades,
  listShips,
  listPilots,
  listUpgrades,
  updateShip,
  updatePilot,
  updateUpgrade,
} from "@/lib/catalog.functions";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ImageUpload } from "@/components/image-upload";

export const Route = createFileRoute("/_authenticated/admin/catalog")({
  head: () => ({ meta: [{ title: "Catalog — X-Wing League" }] }),
  component: CatalogPage,
});

function CatalogPage() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <p className="text-muted-foreground">Admin only.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Catalog</h1>
      <Tabs defaultValue="ships">
        <TabsList>
          <TabsTrigger value="ships">Ships</TabsTrigger>
          <TabsTrigger value="pilots">Pilots</TabsTrigger>
          <TabsTrigger value="upgrades">Upgrades</TabsTrigger>
        </TabsList>
        <TabsContent value="ships" className="space-y-6">
          <ImportCard label="ships" />
          <ShipsList />
        </TabsContent>
        <TabsContent value="pilots" className="space-y-6">
          <ImportCard label="pilots" />
          <ImageUploader kind="pilots" />
          <PilotsList />
        </TabsContent>
        <TabsContent value="upgrades" className="space-y-6">
          <ImportCard label="upgrades" />
          <ImageUploader kind="upgrades" />
          <UpgradesList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ImportCard({ label }: { label: "ships" | "pilots" | "upgrades" }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const ships = useServerFn(importShips);
  const pilots = useServerFn(importPilots);
  const upgrades = useServerFn(importUpgrades);
  const fn = label === "ships" ? ships : label === "pilots" ? pilots : upgrades;
  const queryKey = [label];
  const m = useMutation({
    mutationFn: (items: unknown[]) =>
      fn({ data: { items: items as never } }),
    onSuccess: (res: { count: number }) => {
      toast.success(`Imported ${res.count} ${label}`);
      setText("");
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bulk import {label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Paste a JSON array of {label}. Upserts by <code>xws</code>, so re-uploading patches data.
        </p>
        <Textarea
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='[ { "xws": "xwing", "name": "X-Wing", ... } ]'
          className="font-mono text-xs"
        />
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setText(await f.text());
              e.target.value = "";
            }}
            className="text-sm"
          />
          <Button
            disabled={!text.trim() || m.isPending}
            onClick={() => {
              try {
                const parsed = JSON.parse(text);
                if (!Array.isArray(parsed)) throw new Error("Expected an array");
                m.mutate(parsed);
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            {m.isPending ? "Importing…" : "Import"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function useSearchFilter<T extends { name: string }>(rows: T[]) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () =>
      q
        ? rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
        : rows,
    [rows, q],
  );
  return { q, setQ, filtered };
}

function ShipsList() {
  const fn = useServerFn(listShips);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["ships"], queryFn: () => fn() });
  const { q, setQ, filtered } = useSearchFilter(data?.ships ?? []);
  const update = useServerFn(updateShip);
  const m = useMutation({
    mutationFn: update,
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["ships"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <div className="space-y-2">
      <Input placeholder="Search ships…" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="divide-y rounded-md border">
        {filtered.map((s: any) => (
          <li key={s.xws} className="flex items-center justify-between p-2 text-sm">
            <span>
              <span className="font-medium">{s.name}</span>{" "}
              <span className="text-muted-foreground text-xs">({s.xws})</span>
            </span>
            <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>Edit</Button>
          </li>
        ))}
        {filtered.length === 0 && <li className="p-3 text-sm text-muted-foreground">No ships.</li>}
      </ul>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit ship</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <XwsDisplay xws={editing.xws} hint="Name your image file: " ext="png" />
              <Field label="Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
              <Field label="Size" value={editing.size ?? ""} onChange={(v) => setEditing({ ...editing, size: v })} />
              <NumField label="Attack" value={editing.attack} onChange={(v) => setEditing({ ...editing, attack: v })} />
              <NumField label="Agility" value={editing.agility} onChange={(v) => setEditing({ ...editing, agility: v })} />
              <NumField label="Hull" value={editing.hull} onChange={(v) => setEditing({ ...editing, hull: v })} />
              <NumField label="Shields" value={editing.shields} onChange={(v) => setEditing({ ...editing, shields: v })} />
              <ImageUpload
                label="Ship image"
                value={editing.image ?? ""}
                onChange={(url) => setEditing({ ...editing, image: url })}
                pathBase={`ships/${editing.xws}`}
                previewClassName="h-40 w-auto"
              />
              <ImageUpload
                label="Maneuver dial image"
                value={editing.dial_image ?? ""}
                onChange={(url) => setEditing({ ...editing, dial_image: url })}
                pathBase={`ships/${editing.xws}-dial`}
                previewClassName="h-40 w-auto"
              />
            </div>
          )}
          <DialogFooter>
            <Button
              disabled={m.isPending}
              onClick={() => {
                if (!editing) return;
                m.mutate({
                  data: {
                    xws: editing.xws,
                    patch: {
                      name: editing.name,
                      size: editing.size,
                      attack: editing.attack,
                      agility: editing.agility,
                      hull: editing.hull,
                      shields: editing.shields,
                      image: editing.image || null,
                      dial_image: editing.dial_image || null,
                    },
                  },
                });
                setEditing(null);
              }}
            >Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PilotsList() {
  const fn = useServerFn(listPilots);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["pilots"], queryFn: () => fn() });
  const { q, setQ, filtered } = useSearchFilter(data?.pilots ?? []);
  const update = useServerFn(updatePilot);
  const m = useMutation({
    mutationFn: update,
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["pilots"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <div className="space-y-2">
      <Input placeholder="Search pilots…" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="divide-y rounded-md border max-h-[600px] overflow-y-auto">
        {filtered.map((p: any) => (
          <li key={p.xws} className="flex items-center justify-between p-2 text-sm">
            <span>
              <span className="font-medium">{p.name}</span>{" "}
              <span className="text-muted-foreground text-xs">
                {p.faction} · {p.ship_xws} · skill {p.skill} · {p.points}pt
              </span>
            </span>
            <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
          </li>
        ))}
        {filtered.length === 0 && <li className="p-3 text-sm text-muted-foreground">No pilots.</li>}
      </ul>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit pilot</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <XwsDisplay xws={editing.xws} hint="Name your image file: " ext="png" />
              <Field label="Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
              <Field label="Faction" value={editing.faction} onChange={(v) => setEditing({ ...editing, faction: v })} />
              <Field label="Ship xws" value={editing.ship_xws} onChange={(v) => setEditing({ ...editing, ship_xws: v })} />
              <NumField label="Skill" value={editing.skill} onChange={(v) => setEditing({ ...editing, skill: v })} />
              <NumField label="Points" value={editing.points} onChange={(v) => setEditing({ ...editing, points: v })} />
              <Field label="Slots (comma-separated)" value={(editing.slots ?? []).join(", ")} onChange={(v) => setEditing({ ...editing, slots: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
              <div className="space-y-1">
                <Label>Card text (HTML allowed)</Label>
                <Textarea rows={4} value={editing.text ?? ""} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
              </div>
              <Field label="Image URL" value={editing.image ?? ""} onChange={(v) => setEditing({ ...editing, image: v })} />
            </div>
          )}
          <DialogFooter>
            <Button
              disabled={m.isPending}
              onClick={() => {
                if (!editing) return;
                m.mutate({
                  data: {
                    xws: editing.xws,
                    patch: {
                      name: editing.name,
                      faction: editing.faction,
                      ship_xws: editing.ship_xws,
                      skill: editing.skill,
                      points: editing.points,
                      slots: editing.slots,
                      text: editing.text,
                      image: editing.image,
                    },
                  },
                });
                setEditing(null);
              }}
            >Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UpgradesList() {
  const fn = useServerFn(listUpgrades);
  const shipsFn = useServerFn(listShips);
  const { data: shipsData } = useQuery({ queryKey: ["ships"], queryFn: () => shipsFn() });
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["upgrades"], queryFn: () => fn() });
  const { q, setQ, filtered } = useSearchFilter(data?.upgrades ?? []);
  const [slotFilter, setSlotFilter] = useState("");
  const allSlots = useMemo(
    () => Array.from(new Set((data?.upgrades ?? []).map((u: any) => u.slot as string))).sort(),
    [data],
  );
  const displayedUpgrades = useMemo(
    () => slotFilter ? filtered.filter((u: any) => u.slot === slotFilter) : filtered,
    [filtered, slotFilter],
  );
  const update = useServerFn(updateUpgrade);
  const m = useMutation({
    mutationFn: update,
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["upgrades"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input placeholder="Search upgrades…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={slotFilter}
          onChange={(e) => setSlotFilter(e.target.value)}
        >
          <option value="">All slots</option>
          {allSlots.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <ul className="divide-y rounded-md border max-h-[600px] overflow-y-auto">
        {displayedUpgrades.map((u: any) => (
          <li key={u.xws} className="flex items-center justify-between p-2 text-sm">
            <span>
              <span className="font-medium">{u.name}</span>{" "}
              <span className="text-muted-foreground text-xs">{u.slot} · {u.points}pt</span>
            </span>
            <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>Edit</Button>
          </li>
        ))}
        {displayedUpgrades.length === 0 && <li className="p-3 text-sm text-muted-foreground">No upgrades.</li>}
      </ul>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>Edit upgrade</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1">
              <div className="md:col-span-2">
                <XwsDisplay xws={editing.xws} hint="Name your image file: " ext="png" />
              </div>
              <Field label="Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
              <Field label="Slot" value={editing.slot} onChange={(v) => setEditing({ ...editing, slot: v })} />
              <NumField label="Points" value={editing.points} onChange={(v) => setEditing({ ...editing, points: v })} />
              <NumField label="Attack" value={editing.attack ?? 0} onChange={(v) => setEditing({ ...editing, attack: v })} />
              <Field label="Range" value={editing.range ?? ""} onChange={(v) => setEditing({ ...editing, range: v })} />
              <div className="md:col-span-2 space-y-1">
                <Field label="Image URL" value={editing.image ?? ""} onChange={(v) => setEditing({ ...editing, image: v })} />
                {editing.image && (
                  <img
                    src={editing.image}
                    alt={editing.name}
                    className="h-48 w-auto rounded object-contain bg-muted/30"
                  />
                )}
              </div>
              <div className="space-y-1">
                <Label>Faction restriction</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editing.faction ?? ""}
                  onChange={(e) => setEditing({ ...editing, faction: e.target.value || null })}
                >
                  <option value="">Any faction</option>
                  <option value="Galactic Empire">Galactic Empire</option>
                  <option value="First Order">First Order</option>
                  <option value="Rebel Alliance">Rebel Alliance</option>
                  <option value="Resistance">Resistance</option>
                  <option value="Scum and Villainy">Scum and Villainy</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Ship restriction</Label>
                <input
                  list="ship-xws-options"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editing.ship_xws ?? ""}
                  onChange={(e) => setEditing({ ...editing, ship_xws: e.target.value || null })}
                  placeholder="Any ship (leave blank)"
                />
                <datalist id="ship-xws-options">
                  {(shipsData?.ships ?? []).map((s: any) => (
                    <option key={s.xws} value={s.xws}>{s.name}</option>
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground">
                  Leave blank for any ship. Pick a ship from the list, or type a prefix (e.g. <code>tie</code> matches all TIE ships).
                </p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Grants extra slots</Label>
                <p className="text-xs text-muted-foreground">
                  Number of extra slots this upgrade grants per type. Use a negative number to remove a slot from the pilot.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 rounded-md border p-2 text-xs">
                  {[
                    "Astromech","Cannon","Crew","Device","Force Power","Gunner",
                    "Hardpoint","Illicit","Missile","Modification","Sensor",
                    "Talent","Tech","Title","Torpedo","Turret","Configuration",
                  ].map((slot) => {
                    const grants: string[] = editing.grants ?? [];
                    const positives = grants.filter((s) => s === slot).length;
                    const negatives = grants.filter((s) => s === `-${slot}`).length;
                    const count = positives - negatives;
                    return (
                      <label key={slot} className="flex items-center justify-between gap-1">
                        <span>{slot}</span>
                        <input
                          type="number"
                          min={-9}
                          max={9}
                          value={count}
                          onChange={(e) => {
                            const raw = parseInt(e.target.value);
                            const n = Number.isNaN(raw) ? 0 : Math.max(-9, Math.min(9, raw));
                            const others = grants.filter((s) => s !== slot && s !== `-${slot}`);
                            const additions =
                              n >= 0
                                ? Array(n).fill(slot)
                                : Array(-n).fill(`-${slot}`);
                            const next = [...others, ...additions];
                            setEditing({ ...editing, grants: next });
                          }}
                          className="w-14 rounded border border-input bg-background px-1 py-0.5 text-xs"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Card text (HTML allowed)</Label>
                <Textarea rows={4} value={editing.text ?? ""} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter className="mt-2 border-t pt-3">
            <Button
              disabled={m.isPending}
              onClick={() => {
                if (!editing) return;
                m.mutate({
                  data: {
                    xws: editing.xws,
                    patch: {
                      name: editing.name,
                      slot: editing.slot,
                      points: editing.points,
                      attack: editing.attack || null,
                      range: editing.range || null,
                      text: editing.text,
                      image: editing.image,
                      faction: editing.faction ?? null,
                      ship_xws: editing.ship_xws ?? null,
                      grants: editing.grants ?? [],
                    },
                  },
                });
                setEditing(null);
              }}
            >Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function XwsDisplay({ xws, hint, ext }: { xws: string; hint?: string; ext?: string }) {
  const filename = ext ? `${xws}.${ext}` : xws;
  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
      <div className="text-muted-foreground">xws id</div>
      <code className="text-sm font-mono">{xws}</code>
      {hint && (
        <div className="mt-1 text-muted-foreground">
          {hint}<code className="font-mono">{filename}</code>
        </div>
      )}
    </div>
  );
}

function ImageUploader({ kind }: { kind: "pilots" | "upgrades" }) {
  const qc = useQueryClient();
  const listFn = useServerFn(kind === "pilots" ? listPilots : listUpgrades) as any;
  const updateFn = useServerFn(kind === "pilots" ? updatePilot : updateUpgrade) as any;
  const { data } = useQuery<any>({
    queryKey: [kind],
    queryFn: () => listFn(),
  });
  const items: any[] =
    (kind === "pilots" ? (data as any)?.pilots : (data as any)?.upgrades) ?? [];
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  const xwsByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of items) m.set(it.xws.toLowerCase(), it.xws);
    return m;
  }, [items]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setProgress({ done: 0, total: files.length });
    let ok = 0;
    const missing: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const base = f.name.replace(/\.[^.]+$/, "");
      const xws = xwsByKey.get(base.toLowerCase());
      if (!xws) {
        missing.push(f.name);
        setProgress({ done: i + 1, total: files.length });
        continue;
      }
      const ext = (f.name.split(".").pop() || "png").toLowerCase();
      const path = `${kind}/${xws}.${ext}`;
      const up = await supabase.storage
        .from("catalog-images")
        .upload(path, f, { upsert: true, contentType: f.type || "image/png" });
      if (up.error) {
        toast.error(`${f.name}: ${up.error.message}`);
        setProgress({ done: i + 1, total: files.length });
        continue;
      }
      const { data: pub } = supabase.storage.from("catalog-images").getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      try {
        await updateFn({ data: { xws, patch: { image: url } as any } });
        ok++;
      } catch (e) {
        toast.error(`${f.name}: ${(e as Error).message}`);
      }
      setProgress({ done: i + 1, total: files.length });
    }
    setBusy(false);
    qc.invalidateQueries({ queryKey: [kind] });
    toast.success(`Uploaded ${ok}/${files.length} images`);
    if (missing.length) {
      toast.warning(
        `No match for ${missing.length} file(s): ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "…" : ""}`,
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload {kind} images</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Select PNGs (or JPGs). The filename (without extension) must match the{" "}
          <code>xws</code> id, e.g. <code>lukeskywalker.png</code>. Existing images are
          overwritten and the <code>image</code> column is updated automatically.
        </p>
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
          className="text-sm"
        />
        {busy && (
          <p className="text-xs text-muted-foreground">
            Uploading {progress.done}/{progress.total}…
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number | null | undefined; onChange: (v: number | null) => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : parseInt(e.target.value))}
      />
    </div>
  );
}