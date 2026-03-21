import { useState, useRef } from "react";
import { Form, useActionData, useNavigation, useLoaderData } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { generatePresignedUploadUrl, buildObjectKey } from "~/utils/s3.server";
import { createAlbum, addPhotosToAlbum, getCategories } from "~/utils/supabase.server";

/** UTILITY: Convert image to WebP (Quality 0.85 by default) */
async function convertFileToWebP(file: File, quality = 0.85): Promise<{ blob: Blob; filename: string }> {
  return new Promise((resolve, reject) => {
    // If it's not an image, just return original (though we only accept image/*)
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
        
        // Basic resolution check: if extremely large, maybe downscale a bit for web
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 3200; // Cap at 3200px (4K-ish) for web display
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
              reject(new Error("WebP conversion failed (blob null)"));
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

export async function loader() {
  const categories = await getCategories();
  return { categories };
}

export function meta() {
  return [
    { title: "New Album — Tiệm ảnh Hina Studio Admin" },
    { name: "description", content: "Create a new photo album." },
  ];
}

// Server action: generate presigned URLs or create album
export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

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
      cover_url: photoUrls[0] || undefined,
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
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
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

  // Client-side: request presigned URLs then PUT directly to R2
  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setError(null);
    const albumId = crypto.randomUUID();

    try {
      const updatedFiles = [...files];
      const preparedFiles: { blob: Blob; filename: string }[] = [];

      // 1. Convert ALL files to WebP locally first
      for (let i = 0; i < updatedFiles.length; i++) {
        updatedFiles[i].status = "uploading";
        updatedFiles[i].progress = 10; // "Preparing"
        setFiles([...updatedFiles]);

        try {
          const { blob, filename } = await convertFileToWebP(updatedFiles[i].file);
          preparedFiles.push({ blob, filename });
        } catch (err) {
          console.error("Conversion error:", err);
          updatedFiles[i].status = "error";
          // Try to fallback to original if conversion fails
          preparedFiles.push({ blob: updatedFiles[i].file, filename: updatedFiles[i].file.name });
        }
      }

      // 2. Get presigned URLs from server for the .webp files
      const formData = new FormData();
      formData.set("intent", "get-upload-urls");
      formData.set("albumId", albumId);
      formData.set(
        "files",
        JSON.stringify(preparedFiles.map((f) => ({ 
          name: f.filename, 
          type: "image/webp" 
        })))
      );

      const res = await fetch("/admin/new-album", { 
        method: "POST", 
        body: formData,
        headers: { "Accept": "application/json" }
      });
      const data = await res.json();

      if (data.intent === "error") throw new Error(data.error);
      if (!data.urls) throw new Error("Failed to get upload URLs");

      // 3. Upload each converted blob directly to R2
      const publicUrls: string[] = [];

      for (let i = 0; i < updatedFiles.length; i++) {
        if (updatedFiles[i].status === "error") continue;
        
        updatedFiles[i].status = "uploading";
        updatedFiles[i].progress = 50;
        setFiles([...updatedFiles]);

        try {
          const { blob, filename } = preparedFiles[i];
          await fetch(data.urls[i].uploadUrl, {
            method: "PUT",
            body: blob,
            headers: { "Content-Type": "image/webp" },
          });

          updatedFiles[i].status = "done";
          updatedFiles[i].progress = 100;
          updatedFiles[i].publicUrl = data.urls[i].publicUrl;
          publicUrls.push(data.urls[i].publicUrl);
        } catch (err) {
          console.error("Upload error:", err);
          updatedFiles[i].status = "error";
        }

        setFiles([...updatedFiles]);
      }

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

  return (
    <div className="p-8 max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-medium mb-2">New Album</h1>
        <p className="text-muted-foreground font-medium">
          Create a new album and upload your photos.
        </p>
      </motion.div>

      {(error || (actionData as any)?.error) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3"
        >
          <AlertCircle size={18} className="text-destructive shrink-0" />
          <p className="text-destructive text-sm font-medium">
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

          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted-foreground">
              Title *
            </label>
            <input
              value={title}
              onChange={(e) => {
                const val = e.target.value;
                setTitle(val);
                // Auto-generate slug
                setSlug(val.toLowerCase()
                  .replace(/ /g, "-")
                  .replace(/[^\w-]+/g, "")
                );
              }}
              placeholder="e.g. Golden Hour Wedding"
              className="w-full px-4 py-3 bg-background border border-border rounded-md text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted-foreground">
              Slug * (URL friendly)
            </label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. golden-hour-wedding"
              className="w-full px-4 py-3 bg-background border border-border rounded-md text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="A brief description of this album..."
              className="w-full px-4 py-3 bg-background border border-border rounded-md text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted-foreground">
              Category *
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${categoryId === cat.id
                    ? "bg-accent text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Photo upload */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-card border border-border/50 rounded-lg p-6 space-y-5"
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
              className="mx-auto text-muted-foreground group-hover:text-accent transition-colors mb-4"
            />
            <p className="text-sm text-muted-foreground font-medium">
              Click to select photos
            </p>
            <p className="text-xs text-muted-foreground/60 font-medium mt-1">
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
              className="flex items-center gap-2 px-6 py-3 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent/90 disabled:opacity-50 transition-all cursor-pointer"
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

        {/* Submit form */}
        <Form method="post" onSubmit={handleSubmit}>
          <input type="hidden" name="intent" value="create-album" />
          <input type="hidden" name="title" value={title} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="description" value={description} />
          <input type="hidden" name="categoryId" value={categoryId} />
          <input type="hidden" name="photos" value={JSON.stringify(uploadedUrls)} />

          <button
            type="submit"
            disabled={isSubmitting || !title || !slug || !categoryId}
            className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium uppercase rounded-md hover:bg-accent disabled:opacity-50 transition-all cursor-pointer"
          >
            {isSubmitting ? "Publishing..." : "Publish Album"}
          </button>
        </Form>
      </div>
    </div>
  );
}
