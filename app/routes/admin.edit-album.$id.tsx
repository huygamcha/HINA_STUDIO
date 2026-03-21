import { useState, useRef, useEffect } from "react";
import { Form, useActionData, useNavigation, useLoaderData, useParams, useNavigate } from "react-router";
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
  Plus
} from "lucide-react";
import { generatePresignedUploadUrl, buildObjectKey } from "~/utils/s3.server";
import { updateAlbum, getAlbumById, getAlbumPhotos, syncAlbumPhotos, getCategories } from "~/utils/supabase.server";

/** UTILITY: Convert image to WebP (Quality 0.85 by default) */
async function convertFileToWebP(file: File, quality = 0.85): Promise<{ blob: Blob; filename: string }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      return resolve({ blob: file, filename: file.name });
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 3200; 
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const name = file.name.replace(/\.[^/.]+$/, "");
              resolve({ blob, filename: `${name}.webp` });
            } else {
              reject(new Error("WebP conversion failed"));
            }
          },
          "image/webp",
          quality
        );
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
    };
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
  });
}

export async function loader({ params }: { params: { id: string } }) {
  const album = await getAlbumById(params.id);
  if (!album) {
    throw new Response("Album Not Found", { status: 404 });
  }
  const photos = await getAlbumPhotos(params.id);
  const categories = await getCategories();
  return { album, photos, categories };
}

export async function action({ request, params }: { request: Request; params: { id: string } }) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const albumId = params.id;

  if (intent === "get-upload-urls") {
    try {
      const filesJson = formData.get("files") as string;
      const files: { name: string; type: string }[] = JSON.parse(filesJson);

      const urls = await Promise.all(
        files.map(async (file) => {
          const key = buildObjectKey(albumId, `${Date.now()}-${file.name}`);
          const { uploadUrl, publicUrl } = await generatePresignedUploadUrl(
            key,
            file.type
          );
          return { uploadUrl, publicUrl, fileName: file.name };
        })
      );

      return { intent: "upload-urls", urls };
    } catch (err) {
      console.error("Action error:", err);
      return { intent: "error", error: err instanceof Error ? err.message : "Failed to generate upload URLs" };
    }
  }

  if (intent === "update-album") {
    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string;
    const categoryId = formData.get("categoryId") as string;
    const photosJson = formData.get("photos") as string;

    if (!title || !categoryId) {
      return { intent: "error", error: "Title and category are required." };
    }

    const photoUrls: string[] = photosJson ? JSON.parse(photosJson) : [];

    await updateAlbum(albumId, {
      title,
      slug,
      description: description || undefined,
      categoryId,
      cover_url: photoUrls[0] || undefined,
    });

    await syncAlbumPhotos(
      albumId,
      photoUrls.map((url, i) => ({
        url,
        sort_order: i,
      }))
    );

    return { intent: "success" };
  }

  return { intent: "error", error: "Unknown intent." };
}

interface PhotoItem {
  url: string;
  status: "done" | "uploading" | "pending" | "error";
  id?: string;
  preview?: string;
  file?: File;
}

export default function EditAlbumPage() {
  const { album, photos, categories } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(album.title);
  const [slug, setSlug] = useState(album.slug);
  const [description, setDescription] = useState(album.description || "");
  const [categoryId, setCategoryId] = useState(album.categoryId);

  // Initial existing photos
  const [media, setMedia] = useState<PhotoItem[]>(
    photos.map(p => ({ url: p.url, status: "done", id: p.id }))
  );

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if ((actionData as any)?.intent === "success") {
      // Optional: Redirect or show success
    }
  }, [actionData]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newItems: PhotoItem[] = selectedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: "pending",
      url: "",
    }));
    setMedia((prev) => [...prev, ...newItems]);
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => {
      const updated = [...prev];
      if (updated[index].preview) URL.revokeObjectURL(updated[index].preview!);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleUploadNewOnes = async () => {
    const pendingItems = media.filter(m => m.status === "pending");
    if (pendingItems.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const preparedFiles: { blob: Blob; filename: string }[] = [];

      // 1. Convert ALL pending files to WebP locally first
      for (let i = 0; i < media.length; i++) {
        if (media[i].status !== "pending") continue;

        const { blob, filename } = await convertFileToWebP(media[i].file!);
        preparedFiles.push({ blob, filename });
      }

      // 2. Get presigned URLs from server for the .webp files
      const formData = new FormData();
      formData.set("intent", "get-upload-urls");
      formData.set(
        "files",
        JSON.stringify(preparedFiles.map((f) => ({ 
          name: f.filename, 
          type: "image/webp" 
        })))
      );

      const res = await fetch(`/admin/edit-album/${album.id}`, { 
        method: "POST", 
        body: formData,
        headers: { "Accept": "application/json" }
      });
      const data = await res.json();

      if (data.intent === "error") throw new Error(data.error);
      if (!data.urls) throw new Error("Failed to get upload URLs");

      const tempMedia = [...media];
      let uploadIndex = 0;

      for (let i = 0; i < tempMedia.length; i++) {
        if (tempMedia[i].status !== "pending") continue;

        const currentUpload = data.urls[uploadIndex];
        tempMedia[i].status = "uploading";
        setMedia([...tempMedia]);

        try {
          const { blob } = preparedFiles[uploadIndex];
          await fetch(currentUpload.uploadUrl, {
            method: "PUT",
            body: blob,
            headers: { "Content-Type": "image/webp" },
          });

          tempMedia[i].status = "done";
          tempMedia[i].url = currentUpload.publicUrl;
        } catch (err) {
          console.error("Upload error:", err);
          tempMedia[i].status = "error";
        }

        uploadIndex++;
        setMedia([...tempMedia]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const currentUrls = media.filter(m => m.status === "done" && m.url).map(m => m.url);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 lg:p-12 animate-in fade-in duration-700">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate("/admin/albums")}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-light  text-foreground">
            Edit <span className="font-semibold text-accent">Album</span>
          </h1>
          <p className="text-muted-foreground text-sm">Update album details and manage photos.</p>
        </div>
      </div>

      {(error || (actionData as any)?.error) && (
        <div className="mb-8 p-4 bg-destructive/5 border border-destructive/20 rounded-2xl flex items-start gap-3 text-destructive text-sm">
          <AlertCircle size={18} className="mt-0.5" />
          <p>{error || (actionData as any)?.error}</p>
        </div>
      )}

      {((actionData as any)?.intent === "success") && (
        <div className="mb-8 p-4 bg-green-500/5 border border-green-500/20 rounded-2xl flex items-start gap-3 text-green-600 text-sm">
          <CheckCircle size={18} className="mt-0.5" />
          <p>Album updated successfully!</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-card border border-border/40 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              General Information
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase  text-muted-foreground ml-1">Title</label>
                <input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setSlug(e.target.value.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, ""));
                  }}
                  className="w-full bg-background border border-border/50 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase  text-muted-foreground ml-1">Url Slug</label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-background border border-border/50 rounded-2xl px-5 py-3 font-mono text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase  text-muted-foreground ml-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-background border border-border/50 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all resize-none"
                />
              </div>

              <div className="space-y-4 pt-2">
                <label className="text-xs font-bold uppercase  text-muted-foreground ml-1">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${categoryId === cat.id
                        ? "bg-accent text-white shadow-lg shadow-accent/20"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-card border border-border/40 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Album Photos
                <span className="text-xs font-normal text-muted-foreground ml-2">({media.length})</span>
              </h2>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
              >
                <Plus size={18} /> Add Photos
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <AnimatePresence>
                {media.map((item, i) => (
                  <motion.div
                    key={item.preview || item.url || i}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm ring-1 ring-border/50"
                  >
                    <img
                      src={item.preview || item.url}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
                    />

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        className="p-2 bg-destructive/90 text-white rounded-xl hover:bg-destructive transition-colors shadow-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {item.status === "uploading" && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 p-4">
                        <Loader2 size={24} className="text-white animate-spin" />
                        <span className="text-[10px] text-white font-bold uppercase ">Uploading</span>
                      </div>
                    )}

                    {item.status === "pending" && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-accent text-[9px] font-bold text-white uppercase  rounded-full shadow-lg">
                        Pending
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {media.some(m => m.status === "pending") && (
              <div className="pt-4 border-t border-border/30">
                <button
                  type="button"
                  onClick={handleUploadNewOnes}
                  disabled={isUploading}
                  className="w-full py-4 bg-accent/5 hover:bg-accent/10 text-accent border border-accent/20 rounded-2xl text-sm font-bold uppercase  transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                  {isUploading ? "Uploading..." : `Upload ${media.filter(m => m.status === "pending").length} New Photos`}
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar / Actions */}
        <div className="space-y-6">
          <section className="bg-card border border-border/40 rounded-3xl p-6 space-y-6 shadow-xl sticky top-8">
            <h3 className="font-semibold text-foreground">Save Changes</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ensure all your photos are uploaded (status: Done) before publishing updates.
            </p>

            <Form method="post" className="space-y-3">
              <input type="hidden" name="intent" value="update-album" />
              <input type="hidden" name="title" value={title} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="description" value={description} />
              <input type="hidden" name="categoryId" value={categoryId} />
              <input type="hidden" name="photos" value={JSON.stringify(currentUrls)} />

              <button
                type="submit"
                disabled={isSubmitting || isUploading || media.some(m => m.status === "pending")}
                className="w-full py-4 bg-foreground text-background hover:bg-accent hover:text-white rounded-2xl text-sm font-bold uppercase  transition-all shadow-xl shadow-foreground/10 flex items-center justify-center gap-2 disabled:opacity-30"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                Update Album
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/albums")}
                className="w-full py-3 text-muted-foreground hover:bg-muted rounded-2xl text-xs font-semibold uppercase  transition-all"
              >
                Discard Changes
              </button>
            </Form>

            <div className="pt-6 border-t border-border/30 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Photos Ready</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{media.filter(m => m.status === "done").length} Cloud Assets</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
