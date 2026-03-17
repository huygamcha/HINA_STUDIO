import { Link } from "react-router";
import { motion } from "framer-motion";
import { PlusCircle, Image, FolderOpen, Tag } from "lucide-react";

export function meta() {
  return [
    { title: "Dashboard — Tiệm ảnh Hina Studio Admin" },
    { name: "description", content: "Admin dashboard for managing albums." },
  ];
}

export default function AdminDashboard() {
  const stats = [
    { label: "Total Categories", value: "4", icon: Tag, trend: "Organization" },
    { label: "Total Albums", value: "12", icon: FolderOpen, trend: "+2 this month" },
    { label: "Total Photos", value: "248", icon: Image, trend: "+34 this month" },
  ];

  return (
    <div className="p-8 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <h1 className="text-3xl font-medium mb-2">Dashboard</h1>
        <p className="text-muted-foreground font-medium">
          Manage your photography portfolio from here.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="bg-card border border-border/50 rounded-lg p-6 space-y-3"
          >
            <div className="flex items-center justify-between">
              <stat.icon size={20} strokeWidth={1.5} className="text-accent" />
              <span className="text-xs text-muted-foreground font-medium">{stat.trend}</span>
            </div>
            <div>
              <p className="text-3xl font-medium">{stat.value}</p>
              <p className="text-sm text-muted-foreground font-medium mt-1">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/admin/new-album"
            className="group flex items-center gap-4 bg-card border border-border/50 rounded-lg p-6 hover:border-accent/30 hover:bg-accent/5 transition-all duration-300"
          >
            <div className="p-3 bg-accent/10 rounded-lg">
              <PlusCircle size={24} strokeWidth={1.5} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium">Create New Album</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">
                Upload photos and publish a new album
              </p>
            </div>
          </Link>
          <Link
            to="/"
            className="group flex items-center gap-4 bg-card border border-border/50 rounded-lg p-6 hover:border-accent/30 hover:bg-accent/5 transition-all duration-300"
          >
            <div className="p-3 bg-muted rounded-lg">
              <Image size={24} strokeWidth={1.5} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">View Portfolio</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">
                Preview your public portfolio
              </p>
            </div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
