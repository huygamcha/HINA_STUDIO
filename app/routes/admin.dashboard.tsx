import { Link, useLoaderData } from "react-router";
import { motion } from "framer-motion";
import { 
  PlusCircle, 
  Image as ImageIcon, 
  FolderOpen, 
  Tag, 
  ArrowUpRight, 
  ArrowRight,
  Plus
} from "lucide-react";
import { prisma } from "~/utils/db.server";

export async function loader() {
  const [categoryCount, albumCount, photoCount] = await Promise.all([
    prisma.category.count(),
    prisma.album.count(),
    prisma.photo.count(),
  ]);

  return {
    stats: [
      { 
        label: "Total Categories", 
        value: categoryCount, 
        trend: "Increased from last month", 
        icon: Tag,
        highlight: true 
      },
      { 
        label: "Total Albums", 
        value: albumCount, 
        trend: "Increased from last month", 
        icon: FolderOpen,
        highlight: false 
      },
      { 
        label: "Total Photos", 
        value: photoCount, 
        trend: "Increased from last month", 
        icon: ImageIcon,
        highlight: false 
      },
    ]
  };
}

export function meta() {
  return [
    { title: "Dashboard — Tiệm ảnh Hina Studio Admin" },
    { name: "description", content: "Admin dashboard for managing albums." },
  ];
}

export default function AdminDashboard() {
  const { stats } = useLoaderData<typeof loader>();

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold mb-3">Dashboard</h1>
          <p className="text-muted-foreground font-medium">
            Plan, prioritize, and accomplish your studio tasks with ease.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-4"
        >
          <Link
            to="/admin/new-album"
            className="flex items-center gap-2 bg-emerald-800 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-emerald-900 transition-all shadow-lg shadow-emerald-900/10"
          >
            <Plus size={18} /> Add Album
          </Link>
          <Link
            to="/admin/categories"
            className="flex items-center gap-2 bg-neutral-100/80 text-foreground px-6 py-3 rounded-2xl font-bold text-sm hover:bg-neutral-200 transition-all"
          >
            Manage Categories
          </Link>
        </motion.div>
      </header>

      {/* Stats Grid - Matching the Image */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`relative p-10 rounded-[2.5rem] border shadow-sm flex flex-col justify-between h-64 overflow-hidden group ${
              stat.highlight 
              ? "bg-emerald-800 text-white border-emerald-900 shadow-xl shadow-emerald-900/10" 
              : "bg-white text-foreground border-neutral-100 shadow-sm"
            }`}
          >
            <div className="flex items-start justify-between">
              <span className={`text-sm font-bold opacity-80 ${stat.highlight ? "text-white" : "text-muted-foreground"}`}>
                {stat.label}
              </span>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:rotate-12 ${
                stat.highlight ? "bg-white/10 text-white" : "bg-emerald-800 text-white shadow-lg shadow-emerald-900/20"
              }`}>
                <ArrowUpRight size={20} strokeWidth={2.5} />
              </div>
            </div>

            <div>
              <span className="text-6xl font-bold leading-none mb-6 block">
                {stat.value}
              </span>
              <div className="flex items-center gap-2">
                <ArrowRight size={14} className={stat.highlight ? "text-white" : "text-emerald-800"} />
                <span className={`text-[11px] font-bold ${stat.highlight ? "text-white/80" : "text-muted-foreground"}`}>
                  {stat.trend}
                </span>
              </div>
            </div>
            
            {/* Subtle patterns for visual depth */}
            <div className={`absolute -right-8 -bottom-8 w-40 h-40 rounded-full blur-3xl opacity-20 ${stat.highlight ? "bg-emerald-400" : "bg-emerald-200"}`} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
