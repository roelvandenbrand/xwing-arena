import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import md5 from "blueimp-md5";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "X-Wing Arena" },
      { name: "description", content: "X-Wing miniatures competions" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "X-Wing Arena" },
      { property: "og:description", content: "X-Wing miniatures competions" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "X-Wing Arena" },
      { name: "twitter:description", content: "X-Wing miniatures competions" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/a927ab22-bda1-4fa1-93c5-b5bc1674b466" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/a927ab22-bda1-4fa1-93c5-b5bc1674b466" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const { user, isAdmin, isSuperuser, signOut, loading } = useAuth();
  const gravatar = user?.email
    ? `https://www.gravatar.com/avatar/${md5(user.email.trim().toLowerCase())}?s=64&d=identicon`
    : null;
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="font-bold text-lg">
            X-Wing League
          </Link>
          {user && (
            <nav className="flex items-center gap-3 text-sm">
              <Link to="/competitions" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>
                My Competitions
              </Link>
              <Link to="/squads" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>
                Squads
              </Link>
              <Link to="/collection" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>
                Collection
              </Link>
              <Link to="/players" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>
                Players
              </Link>
              <Link to="/browse" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>
                Browse
              </Link>
              {(isAdmin || isSuperuser) && (
                <Link to="/admin" className="hover:underline" activeProps={{ className: "font-semibold underline" }}>
                  Admin
                </Link>
              )}
              <Link
                to="/profile"
                className="flex items-center gap-2 hover:underline"
                activeProps={{ className: "font-semibold underline" }}
              >
                {gravatar && (
                  <img
                    src={gravatar}
                    alt="Profile"
                    className="h-7 w-7 rounded-full border"
                  />
                )}
                <span>Profile</span>
              </Link>
              <button
                onClick={() => signOut()}
                className="text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </nav>
          )}
          {!user && !loading && (
            <nav className="flex items-center gap-3 text-sm">
              <Link to="/login" className="hover:underline">Login</Link>
              <Link to="/register" className="hover:underline">Register</Link>
            </nav>
          )}
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
