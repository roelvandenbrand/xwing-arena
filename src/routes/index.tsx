import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "X-Wing League — private competitions" },
      { name: "description", content: "Run private X-Wing Miniatures competitions with friends." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  return (
    <div className="max-w-2xl mx-auto text-center py-16 space-y-6">
      <h1 className="text-4xl font-bold tracking-tight">X-Wing League</h1>
      <p className="text-lg text-muted-foreground">
        Run private X-Wing Miniatures competitions with your friends. Track squads, log
        games, and watch the leaderboard climb.
      </p>
      {!loading && (
        <div className="flex justify-center gap-3">
          {user ? (
            <>
              <Button asChild>
                <Link to="/competitions">My Competitions</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/browse">Browse Open</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/register">Create account</Link>
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
