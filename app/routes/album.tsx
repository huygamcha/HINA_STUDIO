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
    { title: `${data?.album?.title || "Album"} — Tiệm ảnh Hina` },
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
        className="absolute top-8 right-8 z-[110] p-2 /40 hover: transition-colors"
      >
        <X size={32} strokeWidth={1} />
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        className="absolute left-4 md:left-10 z-[110] p-4 /20 hover: transition-colors group"
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
        className="absolute right-4 md:right-10 z-[110] p-4 /20 hover: transition-colors group"
      >
        <ChevronRight size={48} strokeWidth={1} className="group-hover:translate-x-1 transition-transform" />
      </button>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 /40 text-xs uppercase font-medium">
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* ═══════════════════════════════════════
          HEADER — Logo left, Nav right (Synced with home)
         ═══════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-white border-b border-black/5">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 flex items-center justify-between h-16 md:h-[72px]">
          {/* Back button */}
          <div className="flex-1 flex justify-start">
            <Link
              to="/"
              className="group flex items-center gap-2 text-black hover:opacity-50 transition-all duration-300"
            >
              <div className="w-8 h-8 rounded-full border border-black/5 flex items-center justify-center group-hover:border-black/20 transition-colors">
                <ArrowLeft size={16} strokeWidth={1.5} />
              </div>
              <span className="text-xs font-body font-bold uppercase hidden sm:inline-block">
                Back
              </span>
            </Link>
          </div>

          {/* Centered Title */}
          <div className="flex-[2] flex justify-center">
            <h1 className="font-body text-xs md:text-sm font-bold uppercase text-center text-black whitespace-nowrap overflow-hidden text-ellipsis px-4">
              {album.title}
            </h1>
          </div>

          {/* Zalo Icon */}
          <div className="flex-1 flex justify-end">
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
        </div>
      </header>

      <main className="pb-32 px-4 md:px-12 max-w-[1280px] mx-auto w-full flex-1">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 pt-4">
          {photos.map((photo, index) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: index * 0.05 }}
              className="group relative overflow-hidden cursor-pointer rounded-xl bg-muted aspect-[4/5]"
              onClick={() => setLightboxIndex(index)}
            >
              <img
                src={photo.url}
                alt={photo.caption || ""}
                loading="lazy"
                className="w-full h-full object-cover img-zoom"
              />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
          ))}
        </div>

        {photos.length === 0 && (
          <div className="h-[60vh] flex flex-col items-center justify-center /60 font-medium uppercase text-sm">
            Empty frame
          </div>
        )}
      </main>

      {/* ─── LIGHTBOX ─── */}
      <AnimatePresence mode="wait">
        {lightboxIndex !== null && (
          <Lightbox
            photos={photos.map((p) => ({ id: p.id, src: p.url, alt: p.caption || "" }))}
            currentIndex={lightboxIndex as number}
            onClose={closeLightbox}
            onPrev={goToPrev}
            onNext={goToNext}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
