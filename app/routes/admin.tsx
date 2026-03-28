import { Outlet, Link, useLocation, redirect } from "react-router";
import { Camera, FolderOpen, LogOut, Tag } from "lucide-react";
import { requireAuth, logout } from "~/utils/session.server";

/* ═══════════════════════════════════════════
   LOADER — protect all admin routes
   ═══════════════════════════════════════════ */
export async function loader({ request }: { request: Request }) {
  await requireAuth(request);

  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, "");

  if (pathname === "/admin") {
    return redirect("/admin/albums");
  }

  return null;
}

/* ═══════════════════════════════════════════
   ACTION — handle logout
   ═══════════════════════════════════════════ */
export async function action({ request }: { request: Request }) {
  return logout(request);
}

/* ═══════════════════════════════════════════
   ADMIN LAYOUT
   ═══════════════════════════════════════════ */
export default function AdminLayout() {
  const location = useLocation();

  const navItems = [
    {
      to: "/admin/albums",
      label: "Albums",
      icon: FolderOpen,
      activePaths: ["/admin/albums", "/admin/new-album", "/admin/edit-album"],
    },
    {
      to: "/admin/categories",
      label: "Categories",
      icon: Tag,
      activePaths: ["/admin/categories"],
    },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-border/40 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-border/30">
          <Link
            to="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-70"
          >
            <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center rounded-lg shrink-0">
              <Camera size={16} strokeWidth={2} />
            </div>
            <span className="text-sm font-semibold ">
              Tiệm ảnh Hina
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.activePaths.some((path) =>
              location.pathname.startsWith(path)
            );
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors
                  ${isActive
                    ? "text-background bg-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
              >
                <item.icon size={18} strokeWidth={isActive ? 2 : 1.5} className="shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="px-3 py-4 border-t border-border/30">
          <form method="post">
            <button
              type="submit"
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-[13px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
            >
              <LogOut size={18} strokeWidth={1.5} className="shrink-0" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-neutral-50/50 p-4 md:p-6">
        <div className="min-h-full bg-white rounded-2xl shadow-sm border border-border/30">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
