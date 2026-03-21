import { Link, useLoaderData } from "react-router";
import { motion } from "framer-motion";
import { PlusCircle, Image, FolderOpen, Tag } from "lucide-react";
import { prisma } from "~/utils/db.server";

export async function loader() {
  const [categoryCount, albumCount, photoCount] = await Promise.all([
    prisma.category.count(),
    prisma.album.count(),
    prisma.photo.count(),
  ]);

  return {
    stats: [
      { label: "Total Categories", value: categoryCount.toString(), trend: "Organization" },
      { label: "Total Albums", value: albumCount.toString(), trend: "Portfolio Items" },
      { label: "Total Photos", value: photoCount.toString(), trend: "Visual Assets" },
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
    <div className="p-8 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <h1 className="text-4xl font-light  mb-2">Admin <span className="font-semibold text-accent">Dashboard</span></h1>
        <p className="text-muted-foreground font-light text-lg">
          Overview and quick management of your photography studio.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {stats.map((stat, i) => {
          const Icon = stat.label === "Total Categories" ? Tag :
            stat.label === "Total Albums" ? FolderOpen : Image;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="group bg-card border border-border/40 rounded-3xl p-8 space-y-4 hover:shadow-2xl hover:shadow-accent/5 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-accent/5 rounded-2xl flex items-center justify-center text-accent ring-1 ring-accent/10 group-hover:bg-accent group-hover:text-white transition-colors duration-500">
                  <Icon size={24} strokeWidth={1.5} />
                </div>
                <span className="text-[10px] uppercase  text-muted-foreground font-bold bg-muted px-2 py-1 rounded-full">{stat.trend}</span>
              </div>
              <div>
                <p className="text-4xl font-semibold er">{stat.value}</p>
                <p className="text-sm text-muted-foreground font-medium uppercase  mt-1">{stat.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
          <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/admin/new-album"
            className="group flex flex-col gap-4 bg-card border border-border/40 rounded-3xl p-8 hover:border-accent/30 hover:bg-accent/5 transition-all duration-300 hover:shadow-xl"
          >
            <div className="w-14 h-14 bg-accent text-white rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20 group-hover:scale-110 transition-transform duration-500">
              <PlusCircle size={28} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-lg font-semibold mb-1">Upload New Album</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Start a new collection of photos and share them with the world.
              </p>
            </div>
          </Link>
          <Link
            to="/admin/categories"
            className="group flex flex-col gap-4 bg-card border border-border/40 rounded-3xl p-8 hover:border-accent/30 hover:bg-accent/5 transition-all duration-300 hover:shadow-xl"
          >
            <div className="w-14 h-14 bg-foreground text-background rounded-2xl flex items-center justify-center shadow-lg shadow-foreground/10 group-hover:scale-110 transition-transform duration-500">
              <Tag size={28} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-lg font-semibold mb-1">Manage Categories</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Organize your work into curated photography categories.
              </p>
            </div>
          </Link>
          <Link
            to="/"
            className="group flex flex-col gap-4 bg-card border border-border/40 rounded-3xl p-8 hover:border-accent/30 hover:bg-accent/5 transition-all duration-300 hover:shadow-xl"
          >
            <div className="w-14 h-14 bg-muted text-muted-foreground rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
              <Image size={28} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-lg font-semibold mb-1">Live Portfolio</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                View your portfolio exactly as your clients see it.
              </p>
            </div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
