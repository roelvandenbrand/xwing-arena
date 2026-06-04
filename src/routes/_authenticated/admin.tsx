import { createFileRoute, Outlet, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="space-y-4">
      <nav className="flex gap-2 border-b text-sm">
        <Link
          to="/admin"
          activeOptions={{ exact: true }}
          className="px-3 py-2 hover:text-foreground text-muted-foreground"
          activeProps={{ className: "px-3 py-2 font-semibold border-b-2 border-primary text-foreground" }}
        >
          Competitions
        </Link>
        <Link
          to="/admin/catalog"
          className="px-3 py-2 hover:text-foreground text-muted-foreground"
          activeProps={{ className: "px-3 py-2 font-semibold border-b-2 border-primary text-foreground" }}
        >
          Catalog (Ships / Pilots / Upgrades)
        </Link>
        <Link
          to="/admin/packages"
          className="px-3 py-2 hover:text-foreground text-muted-foreground"
          activeProps={{ className: "px-3 py-2 font-semibold border-b-2 border-primary text-foreground" }}
        >
          Packages
        </Link>
      </nav>
      <Outlet />
    </div>
  );
}