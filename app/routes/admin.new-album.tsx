import { useState, useRef } from "react";
import { Form, useActionData, useNavigation, useLoaderData, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  ImagePlus,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { generatePresignedUploadUrl, buildObjectKey, uploadImageToR2 } from "~/utils/s3.server";
import { createAlbum, addPhotosToAlbum, getCategories } from "~/utils/supabase.server";
import { createSlug } from "~/utils/slug";



export async function loader() {
  const categories = await getCategories();
  return { categories };
}

export function meta() {
  return [
    { title: "New Album — Tiệm ảnh Hina Admin" },
    { name: "description", content: "Create a new photo album." },
  ];
}

// Server action: upload images or create album
export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  // Server-side upload (ReservationSystem pattern)
  // Receives raw files, converts to WebP via sharp, uploads to R2
  if (intent === "upload-images") {
    try {
      const albumId = formData.get("albumId") as string;
      const files = formData.getAll("images") as File[];

      if (!files || files.length === 0) {
        return { intent: "error", error: "No files provided" };
      }

      const folder = `albums/${albumId}`;
      const urls: string[] = [];

      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const publicUrl = await uploadImageToR2(buffer, file.name, folder);
        if (publicUrl) urls.push(publicUrl);
      }

      return Response.json({ intent: "upload-urls", urls });
    } catch (err) {
      console.error("Server upload error:", err);
      return Response.json({ intent: "error", error: err instanceof Error ? err.message : "Failed to upload images" }, { status: 500 });
    }
  }

  // Presigned URL fallback (existing pattern)
  if (intent === "get-upload-urls") {
    try {
      const filesJson = formData.get("files") as string;
      const albumId = formData.get("albumId") as string;
      const files: { name: string; type: string }[] = JSON.parse(filesJson);

      const urls = await Promise.all(
        files.map(async (file) => {
          const key = buildObjectKey(albumId, file.name);
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

  if (intent === "create-album") {
    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string;
    const categoryId = formData.get("categoryId") as string;
    const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;
    const thumbnailUrl = formData.get("thumbnailUrl") as string;
    const photosJson = formData.get("photos") as string;

    if (!title || !categoryId) {
      return { intent: "error", error: "Title and category are required." };
    }

    const photoUrls: string[] = photosJson ? JSON.parse(photosJson) : [];

    const album = await createAlbum({
      title,
      slug,
      description: description || undefined,
      categoryId,
      sort_order: sortOrder,
      cover_url: thumbnailUrl || photoUrls[0] || undefined,
      thumbnail_url: thumbnailUrl || photoUrls[0] || undefined,
    });

    if (photoUrls.length > 0) {
      await addPhotosToAlbum(
        photoUrls.map((url, i) => ({
          album_id: album.id,
          url,
          sort_order: i,
        }))
      );
    }

    return { intent: "success", album };
  }

  return { intent: "error", error: "Unknown intent." };
}

// File preview type
interface FilePreview {
  file: File;
  preview: string;
  status: "pending" | "uploading" | "done" | "error";
  publicUrl?: string;
  progress: number;
}

export default function NewAlbumPage() {
  const { categories } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [thumbnail, setThumbnail] = useState<FilePreview | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = navigation.state === "submitting";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const previews: FilePreview[] = selectedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: "pending",
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...previews]);
    setUploadComplete(false);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  // Server-side upload: send files to server action, server converts to WebP via sharp & uploads to R2
  // (Pattern from ReservationSystem's CloudflareService)
  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setError(null);
    const albumId = crypto.randomUUID();

    try {
      const updatedFiles = [...files];

      // Mark all as uploading
      for (let i = 0; i < updatedFiles.length; i++) {
        updatedFiles[i].status = "uploading";
        updatedFiles[i].progress = 30;
      }
      setFiles([...updatedFiles]);

      // Send all files to server for processing (sharp WebP conversion + R2 upload)
      const formData = new FormData();
      formData.set("intent", "upload-images");
      formData.set("albumId", albumId);
      for (const fp of updatedFiles) {
        formData.append("images", fp.file);
      }

      const res = await fetch("/admin/upload-images", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.intent === "error") throw new Error(data.error);
      if (!data.urls || data.urls.length === 0) throw new Error("No images were uploaded");

      // Update file statuses with returned URLs
      for (let i = 0; i < updatedFiles.length; i++) {
        if (data.urls[i]) {
          updatedFiles[i].status = "done";
          updatedFiles[i].progress = 100;
          updatedFiles[i].publicUrl = data.urls[i];
        } else {
          updatedFiles[i].status = "error";
        }
      }
      setFiles([...updatedFiles]);
      setUploadComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!title || !slug || !categoryId) {
      e.preventDefault();
      setError("Please fill in title, slug and category.");
      return;
    }
  };

  const uploadedUrls = files.filter((f) => f.publicUrl).map((f) => f.publicUrl!);

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnail({
      file,
      preview: URL.createObjectURL(file),
      status: "pending",
      progress: 0,
    });
  };

  const handleUploadThumbnail = async () => {
    if (!thumbnail || thumbnail.status === "done") return;
    setIsUploadingThumbnail(true);
    try {
      const formData = new FormData();
      formData.set("intent", "upload-images");
      formData.set("albumId", "thumbnails");
      formData.append("images", thumbnail.file);

      const res = await fetch("/admin/upload-images", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.intent === "error") throw new Error(data.error);
      if (!data.urls?.[0]) throw new Error("Thumbnail upload failed");

      setThumbnail(prev => prev ? { ...prev, status: "done", publicUrl: data.urls[0] } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thumbnail upload failed");
    } finally {
      setIsUploadingThumbnail(false);
    }
  };
  const navigate = useNavigate();

  return (
    <div className="max-w-8xl mx-auto p-4 md:p-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate("/admin/albums")}
          className="p-1.5 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-semibold">New Album</h1>
          <p className="text-sm text-muted-foreground">Create a new album and upload your photos.</p>
        </div>
      </div>

      {(error || (actionData as any)?.error) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3"
        >
          <AlertCircle size={18} className=" shrink-0" />
          <p className=" text-sm font-medium">
            {error || (actionData as any)?.error}
          </p>
        </motion.div>
      )}

      {(actionData as any)?.intent === "success" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3"
        >
          <CheckCircle size={18} className="text-green-500 shrink-0" />
          <p className="text-green-600 dark:text-green-400 text-sm font-medium">
            Album created successfully!
          </p>
        </motion.div>
      )}

      <div className="space-y-8">
        {/* Album details */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-card border border-border/50 rounded-lg p-6 space-y-5"
        >
          <h2 className="text-lg font-medium">Album Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium ">
                Title *
              </label>
              <input
                value={title}
                onChange={(e) => {
                  const val = e.target.value;
                  setTitle(val);
                  // Auto-generate slug
                  setSlug(createSlug(val));
                }}
                placeholder="e.g. Golden Hour Wedding"
                className="w-full px-4 py-3 bg-background border border-border rounded-md text-sm font-medium placeholder:/50 focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium ">
                Slug * (URL friendly)
              </label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. golden-hour-wedding"
                className="w-full px-4 py-3 bg-background border border-border rounded-md text-sm font-medium placeholder:/50 focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium ">
                Category *
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${categoryId === cat.id
                      ? "bg-foreground text-background shadow-md"
                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium ">
                Display Order
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="0"
                className="w-32 px-4 py-2 bg-background border border-border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium ">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="A brief description of this album..."
              className="w-full px-4 py-3 bg-background border border-border rounded-md text-sm font-medium placeholder:/50 focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all resize-none"
            />
          </div>


        </motion.div>

        <div className="grid grid-cols-4 gap-4">
          {/* Thumbnail upload */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="bg-card border border-border/50 rounded-lg p-6 space-y-5 col-span-1"
          >
            <h2 className="text-lg font-medium">Cover Thumbnail</h2>
            <div className="flex flex-col gap-4 items-start">
              <div
                onClick={() => document.getElementById("thumbnail-input")?.click()}
                className="w-full md:w-40 aspect-[4/5] md:aspect-square border-2 border-dashed border-border hover:border-accent/50 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden group bg-neutral-50/50"
              >
                {thumbnail?.preview ? (
                  <>
                    <img src={thumbnail.preview} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ImagePlus className="text-white" size={24} />
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <ImagePlus size={32} strokeWidth={1} className="mx-auto  mb-2" />
                    <p className="text-xs font-medium">Click to select cover</p>
                  </div>
                )}
                <input
                  id="thumbnail-input"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailSelect}
                  className="hidden"
                />
              </div>

              <div className="flex-1 space-y-4">
                {thumbnail && thumbnail.status !== "done" && (
                  <button
                    type="button"
                    onClick={handleUploadThumbnail}
                    disabled={isUploadingThumbnail}
                    className="px-6 py-2 bg-emerald-700 text-white text-xs font-bold  rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {isUploadingThumbnail ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {isUploadingThumbnail ? "Uploading..." : "Upload Cover"}
                  </button>
                )}
                {thumbnail?.status === "done" && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 rounded-lg text-xs font-bold uppercase">
                    <CheckCircle size={14} /> Ready to Publish
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Photo upload */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-card border border-border/50 rounded-lg p-6 space-y-5 col-span-3"
          >
            <h2 className="text-lg font-medium">Photos</h2>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-accent/50 rounded-lg p-10 text-center cursor-pointer transition-colors group"
            >
              <ImagePlus
                size={40}
                strokeWidth={1}
                className="mx-auto  group-hover: transition-colors mb-4"
              />
              <p className="text-sm  font-medium">
                Click to select photos
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-1">
                JPG, PNG, WebP • Max 20MB per file
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Preview grid */}
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-3 sm:grid-cols-4 gap-3"
                >
                  {files.map((fp, i) => (
                    <motion.div
                      key={fp.preview}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative aspect-square rounded-md overflow-hidden group"
                    >
                      <img
                        src={fp.preview}
                        alt={fp.file.name}
                        className="w-full h-full object-cover"
                      />
                      {/* Status overlay */}
                      {fp.status === "uploading" && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 size={20} className="text-white animate-spin" />
                        </div>
                      )}
                      {fp.status === "done" && (
                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                          <CheckCircle size={20} className="text-green-400" />
                        </div>
                      )}
                      {fp.status === "error" && (
                        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                          <AlertCircle size={20} className="text-red-400" />
                        </div>
                      )}
                      {/* Remove button */}
                      {fp.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <X size={12} className="text-white" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upload button */}
            {files.length > 0 && !uploadComplete && (
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-xl hover:opacity-80 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isUploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} strokeWidth={1.5} />
                )}
                {isUploading ? "Uploading..." : `Upload ${files.length} Photo${files.length > 1 ? "s" : ""}`}
              </button>
            )}
          </motion.div>
        </div>

        {/* Submit form */}
        <Form method="post" onSubmit={handleSubmit}>
          <input type="hidden" name="intent" value="create-album" />
          <input type="hidden" name="title" value={title} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="description" value={description} />
          <input type="hidden" name="categoryId" value={categoryId} />
          <input type="hidden" name="sortOrder" value={sortOrder} />
          <input type="hidden" name="thumbnailUrl" value={thumbnail?.publicUrl || ""} />
          <input type="hidden" name="photos" value={JSON.stringify(uploadedUrls)} />

          <button
            type="submit"
            disabled={isSubmitting || !title || !slug || !categoryId}
            className="w-fit ml-auto block px-4 py-2 bg-primary text-primary-foreground text-sm font-medium  rounded-xl hover:opacity-70 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isSubmitting ? "Publishing..." : "Publish Album"}
          </button>
        </Form>
      </div>
    </div>
  );
}
