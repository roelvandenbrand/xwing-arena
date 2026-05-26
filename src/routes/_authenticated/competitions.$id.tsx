import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  getCompetition,
  decideJoinRequest,
  removeMember,
  setCompetitionStatus,
  deleteCompetition,
  adminJoinCompetition,
} from "@/lib/competitions.functions";
import { logGame, decideGame, deleteGame, FACTIONS } from "@/lib/games.functions";
import { computeStandings } from "@/lib/standings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/competition-card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/competitions/$id")({
  head: () => ({ meta: [{ title: "Competition — X-Wing League" }] }),
  component: CompetitionDetail,
});

function CompetitionDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fn = useServerFn(getCompetition);
  const { data, isLoading, error } = useQuery({
    queryKey: ["competition", id],
    queryFn: () => fn({ data: { id } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["competition", id] });

  const decideMember = useServerFn(decideJoinRequest);
  const removeMemberFn = useServerFn(removeMember);
  const setStatusFn = useServerFn(setCompetitionStatus);
  const deleteCompFn = useServerFn(deleteCompetition);
  const decideGameFn = useServerFn(decideGame);
  const deleteGameFn = useServerFn(deleteGame);
  const adminJoinFn = useServerFn(adminJoinCompetition);

  const decideMemberMut = useMutation({
    mutationFn: decideMember,
    onSuccess: () => { invalidate(); toast.success("Updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeMemberMut = useMutation({
    mutationFn: removeMemberFn,
    onSuccess: () => { invalidate(); toast.success("Removed"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const setStatusMut = useMutation({
    mutationFn: setStatusFn,
    onSuccess: () => { invalidate(); toast.success("Status updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteCompMut = useMutation({
    mutationFn: deleteCompFn,
    onSuccess: () => { toast.success("Deleted"); navigate({ to: "/competitions" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const decideGameMut = useMutation({
    mutationFn: decideGameFn,
    onSuccess: () => { invalidate(); toast.success("Game updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteGameMut = useMutation({
    mutationFn: deleteGameFn,
    onSuccess: () => { invalidate(); toast.success("Game deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const adminJoinMut = useMutation({
    mutationFn: adminJoinFn,
    onSuccess: () => { invalidate(); toast.success("Joined competition"); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{(error as Error).message}</p>;
  if (!data) return null;

  const { competition, members, games, isAdmin, myMembership, currentUserId } = data;
  const approvedMembers = members.filter((m) => m.status === "approved");
  const pendingMembers = members.filter((m) => m.status === "pending");
  const isMember = myMembership?.status === "approved";
  const canLog = isMember && (competition.status === "running" || competition.status === "finished");
  const standings = computeStandings(games, members);

  const nextStatus = {
    draft: "open",
    open: "running",
    running: "finished",
    finished: null,
  }[competition.status] as "open" | "running" | "finished" | null;

  const statusLabel = {
    open: "Publish (open for joining)",
    running: "Start competition (lock-in & enable games)",
    finished: "Mark finished",
  };

  const statusHelp: Record<string, string> = {
    draft: "Draft — only you (admin) can see this competition. Publish it so players can request to join.",
    open: "Open — visible to everyone in Browse. Players can request to join and you approve them below.",
    running: "Running — players can log games. You can still approve late join requests.",
    finished: "Finished — standings are final. Games can still be logged for late entries.",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{competition.name}</h1>
            <StatusBadge status={competition.status} />
          </div>
          {competition.description && (
            <p className="text-muted-foreground max-w-2xl">{competition.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Rules {competition.rules_version} · {competition.squad_points_limit} points
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            {!myMembership && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => adminJoinMut.mutate({ data: { id } })}
              >
                Join as player
              </Button>
            )}
            {nextStatus && (
              <Button
                size="sm"
                onClick={() => setStatusMut.mutate({ data: { id, status: nextStatus } })}
              >
                {statusLabel[nextStatus]}
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm("Delete this competition? This is permanent.")) {
                  deleteCompMut.mutate({ data: { id } });
                }
              }}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="rounded-md border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
          {statusHelp[competition.status]}
        </div>
      )}

      {canLog && (
        <LogGameDialog
          competitionId={id}
          members={approvedMembers.filter((m) => m.user_id !== currentUserId)}
          onLogged={invalidate}
        />
      )}

      <Card>
        <CardHeader><CardTitle>Leaderboard</CardTitle></CardHeader>
        <CardContent>
          {standings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No approved members yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Played</TableHead>
                    <TableHead className="text-right">W</TableHead>
                    <TableHead className="text-right">L</TableHead>
                    <TableHead className="text-right">D</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map((s, i) => (
                    <TableRow key={s.user_id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.display_name}</TableCell>
                      <TableCell className="text-right font-semibold">{s.points}</TableCell>
                      <TableCell className="text-right">{s.played}</TableCell>
                      <TableCell className="text-right">{s.wins}</TableCell>
                      <TableCell className="text-right">{s.losses}</TableCell>
                      <TableCell className="text-right">{s.draws}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && pendingMembers.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Pending join requests</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pendingMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2">
                <span>{m.display_name}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => decideMemberMut.mutate({ data: { member_id: m.id, decision: "approved" } })}
                  >Approve</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => decideMemberMut.mutate({ data: { member_id: m.id, decision: "rejected" } })}
                  >Reject</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Members ({approvedMembers.length})</CardTitle></CardHeader>
        <CardContent>
          {approvedMembers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No members yet.</p>
          ) : (
            <ul className="divide-y">
              {approvedMembers.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2">
                  <span>{m.display_name}</span>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Remove ${m.display_name}?`)) {
                          removeMemberMut.mutate({ data: { member_id: m.id } });
                        }
                      }}
                    >Remove</Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Games</CardTitle></CardHeader>
        <CardContent>
          {games.length === 0 ? (
            <p className="text-muted-foreground text-sm">No games logged yet.</p>
          ) : (
            <ul className="space-y-3">
              {games.map((g) => {
                const p1Name = data.profiles[g.player1_id] ?? "Unknown";
                const p2Name = data.profiles[g.player2_id] ?? "Unknown";
                const p1Faction = FACTIONS.find((f) => f.value === g.player1_faction)?.label;
                const p2Faction = FACTIONS.find((f) => f.value === g.player2_faction)?.label;
                const needsMyConfirmation =
                  g.status === "pending" &&
                  g.reported_by !== currentUserId &&
                  (g.player1_id === currentUserId || g.player2_id === currentUserId);
                return (
                  <li key={g.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-medium">
                        {p1Name} <span className="tabular-nums">{g.player1_points}</span>
                        <span className="text-muted-foreground"> — </span>
                        <span className="tabular-nums">{g.player2_points}</span> {p2Name}
                      </div>
                      <GameStatusBadge status={g.status} isDraw={g.is_draw} />
                    </div>
                    {(p1Faction || p2Faction) && (
                      <div className="text-xs text-muted-foreground">
                        {p1Faction ?? "—"} vs {p2Faction ?? "—"}
                      </div>
                    )}
                    {(g.player1_squad_text || g.player2_squad_text) && (
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer">Squads</summary>
                        <div className="grid sm:grid-cols-2 gap-3 mt-2">
                          <pre className="whitespace-pre-wrap"><strong>{p1Name}:</strong>{"\n"}{g.player1_squad_text || "—"}</pre>
                          <pre className="whitespace-pre-wrap"><strong>{p2Name}:</strong>{"\n"}{g.player2_squad_text || "—"}</pre>
                        </div>
                      </details>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {needsMyConfirmation && (
                        <>
                          <Button size="sm" onClick={() => decideGameMut.mutate({ data: { game_id: g.id, decision: "confirmed" } })}>Confirm</Button>
                          <Button size="sm" variant="outline" onClick={() => decideGameMut.mutate({ data: { game_id: g.id, decision: "rejected" } })}>Reject</Button>
                        </>
                      )}
                      {isAdmin && g.status === "pending" && (
                        <Button size="sm" variant="secondary" onClick={() => decideGameMut.mutate({ data: { game_id: g.id, decision: "confirmed" } })}>
                          Admin confirm
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Delete this game?")) deleteGameMut.mutate({ data: { game_id: g.id } });
                          }}
                        >Delete</Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GameStatusBadge({ status, isDraw }: { status: string; isDraw: boolean }) {
  const cls =
    status === "confirmed"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
      : status === "rejected"
      ? "bg-destructive/15 text-destructive"
      : "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  const label = status === "confirmed" ? (isDraw ? "draw" : "confirmed") : status;
  return <span className={`text-xs rounded-full px-2 py-0.5 capitalize ${cls}`}>{label}</span>;
}

function LogGameDialog({
  competitionId,
  members,
  onLogged,
}: {
  competitionId: string;
  members: { user_id: string; display_name: string }[];
  onLogged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [opponent, setOpponent] = useState<string>("");
  const [mySquad, setMySquad] = useState("");
  const [oppSquad, setOppSquad] = useState("");
  const [myPoints, setMyPoints] = useState(0);
  const [oppPoints, setOppPoints] = useState(0);
  const [myFaction, setMyFaction] = useState<string>("");
  const [oppFaction, setOppFaction] = useState<string>("");
  const fn = useServerFn(logGame);
  const m = useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success("Game logged — waiting for opponent confirmation");
      setOpen(false);
      setOpponent(""); setMySquad(""); setOppSquad(""); setMyPoints(0); setOppPoints(0);
      setMyFaction(""); setOppFaction("");
      onLogged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={members.length === 0}>Log a game</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Log a game</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Opponent</Label>
            <Select value={opponent} onValueChange={setOpponent}>
              <SelectTrigger><SelectValue placeholder="Pick opponent" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>{m.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Your points</Label>
              <Input type="number" min={0} value={myPoints} onChange={(e) => setMyPoints(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Opponent points</Label>
              <Input type="number" min={0} value={oppPoints} onChange={(e) => setOppPoints(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Your faction</Label>
              <Select value={myFaction} onValueChange={setMyFaction}>
                <SelectTrigger><SelectValue placeholder="Pick faction" /></SelectTrigger>
                <SelectContent>
                  {FACTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Opponent faction</Label>
              <Select value={oppFaction} onValueChange={setOppFaction}>
                <SelectTrigger><SelectValue placeholder="Pick faction" /></SelectTrigger>
                <SelectContent>
                  {FACTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Your squad</Label>
            <Textarea rows={4} value={mySquad} onChange={(e) => setMySquad(e.target.value)} placeholder="Paste or describe your squad" />
          </div>
          <div className="space-y-2">
            <Label>Opponent's squad</Label>
            <Textarea rows={4} value={oppSquad} onChange={(e) => setOppSquad(e.target.value)} placeholder="Paste or describe their squad" />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!opponent || !myFaction || !oppFaction || m.isPending}
            onClick={() =>
              m.mutate({
                data: {
                  competition_id: competitionId,
                  opponent_id: opponent,
                  my_squad: mySquad,
                  opponent_squad: oppSquad,
                  my_points: myPoints,
                  opponent_points: oppPoints,
                  my_faction: myFaction as "imperial" | "rebel" | "scum",
                  opponent_faction: oppFaction as "imperial" | "rebel" | "scum",
                },
              })
            }
          >
            {m.isPending ? "Logging…" : "Log game"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}