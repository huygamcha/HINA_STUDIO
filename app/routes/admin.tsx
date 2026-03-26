import { Outlet, Link, useLocation } from "react-router";
import {
  Camera,
  LayoutDashboard,
  FolderOpen,
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
    { to: "/admin/albums", label: "Albums", icon: FolderOpen },
    { to: "/admin/categories", label: "Categories", icon: Tag },
  ];

  return (
    <div className="min-h-screen flex bg-emerald-50/20">
      {/* Sidebar - Inspired by Tasko UI */}
      <aside className="w-72 bg-white border-r border-emerald-100/50 flex flex-col shrink-0">
        <div className="p-8 border-b border-border/20">
          <Link
            to="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <div className="w-10 h-10 bg-emerald-700 text-white flex items-center justify-center rounded-2xl shadow-lg shadow-emerald-700/20">
              <Camera size={22} strokeWidth={2} />
            </div>
            <span className="text-xl font-bold">
              Hina <span className="font-medium text-emerald-800/80 italic">Studio</span>
            </span>
          </Link>
          <p className="text-[10px] uppercase font-black opacity-20 mt-4 ml-1">
            Administration
          </p>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || (item.to !== "/admin" && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-4 px-6 py-4 rounded-[1.2rem] text-sm font-semibold transition-all duration-300 ${isActive
                  ? "bg-emerald-800 text-white shadow-xl shadow-emerald-900/10"
                  : "text-muted-foreground hover:bg-emerald-50/50 hover:text-emerald-900"
                  }`}
              >
                <item.icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-border/20 bg-neutral-50/30">
          <form method="post">
            <button
              type="submit"
              className="flex items-center gap-4 w-full px-6 py-4 rounded-[1.2rem] text-sm font-semibold text-muted-foreground hover:bg-destructive/5 hover:text-destructive transition-all duration-300"
            >
              <LogOut size={20} strokeWidth={1.5} />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-emerald-50/20 p-4 md:p-8">
        {/* We add an inner wrapper for the page content */}
        <div className="min-h-full bg-white rounded-[2rem] shadow-sm border border-emerald-100/30">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
