import { useState, useCallback, useEffect } from "react";
import { Link, useLoaderData } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { getAlbumBySlug, getAlbumPhotos } from "~/utils/supabase.server";

/* ═══════════════════════════════════════════
   LOADER — Fetch album + photos from Supabase
   ═══════════════════════════════════════════ */
export async function loader({ params }: { params: { slug: string } }) {
  const album = await getAlbumBySlug(params.slug);
  
  if (!album) {
    throw new Response("Album not found", { status: 404 });
  }

  const photos = await getAlbumPhotos(album.id);

  return { album, photos };
}

/* ═══════════════════════════════════════════
   META
   ═══════════════════════════════════════════ */
export function meta({ data }: { data: any }) {
  return [
    { title: `${data?.album?.title || "Album"} — Tiệm ảnh Hina Studio` },
    { name: "description", content: "View collection." },
  ];
}

/* ═══════════════════════════════════════════
   LIGHTBOX
   ═══════════════════════════════════════════ */
function Lightbox({
  photos,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: {
  photos: { id: string; src: string; alt: string }[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const photo = photos[currentIndex];

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/98 backdrop-blur-3xl"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-8 right-8 z-[110] p-2 text-foreground/40 hover:text-foreground transition-colors"
      >
        <X size={32} strokeWidth={1} />
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        className="absolute left-4 md:left-10 z-[110] p-4 text-foreground/20 hover:text-foreground transition-colors group"
      >
        <ChevronLeft size={48} strokeWidth={1} className="group-hover:-translate-x-1 transition-transform" />
      </button>

      <div className="relative w-full h-full flex items-center justify-center p-6 md:p-20" onClick={(e) => e.stopPropagation()}>
        <AnimatePresence mode="wait">
          <motion.img
            key={photo.id}
            src={photo.src}
            alt={photo.alt}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-full max-h-full object-contain shadow-2xl"
          />
        </AnimatePresence>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className="absolute right-4 md:right-10 z-[110] p-4 text-foreground/20 hover:text-foreground transition-colors group"
      >
        <ChevronRight size={48} strokeWidth={1} className="group-hover:translate-x-1 transition-transform" />
      </button>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-foreground/20 text-[10px]  uppercase font-light">
        {currentIndex + 1} / {photos.length}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   ALBUM PAGE
   ═══════════════════════════════════════════ */
export default function AlbumPage() {
  const { album, photos } = useLoaderData<typeof loader>();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const goToPrev = useCallback(
    () => setLightboxIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null)),
    [photos.length]
  );
  const goToNext = useCallback(
    () => setLightboxIndex((i) => (i !== null ? (i + 1) % photos.length : null)),
    [photos.length]
  );

  return (
    <div className="min-h-screen bg-background selection:bg-accent/30">
      {/* ─── MINIMAL BACK NAV ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 p-6 md:p-10 pointer-events-none">
        <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
          <Link
            to="/"
            className="pointer-events-auto p-3 bg-foreground/5 hover:bg-foreground/10 text-foreground/40 hover:text-foreground backdrop-blur-xl border border-foreground/5 rounded-full transition-all duration-300"
            aria-label="Back"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </Link>

          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-[10px] uppercase tracking-[0.4em] font-light text-foreground/60 mb-1">
              {album.title}
            </h1>
            <p className="text-[8px] uppercase tracking-[0.2em] font-light text-foreground/20">
              {album.categoryName}
            </p>
          </motion.div>

          {/* Spacer to keep title centered */}
          <div className="w-[46px]" />
        </div>
      </nav>

      {/* ─── PHOTO GRID ─── */}
      <main className="pt-32 pb-20 px-6 md:px-10 max-w-screen-2xl mx-auto">
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 md:gap-6 space-y-4 md:space-y-6">
          {photos.map((photo, index) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: index * 0.05 }}
              className="group relative overflow-hidden cursor-pointer rounded-sm bg-muted"
              onClick={() => setLightboxIndex(index)}
            >
              <img
                src={photo.url}
                alt={photo.caption || ""}
                loading="lazy"
                className="w-full h-auto object-cover img-zoom"
              />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
          ))}
        </div>

        {photos.length === 0 && (
          <div className="h-[60vh] flex flex-col items-center justify-center text-muted-foreground/40  font-light  uppercase text-sm">
            Empty frame
          </div>
        )}
      </main>

      {/* ─── LIGHTBOX ─── */}
      <AnimatePresence mode="wait">
        {lightboxIndex !== null && (
          <Lightbox
            photos={photos.map((p) => ({ id: p.id, src: p.url, alt: p.caption || "" }))}
            currentIndex={lightboxIndex}
            onClose={closeLightbox}
            onPrev={goToPrev}
            onNext={goToNext}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
