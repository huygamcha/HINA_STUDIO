import { Outlet, Link, useLocation } from "react-router";
import {
  Camera,
  LayoutDashboard,
  PlusCircle,
  LogOut,
  Tag,
} from "lucide-react";
import { requireAuth, logout } from "~/utils/session.server";

/* ═══════════════════════════════════════════
   LOADER — protect all admin routes
   ═══════════════════════════════════════════ */
export async function loader({ request }: { request: Request }) {
  await requireAuth(request);
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
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/new-album", label: "New Album", icon: PlusCircle },
    { to: "/admin/categories", label: "Categories", icon: Tag },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border/50 flex flex-col shrink-0">
        <div className="p-6 border-b border-border/50">
          <Link
            to="/"
            className="flex items-center gap-2 text-foreground hover:text-accent transition-colors"
          >
            <Camera size={20} strokeWidth={1.5} />
            <span className="text-lg font-light  uppercase">
              Tiệm ảnh Hina
            </span>
          </Link>
          <p className="text-xs text-muted-foreground font-light mt-1 ">
            Admin Panel
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-light  transition-all duration-200 ${isActive
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
              >
                <item.icon size={18} strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50">
          <form method="post">
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-light  text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-md transition-all duration-200 cursor-pointer"
            >
              <LogOut size={18} strokeWidth={1.5} />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
