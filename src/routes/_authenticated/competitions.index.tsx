import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listMyCompetitions,
  createCompetition,
} from "@/lib/competitions.functions";
import { CompetitionCard } from "@/components/competition-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/competitions/")({
  head: () => ({ meta: [{ title: "My Competitions — X-Wing League" }] }),
  component: CompetitionsPage,
});

function CompetitionsPage() {
  const { isAdmin, user } = useAuth();
  const fn = useServerFn(listMyCompetitions);
  const { data, isLoading } = useQuery({
    queryKey: ["my-competitions", user?.id],
    queryFn: () => fn(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Competitions</h1>
        {isAdmin && <CreateDialog />}
      </div>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {!isLoading && (data?.competitions.length ?? 0) === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p>You haven't joined any competitions yet.</p>
          <Button asChild variant="link">
            <Link to="/browse">Browse open competitions</Link>
          </Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.competitions.map((c) => {
          const pending = data.pendingIds?.includes(c.id);
          return (
            <CompetitionCard
              key={c.id}
              {...c}
              badge={pending ? <span className="text-xs text-amber-600">pending</span> : null}
            />
          );
        })}
      </div>
    </div>
  );
}

function CreateDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState<"1.0" | "2.0" | "2.5">("1.0");
  const [points, setPoints] = useState(100);
  const qc = useQueryClient();
  const fn = useServerFn(createCompetition);
  const m = useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success("Competition created");
      qc.invalidateQueries({ queryKey: ["my-competitions"] });
      setOpen(false);
      setName("");
      setDescription("");
      setRules("1.0");
      setPoints(100);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New competition</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create competition</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rules version</Label>
              <Select value={rules} onValueChange={(v) => setRules(v as typeof rules)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.0">1.0 (First Edition)</SelectItem>
                  <SelectItem value="2.0">2.0</SelectItem>
                  <SelectItem value="2.5">2.5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Squad points limit</Label>
              <Input
                type="number"
                min={1}
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() =>
              m.mutate({
                data: {
                  name,
                  description: description || null,
                  rules_version: rules,
                  squad_points_limit: points,
                },
              })
            }
            disabled={m.isPending || !name.trim()}
          >
            {m.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}