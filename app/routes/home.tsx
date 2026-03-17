import { useState, useMemo } from "react";
import { Link, useLoaderData } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search as SearchIcon,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { getAlbums, getCategories } from "~/utils/supabase.server";

/* ═══════════════════════════════════════════
   LOADER — Fetch albums from Supabase
   ═══════════════════════════════════════════ */
export async function loader() {
  const [albums, categories] = await Promise.all([
    getAlbums(),
    getCategories(),
  ]);
  return { albums, categories };
}

/* ═══════════════════════════════════════════
   META
   ═══════════════════════════════════════════ */
export function meta() {
  return [
    { title: "Tiệm ảnh Hina Studio — Minimal Portfolio" },
    {
      name: "description",
      content: "Minimalist photography studio portfolio.",
    },
  ];
}

/* ═══════════════════════════════════════════
   HOME PAGE COMPONENT
   ═══════════════════════════════════════════ */
export default function HomePage() {
  const { albums, categories } = useLoaderData<typeof loader>();

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategorySlug, setActiveCategorySlug] = useState("all");

  const filteredAlbums = useMemo(() => {
    return albums.filter((album) => {
      const matchesCategory = activeCategorySlug === "all" || album.categorySlug === activeCategorySlug;
      const matchesSearch = album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (album.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      return matchesCategory && matchesSearch;
    });
  }, [albums, activeCategorySlug, searchQuery]);

  return (
    <div className="min-h-screen bg-background selection:bg-accent/30">
      {/* ─── MINIMAL HEADER ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 p-6 md:p-10 pointer-events-none">
        <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
          {/* Logo */}
          <div className="pointer-events-auto shrink-0">
            <Link to="/" className="text-md uppercase font-light text-foreground/40 hover:text-foreground transition-colors">
              Tiệm ảnh Hina
            </Link>
          </div>

          {/* Inline Categories */}
          <div className="hidden md:flex gap-8 pointer-events-auto items-center overflow-x-auto no-scrollbar px-4">
            <button
              onClick={() => setActiveCategorySlug("all")}
              className={`text-[10px] uppercase tracking-[0.3em] transition-colors whitespace-nowrap ${
                activeCategorySlug === "all" ? "text-foreground font-medium" : "text-foreground/20 hover:text-foreground/60"
              }`}
            >
              Tất cả
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategorySlug(cat.slug)}
                className={`text-[10px] uppercase tracking-[0.3em] transition-colors whitespace-nowrap ${
                  activeCategorySlug === cat.slug ? "text-foreground font-medium" : "text-foreground/20 hover:text-foreground/60"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pointer-events-auto items-center shrink-0">
            {/* Expanding Search */}
            <motion.div
              initial={false}
              animate={{
                width: isSearchExpanded ? (window.innerWidth < 640 ? "calc(100vw - 120px)" : 240) : 46,
                backgroundColor: isSearchExpanded ? "var(--background)" : "rgba(var(--foreground), 0.05)"
              }}
              className="flex items-center h-[46px] bg-foreground/5 backdrop-blur-xl border border-foreground/5 rounded-full overflow-hidden transition-colors duration-300"
            >
              <button
                onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                className="flex-shrink-0 p-3 text-foreground/60 hover:text-foreground transition-colors"
                aria-label="Search"
              >
                <SearchIcon size={20} strokeWidth={1.5} />
              </button>

              <input
                type="text"
                placeholder="Tìm..."
                value={searchQuery}
                onFocus={() => setIsSearchExpanded(true)}
                onBlur={() => !searchQuery && setIsSearchExpanded(false)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full bg-transparent border-none text-sm font-light placeholder:text-foreground/30 focus:outline-none pr-4 transition-opacity duration-300 ${isSearchExpanded ? "opacity-100" : "opacity-0"
                  }`}
              />

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="p-3 text-foreground/30 hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </motion.div>
          </div>
        </div>
      </nav>

      {/* ─── ALBUM GRID ─── */}
      <main className="pt-32 pb-20 px-6 md:px-10 max-w-screen-2xl mx-auto">
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredAlbums.map((album) => (
              <motion.div
                key={album.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5 }}
                className="group relative"
              >
                <Link
                  to={`/album/${album.slug}`}
                  className="block aspect-[4/5] overflow-hidden rounded-sm bg-muted"
                >
                  <motion.img
                    src={album.cover_url || "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80"}
                    alt={album.title}
                    loading="lazy"
                    className="w-full h-auto object-cover img-zoom"
                  />

                  {/* Overlay - Always visible for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent transition-opacity duration-500 group-hover:from-black/80" />

                  {/* Info - Always visible */}
                  <div className="absolute bottom-6 left-6 right-6 transition-all duration-500 group-hover:bottom-8">
                    <p className="text-white text-xs font-light  uppercase">
                      {album.title}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredAlbums.length === 0 && (
          <div className="h-[60vh] flex flex-col items-center justify-center text-muted-foreground/40  font-light  uppercase text-sm">
            No mirrors found
          </div>
        )}
      </main>

      {/* ─── OVERLAYS ─── */}
      {/* ─── MOBILE CATEGORIES ─── */}
      <div className="md:hidden sticky top-[100px] z-40 bg-background/80 backdrop-blur-md border-b border-foreground/5 px-6 py-4 flex gap-6 overflow-x-auto no-scrollbar pointer-events-auto">
        <button
          onClick={() => setActiveCategorySlug("all")}
          className={`text-[10px] uppercase tracking-[0.3em] transition-colors whitespace-nowrap ${
            activeCategorySlug === "all" ? "text-foreground font-medium" : "text-foreground/20"
          }`}
        >
          Tất cả
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategorySlug(cat.slug)}
            className={`text-[10px] uppercase tracking-[0.3em] transition-colors whitespace-nowrap ${
              activeCategorySlug === cat.slug ? "text-foreground font-medium" : "text-foreground/20"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
