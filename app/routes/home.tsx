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
      <nav className="fixed top-0 left-0 right-0 z-50 p-6 md:p-12 pointer-events-none">
        <div className="max-w-screen-2xl mx-auto flex justify-between items-start">
          {/* Logo */}
          <div className="pointer-events-auto shrink-0 mt-2">
            <Link to="/" className="text-xl md:text-2xl font-serif italic tracking-tight text-foreground/80 hover:text-foreground transition-all duration-700">
              Tiệm ảnh Hina
            </Link>
          </div>

          {/* Inline Categories */}
          <div className="hidden md:flex gap-12 pointer-events-auto items-center px-4 pt-4">
            <button
              onClick={() => setActiveCategorySlug("all")}
              className={`text-[11px] uppercase tracking-[0.4em] transition-all duration-500 whitespace-nowrap relative group ${
                activeCategorySlug === "all" ? "text-foreground font-medium" : "text-foreground/30 hover:text-foreground/60"
              }`}
            >
              Tất cả
              <span className={`absolute -bottom-2 left-0 w-full h-px bg-foreground transition-transform duration-500 origin-left ${activeCategorySlug === 'all' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'}`} />
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategorySlug(cat.slug)}
                className={`text-[11px] uppercase tracking-[0.4em] transition-all duration-500 whitespace-nowrap relative group ${
                  activeCategorySlug === cat.slug ? "text-foreground font-medium" : "text-foreground/30 hover:text-foreground/60"
                }`}
              >
                {cat.name}
                <span className={`absolute -bottom-2 left-0 w-full h-px bg-foreground transition-transform duration-500 origin-left ${activeCategorySlug === cat.slug ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'}`} />
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pointer-events-auto items-center shrink-0">
            {/* Expanding Search */}
            <motion.div
              initial={false}
              animate={{
                width: isSearchExpanded ? (window.innerWidth < 640 ? "calc(100vw - 120px)" : 280) : 48,
                backgroundColor: isSearchExpanded ? "var(--background)" : "transparent"
              }}
              className="flex items-center h-[48px] border-b border-foreground/10 overflow-hidden transition-colors duration-500"
            >
              <button
                onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                className="flex-shrink-0 p-3 text-foreground/40 hover:text-foreground transition-colors"
                aria-label="Search"
              >
                <SearchIcon size={18} strokeWidth={1.5} />
              </button>

              <input
                type="text"
                placeholder="KHÁM PHÁ..."
                value={searchQuery}
                onFocus={() => setIsSearchExpanded(true)}
                onBlur={() => !searchQuery && setIsSearchExpanded(false)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full bg-transparent border-none text-[10px] tracking-[0.2em] font-light placeholder:text-foreground/20 focus:outline-none pr-4 transition-opacity duration-500 ${isSearchExpanded ? "opacity-100" : "opacity-0"
                  }`}
              />

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="p-3 text-foreground/30 hover:text-foreground transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </motion.div>
          </div>
        </div>
      </nav>

      {/* ─── ALBUM GRID ─── */}
      <main className="pt-48 pb-32 px-6 md:px-12 max-w-screen-2xl mx-auto">
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16"
        >
          <AnimatePresence mode="popLayout">
            {filteredAlbums.map((album, index) => (
              <motion.div
                key={album.id}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.8, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="group relative"
              >
                <Link
                  to={`/album/${album.slug}`}
                  className="block aspect-[3/4] overflow-hidden bg-muted"
                >
                  <motion.img
                    src={album.cover_url || "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80"}
                    alt={album.title}
                    loading="lazy"
                    className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-1000 ease-out scale-100 group-hover:scale-110"
                  />

                  {/* Dramatic Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-1000" />
                </Link>

                {/* Info Below Image - High End Editorial Style */}
                <div className="mt-6 space-y-1">
                  <div className="flex justify-between items-baseline gap-4">
                    <h3 className="font-serif italic text-lg md:text-xl text-foreground/80 group-hover:text-foreground transition-colors duration-500 leading-tight">
                      {album.title}
                    </h3>
                    <span className="text-[10px] tracking-widest text-foreground/20 group-hover:text-foreground/40 transition-colors duration-500">
                      0{index + 1}
                    </span>
                  </div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-foreground/30 font-light">
                    {album.categoryName || "Photography"}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredAlbums.length === 0 && (
          <div className="h-[50vh] flex flex-col items-center justify-center text-foreground/20 font-serif italic text-2xl">
            Không tìm thấy kết quả phù hợp
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
