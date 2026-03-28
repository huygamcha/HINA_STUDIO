import { useState, useRef, useCallback } from "react";
import { useLoaderData, useNavigate, useParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  ImagePlus,
  Loader2,
  Trash2,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { createSlug } from "~/utils/slug";

/* ═══════════════════════════════════════════
   TYPE DEFINITIONS
   ═══════════════════════════════════════════ */
interface PhotoItem {
  url: string;
  status: "done" | "uploading" | "pending" | "error";
  id?: string;
  preview?: string;
  file?: File;
}

/* ═══════════════════════════════════════════
   LOADER
   ═══════════════════════════════════════════ */
export async function loader({ params }: { params: { id: string } }) {
  const { getAlbumById, getAlbumPhotos, getCategories } = await import("~/utils/supabase.server");
  const album = await getAlbumById(params.id);
  if (!album) {
    throw new Response("Album Not Found", { status: 404 });
  }
  const photos = await getAlbumPhotos(params.id);
  const categories = await getCategories();
  return { album, photos, categories };
}

/* ═══════════════════════════════════════════
   ACTION (Main Route) - Handles metadata only
   ═══════════════════════════════════════════ */
export async function action({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const albumId = params.id;

  if (intent === "update-album") {
    try {
      const { updateAlbum, syncAlbumPhotos } = await import("~/utils/supabase.server");
      const title = formData.get("title") as string;
      const slug = formData.get("slug") as string;
      const description = formData.get("description") as string;
      const categoryId = formData.get("categoryId") as string;
      const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;
      const photosJson = formData.get("photos") as string;
      const thumbnailUrl = formData.get("thumbnailUrl") as string;

      const photoUrls: string[] = photosJson ? JSON.parse(photosJson) : [];
      await updateAlbum(albumId, {
        title, slug, description: description || undefined, categoryId,
        sort_order: sortOrder, cover_url: photoUrls[0] || undefined,
        thumbnail_url: thumbnailUrl || photoUrls[0] || undefined,
      });
      await syncAlbumPhotos(albumId, photoUrls.map((url, i) => ({ url, sort_order: i })));
      return Response.json({ intent: "success" });
    } catch (err) {
      console.error(err);
      return Response.json({ error: "Update failed" }, { status: 500 });
    }
  }

  return Response.json({ error: "Unknown intent." }, { status: 400 });
}

/* ═══════════════════════════════════════════
   UI COMPONENTS
   ═══════════════════════════════════════════ */
function ConfirmDialog({
  isOpen, title, message, confirmLabel = "Delete", isLoading = false, onConfirm, onCancel,
}: {
  isOpen: boolean; title: string; message: string; confirmLabel?: string; isLoading?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!isLoading ? onCancel : undefined} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-3xl shadow-2xl border border-border/30 max-w-sm w-full p-6 space-y-4">
            <div className="w-14 h-14 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle size={28} className="text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed">{message}</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onCancel} disabled={isLoading} className="px-4 py-2 border border-border/50 rounded-2xl text-sm font-semibold transition-all hover:bg-muted">Cancel</button>
              <button type="button" onClick={onConfirm} disabled={isLoading} className="px-4 py-2 bg-destructive text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2">
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function EditAlbumPage() {
  const { album, photos, categories } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { id: albumId } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(album.title);
  const [slug, setSlug] = useState(album.slug);
  const [description, setDescription] = useState(album.description || "");
  const [categoryId, setCategoryId] = useState(album.categoryId);
  const [sortOrder, setSortOrder] = useState(album.sort_order?.toString() || "0");
  const [thumbnailUrl, setThumbnailUrl] = useState(album.thumbnail_url || "");

  const [media, setMedia] = useState<PhotoItem[]>(
    photos.map((p: any) => ({ url: p.url, status: "done", id: p.id }))
  );

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isThumbnailUploading, setIsThumbnailUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; message: string; confirmLabel: string; isLoading: boolean; onConfirm: () => void;
  }>({
    isOpen: false, title: "", message: "", confirmLabel: "Delete", isLoading: false, onConfirm: () => { }
  });

  const closeDialog = () => setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

  /* ── API Helpers ── */
  const postMainAction = useCallback(async (formData: FormData) => {
    const res = await fetch(`/admin/api/album/${albumId}`, { method: "POST", body: formData });
    return res.json();
  }, [albumId]);

  const postMediaAction = useCallback(async (formData: FormData) => {
    const res = await fetch(`/admin/api/album/${albumId}/media`, { method: "POST", body: formData });
    return res.json();
  }, [albumId]);

  const handleThumbnailSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsThumbnailUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("intent", "upload-thumbnail");
      fd.set("thumbnail", file);
      if (thumbnailUrl) fd.set("oldThumbnailUrl", thumbnailUrl);
      const data = await postMediaAction(fd);
      if (data.error) throw new Error(data.error);
      setThumbnailUrl(data.url);
      setSuccess("Thumbnail updated!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload thumbnail");
    } finally {
      setIsThumbnailUploading(false);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setMedia(prev => [...prev, ...files.map(file => ({ file, preview: URL.createObjectURL(file), status: "pending" as const, url: "" }))]);
  };

  const requestRemoveMedia = (index: number) => {
    const item = media[index];
    if (item.status !== "done" || !item.url) {
      setMedia(prev => {
        const next = [...prev];
        if (next[index].preview) URL.revokeObjectURL(next[index].preview!);
        next.splice(index, 1);
        return next;
      });
      return;
    }
    setConfirmDialog({
      isOpen: true, title: "Delete Photo", message: "Permanently remove this photo.", confirmLabel: "Delete Photo", isLoading: false,
      onConfirm: async () => {
        setConfirmDialog(p => ({ ...p, isLoading: true }));
        try {
          const fd = new FormData(); fd.set("intent", "delete-photo"); fd.set("imageUrl", item.url);
          await postMediaAction(fd);
        } catch { }
        setMedia(prev => {
          const next = [...prev];
          if (next[index]?.preview) URL.revokeObjectURL(next[index].preview!);
          next.splice(index, 1);
          return next;
        });
        closeDialog();
      }
    });
  };

  const handleUploadNewOnes = async () => {
    const pending = media.filter(m => m.status === "pending");
    if (pending.length === 0) return;
    setIsUploading(true);
    try {
      setMedia(prev => prev.map(m => m.status === "pending" ? { ...m, status: "uploading" } : m));
      const fd = new FormData(); fd.set("intent", "upload-images");
      pending.forEach(item => { if (item.file) fd.append("images", item.file); });
      const data = await postMediaAction(fd);
      if (data.error) throw new Error(data.error);
      const urls = data.urls || [];
      setMedia(prev => {
        const next = [...prev]; let uIdx = 0;
        for (let i = 0; i < next.length; i++) {
          if (next[i].status === "uploading") {
            if (urls[uIdx]) { next[i].status = "done"; next[i].url = urls[uIdx]; uIdx++; }
            else { next[i].status = "error"; }
          }
        }
        return next;
      });
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); } finally { setIsUploading(false); }
  };

  const handleSave = async () => {
    setIsSaving(true); setError(null);
    try {
      const urls = media.filter(m => m.status === "done" && m.url).map(m => m.url);
      const fd = new FormData(); fd.set("intent", "update-album");
      fd.set("title", title); fd.set("slug", slug); fd.set("description", description);
      fd.set("categoryId", categoryId); fd.set("sortOrder", sortOrder);
      fd.set("photos", JSON.stringify(urls)); fd.set("thumbnailUrl", thumbnailUrl);
      const data = await postMainAction(fd);
      if (data.error) throw new Error(data.error);
      setSuccess("Album updated!"); setTimeout(() => setSuccess(null), 3000);
    } catch (err) { setError(err instanceof Error ? err.message : "Update failed"); } finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-8xl mx-auto p-4 md:p-6 animate-in fade-in duration-700">
      <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message} confirmLabel={confirmDialog.confirmLabel} isLoading={confirmDialog.isLoading} onConfirm={confirmDialog.onConfirm} onCancel={closeDialog} />

      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate("/admin/albums")} className="p-1.5 hover:bg-muted rounded-full transition-colors"><ArrowLeft size={18} /></button>
        <div><h1 className="text-xl font-semibold">Edit Album</h1><p className="text-sm text-muted-foreground">Update album details and manage photos.</p></div>
      </div>

      <div className="space-y-4 mb-8">
        <AnimatePresence>
          {error && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-sm"><AlertCircle size={18} className="mt-0.5 text-red-500 shrink-0" /><p className="text-red-700 font-medium flex-1">{error}</p><button onClick={() => setError(null)}><X size={16} /></button></motion.div>}
          {success && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3 text-green-700 text-sm"><CheckCircle size={18} className="mt-0.5" /><p className="font-medium">{success}</p></motion.div>}
        </AnimatePresence>
      </div>

      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/40 rounded-lg p-6 space-y-6">
          <h2 className="text-lg font-medium">Album Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><label className="block text-sm font-medium">Title *</label><input value={title} onChange={e => { setTitle(e.target.value); setSlug(createSlug(e.target.value)); }} className="w-full bg-background border border-border/50 rounded-lg px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-ring/20" /></div>
            <div className="space-y-2"><label className="block text-sm font-medium">Slug *</label><input value={slug} onChange={e => setSlug(e.target.value)} className="w-full bg-background border border-border/50 rounded-lg px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-ring/20" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><label className="block text-sm font-medium">Category *</label><div className="flex flex-wrap gap-2">{categories.map((cat: any) => (<button key={cat.id} type="button" onClick={() => setCategoryId(cat.id)} className={`px-4 py-2 text-xs font-bold uppercase rounded-md transition-all ${categoryId === cat.id ? "bg-foreground text-background shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{cat.name}</button>))}</div></div>
            <div className="space-y-2"><label className="block text-sm font-medium">Display Order</label><input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-32 px-4 py-2 bg-background border border-border/50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-ring/20" /></div>
          </div>
          <div className="space-y-2 pt-2"><label className="block text-sm font-medium">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-background border border-border/50 rounded-lg px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-ring/20 resize-none" /></div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/40 rounded-lg p-6 space-y-5 lg:col-span-1">
            <h2 className="text-lg font-medium">Cover</h2>
            <div className="space-y-4">
              <div onClick={() => thumbnailInputRef.current?.click()} className="w-full aspect-[4/5] border-2 border-dashed border-border/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group bg-neutral-50/50">
                <input ref={thumbnailInputRef} type="file" accept="image/*" onChange={handleThumbnailSelect} className="hidden" />
                {thumbnailUrl ? (<><img src={thumbnailUrl} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2"><RefreshCw className="text-white bg-white/20 p-2 rounded-full backdrop-blur-md" size={40} /><span className="text-[10px] text-white font-bold uppercase">Replace</span></div></>) : (<div className="text-center p-4"><ImagePlus size={32} className="mx-auto mb-2 text-muted-foreground" /><p className="text-xs font-medium text-muted-foreground">Upload Thumbnail</p></div>)}
                {isThumbnailUploading && (<div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2"><Loader2 size={28} className="text-white animate-spin" /><span className="text-[10px] text-white font-bold uppercase">Processing</span></div>)}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/40 rounded-lg p-6 space-y-5 lg:col-span-3">
            <div className="flex items-center justify-between"><h2 className="text-lg font-medium">Album Photos</h2><span className="text-xs font-bold text-muted-foreground uppercase">{media.length} Images</span></div>
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border/50 hover:border-accent/50 rounded-2xl p-8 text-center cursor-pointer transition-colors group bg-neutral-50/30">
              <ImagePlus size={36} className="mx-auto mb-3 text-muted-foreground" /><p className="text-sm font-semibold">Drop images here or click to browse</p><input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3 max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {media.map((item, i) => (
                  <motion.div key={item.url || item.preview || i} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative aspect-square rounded-xl overflow-hidden group bg-muted border border-border/30 shadow-sm">
                    <img src={item.url || item.preview} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                    {item.status === "uploading" && (<div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2"><Loader2 size={20} className="text-white animate-spin" /><span className="text-[9px] text-white font-bold uppercase">Uploading</span></div>)}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><button type="button" onClick={() => requestRemoveMedia(i)} className="bg-white text-red-600 p-2 rounded-full shadow-2xl hover:scale-110 transition-transform"><Trash2 size={16} /></button></div>
                    {item.status === "pending" && (<div className="absolute top-2 left-2 px-1.5 py-0.5 bg-accent text-[8px] font-bold text-white uppercase rounded shadow-md">Queue</div>)}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {media.some(m => m.status === "pending") && (<div className="pt-5 border-t border-border/30 flex justify-end"><button type="button" onClick={handleUploadNewOnes} disabled={isUploading} className="px-4 py-2 bg-black text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 hover:opacity-80"><Upload size={18} /> {isUploading ? "Uploading..." : "Upload New Items"}</button></div>)}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-4 border-t border-border/50 flex justify-end">
          <button type="button" onClick={handleSave} disabled={isSaving || isUploading || media.some(m => m.status === "pending")} className="px-6 py-2.5 bg-foreground text-background rounded-xl text-sm font-bold  transition-all hover:opacity-90 disabled:opacity-30 shadow-2xl flex items-center gap-2">
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} {isSaving ? "Saving..." : "Update Album"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
