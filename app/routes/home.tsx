import { useMemo, useEffect } from "react";
import { Link, useLoaderData, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
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
    { title: "Tiệm ảnh Hina — Photography Portfolio" },
    {
      name: "description",
      content:
        "Tiệm ảnh Hina — Minimalist photography portfolio showcasing cinematic wedding, street, and lookbook photography.",
    },
  ];
}

/* ═══════════════════════════════════════════
   HOME PAGE COMPONENT
   ═══════════════════════════════════════════ */
export default function HomePage() {
  const { albums, categories } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeCategorySlug = searchParams.get("category") || "all";

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
      return (
        activeCategorySlug === "all" ||
        album.categorySlug === activeCategorySlug
      );
    });
  }, [albums, activeCategorySlug]);

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ═══════════════════════════════════════
          HEADER — Logo left, Nav right
         ═══════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-white border-b border-black/5">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 flex items-center justify-between h-16 md:h-[72px]">
          {/* Logo */}
          <Link to="/" className="shrink-0">
            <span className="font-body text-2xl md:text-3xl font-light text-black/30 mr-2 uppercase">
              Tiệm ảnh
            </span>
            <span className="font-body text-2xl md:text-3xl font-semibold text-black uppercase">
              HINA
            </span>
          </Link>

          {/* Zalo Icon */}
          <a
            href="https://zalo.me/0703414500"
            target="_blank"
            rel="noopener noreferrer"
            className=""
            aria-label="Zalo"
          >
            <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:opacity-80 disabled:opacity-50 transition-all cursor-pointer">
              Đặt lịch
            </button>
          </a>
        </div>
      </header>

      {/* ═══════════════════════════════════════
          CATEGORY FILTER PILLS
         ═══════════════════════════════════════ */}
      <div className="w-full bg-white py-4">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 flex items-center justify-center gap-2 md:gap-3 flex-wrap">
          {/* "All" pill */}
          <button
            onClick={() => handleCategoryChange("all")}
            className={`px-4 md:px-5 py-1.5 md:py-2 text-xs font-body font-medium uppercase border rounded-full transition-all duration-300 ${activeCategorySlug === "all"
              ? "bg-black text-white border-black"
              : "bg-transparent text-black/60 border-black/15 hover:border-black/40 hover:text-black"
              }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.slug)}
              className={`px-4 md:px-5 py-1.5 md:py-2 text-xs font-body font-medium uppercase border rounded-full transition-all duration-300 whitespace-nowrap ${activeCategorySlug === cat.slug
                ? "bg-black text-white border-black"
                : "bg-transparent text-black/60 border-black/15 hover:border-black/40 hover:text-black"
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════
          GALLERY GRID — Dark background, dense layout
         ═══════════════════════════════════════ */}
      <main className="pb-32 px-4 md:px-12 max-w-[1280px] mx-auto w-full flex-1 bg-white">
        <AnimatePresence mode="popLayout">
          <motion.div
            layout
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
          >
            {filteredAlbums.map((album, index) => (
              <motion.div
                key={album.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{
                  duration: 0.5,
                  delay: (index % 10) * 0.04,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="group relative cursor-pointer bg-neutral-100 rounded-xl overflow-hidden shadow-sm"
              >
                <Link to={`/album/${album.slug}`} className="block w-full h-full">
                  {/* Image */}
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <img
                      src={
                        album.thumbnail_url ||
                        album.cover_url ||
                        "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80"
                      }
                      alt={album.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:scale-105"
                    />
                    {/* Subtle hover vignette */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-500" />

                    {/* Overlay title since detail photos don't have text below */}
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                      <h3 className="text-white text-sm md:text-base font-body font-medium truncate">
                        {album.title}
                      </h3>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Empty state */}
        {filteredAlbums.length === 0 && (
          <div className="py-32 md:py-48 flex flex-col items-center justify-center">
            <p className="font-display text-2xl md:text-4xl font-light text-black/10">
              No collections found
            </p>
          </div>
        )}
      </main>

    </div>
  );
}
