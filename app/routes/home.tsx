import { useState, useMemo, useEffect } from "react";
import { Link, useLoaderData, useSearchParams } from "react-router";
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
  const [searchParams, setSearchParams] = useSearchParams();

  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const activeCategorySlug = searchParams.get("category") || "all";

  // Force scroll to top when category changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [activeCategorySlug]);

  const handleCategoryChange = (slug: string) => {
    if (slug === "all") {
      searchParams.delete("category");
    } else {
      searchParams.set("category", slug);
    }
    setSearchParams(searchParams, { preventScrollReset: false });
  };

  const filteredAlbums = useMemo(() => {
    return albums.filter((album) => {
      const matchesCategory = activeCategorySlug === "all" || album.categorySlug === activeCategorySlug;
      const matchesSearch = album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (album.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      return matchesCategory && matchesSearch;
    });
  }, [albums, activeCategorySlug, searchQuery]);

  return (
    <div className="min-h-[100dvh] bg-background selection:bg-accent/30 flex flex-col">
      {/* ─── MINIMAL HEADER ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b border-foreground/5 py-3 px-6 md:px-12">
        <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
          {/* Logo */}
          <div className="shrink-0">
            <Link to="/" className="text-xl md:text-3xl font-serif italic font-bold text-foreground hover:text-accent transition-all duration-700">
              Tiệm ảnh Hina
            </Link>
          </div>

          {/* Inline Categories */}
          <div className="hidden md:flex gap-10 items-center">
            <button
              onClick={() => handleCategoryChange("all")}
              className={`text-[13px] uppercase font-bold transition-all duration-500 whitespace-nowrap relative group cursor-pointer ${activeCategorySlug === "all" ? "text-foreground" : "text-foreground/40 hover:text-foreground"
                }`}
            >
              Tất cả
              <span className={`absolute -bottom-2 left-0 w-full h-px bg-foreground transition-transform duration-500 origin-left ${activeCategorySlug === 'all' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'}`} />
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`text-[13px] uppercase font-bold transition-all duration-500 whitespace-nowrap relative group cursor-pointer ${activeCategorySlug === cat.slug ? "text-foreground" : "text-foreground/40 hover:text-foreground"
                  }`}
              >
                {cat.name}
                <span className={`absolute -bottom-2 left-0 w-full h-px bg-foreground transition-transform duration-500 origin-left ${activeCategorySlug === cat.slug ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'}`} />
              </button>
            ))}
          </div>

        </div>
      </nav>

      {/* ─── ALBUM GRID ─── */}
      <main className="pt-20 md:pt-36 pb-32 px-4 md:px-12 max-w-screen-2xl mx-auto w-full">
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16"
        >
          <AnimatePresence mode="popLayout">
            {filteredAlbums.map((album, index) => (
              <motion.div
                key={album.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="group relative"
              >
                <Link
                  to={`/album/${album.slug}`}
                  className="block aspect-[3/4] overflow-hidden bg-muted rounded-xl"
                >
                  <motion.img
                    src={album.cover_url || "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80"}
                    alt={album.title}
                    loading="lazy"
                    className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-1000 ease-out scale-100 group-hover:scale-110 rounded-xl"
                  />

                  {/* Dramatic Overlay */}
                  <div className="absolute inset-0 bg-black/0" />
                </Link>

                {/* Info Below Image - High End Editorial Style */}
                <div className="mt-6 px-1 space-y-2">
                  <div className="flex justify-between items-baseline gap-4">
                    <h3 className="font-serif italic text-xl md:text-2xl font-bold text-foreground group-hover:text-accent transition-colors duration-500 leading-tight">
                      {album.title}
                    </h3>
                    <span className="text-[10px] font-medium text-foreground/40 group-hover:text-foreground/60 transition-colors duration-500">
                      0{index + 1}
                    </span>
                  </div>
                  <p className="text-[11px] uppercase font-bold text-foreground/40">
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

      {/* ─── MOBILE CATEGORY BAR (Floating/Sticky) ─── */}
      <div className="md:hidden sticky bottom-6 z-40 mx-auto max-w-[90vw]">
        <div className="bg-background backdrop-blur-2xl border border-foreground/10 rounded-full px-6 py-3 flex gap-8 overflow-x-auto no-scrollbar shadow-2xl shadow-black/20">
          <button
            onClick={() => handleCategoryChange("all")}
            className={`text-[13px] uppercase font-bold transition-colors whitespace-nowrap py-1 cursor-pointer ${activeCategorySlug === "all" ? "text-foreground" : "text-foreground/30"
              }`}
          >
            Tất cả
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.slug)}
              className={`text-[13px] uppercase font-bold transition-colors whitespace-nowrap py-1 cursor-pointer ${activeCategorySlug === cat.slug ? "text-foreground" : "text-foreground/30"
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
