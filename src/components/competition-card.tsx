import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "draft" | "open" | "running" | "finished";

const statusColor: Record<Status, string> = {
  draft: "bg-muted text-muted-foreground",
  open: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  running: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  finished: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
};

const statusDisplayLabel: Record<Status, string> = {
  draft: "draft",
  open: "open",
  running: "running",
  finished: "closed",
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor[status]}`}>{statusDisplayLabel[status]}</span>;
}

export interface CompetitionCardProps {
  id: string;
  name: string;
  description?: string | null;
  rules_version: string;
  squad_points_limit: number;
  status: Status;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}

export function CompetitionCard(c: CompetitionCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">
            <Link to="/competitions/$id" params={{ id: c.id }} className="hover:underline">
              {c.name}
            </Link>
          </CardTitle>
          <div className="flex items-center gap-2">
            <StatusBadge status={c.status} />
            {c.badge}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {c.description && <p className="line-clamp-2">{c.description}</p>}
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">Rules {c.rules_version}</Badge>
          <Badge variant="outline">{c.squad_points_limit} pts</Badge>
        </div>
        {c.action}
      </CardContent>
    </Card>
  );
}