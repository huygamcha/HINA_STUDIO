import { useLoaderData, useActionData, useNavigation, Form, Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit2,
  Search,
  FolderOpen,
  Image as ImageIcon,
  ExternalLink,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { getAlbums, deleteAlbum, getAlbumPhotos } from "~/utils/supabase.server";
import { deleteImageFromR2 } from "~/utils/s3.server";
import { useState, useEffect } from "react";

export async function loader() {
  const albums = await getAlbums();
  return { albums };
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "delete") {
    const id = formData.get("id") as string;
    try {
      const photos = await getAlbumPhotos(id);
      // Parallelize deletions for speed
      await Promise.all(photos.map(p => deleteImageFromR2(p.url)));
      await deleteAlbum(id);
      return { success: true };
    } catch {
      return { error: "Failed to delete album. Please try again." };
    }
  }

  return null;
}

/* ═══════════════════════════════════════════
   CONFIRM DIALOG
   ═══════════════════════════════════════════ */
function ConfirmDialog({
  isOpen,
  title,
  message,
  isLoading,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={!isLoading ? onCancel : undefined}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative bg-white rounded-2xl shadow-2xl border border-border/30 max-w-sm w-full p-6 space-y-4"
          >
            <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center mx-auto">
              <AlertCircle size={24} className="text-destructive" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="text-sm  leading-relaxed">{message}</p>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="px-6 py-2 border border-border/50 rounded-xl text-sm font-medium transition-all hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className="px-6 py-2 bg-destructive text-white rounded-xl text-sm font-medium transition-all hover:bg-destructive/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════ */
export default function AlbumsPage() {
  const { albums } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const filteredAlbums = albums.filter(
    (album) =>
      album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      album.categoryName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const form = document.getElementById(`delete-form-${deleteTarget.id}`) as HTMLFormElement;
    if (form) form.requestSubmit();
  };

  // Close dialog on success or error return, OR when navigation finishes
  useEffect(() => {
    if (actionData) {
      setDeleteTarget(null);
    }
  }, [actionData]);

  useEffect(() => {
    if (navigation.state === "idle" && !isSubmitting) {
      setDeleteTarget(null);
    }
  }, [navigation.state, isSubmitting]);

  return (
    <div className="max-w-8xl mx-auto p-4 md:p-6">
      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Album"
        message={`Permanently delete "${deleteTarget?.title}" and all its photos? This cannot be undone.`}
        isLoading={isSubmitting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold">Albums</h1>
          <p className="text-sm text-muted-foreground">
            Manage your photography collections · {albums.length} total
          </p>
        </div>
        <Link
          to="/admin/new-album"
          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium transition-all hover:opacity-90"
        >
          <Plus size={16} />
          New Album
        </Link>
      </div>

      {/* Error */}
      {actionData?.error && (
        <div className="mb-4 px-4 py-3 bg-destructive/5 border border-destructive/20 rounded-lg flex items-center gap-2 text-sm text-destructive">
          <AlertCircle size={16} className="shrink-0" />
          {actionData.error}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 " />
          <input
            type="text"
            placeholder="Search albums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-border/50 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-ring/20 focus:border-ring outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5  hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <span className="text-xs ">
          {filteredAlbums.length} {filteredAlbums.length === 1 ? "album" : "albums"}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredAlbums.length === 0 ? (
          <div className="col-span-full py-16 text-center border border-dashed border-border/50 rounded-lg">
            <FolderOpen size={28} className="mx-auto /40 mb-2" />
            <p className="text-sm ">
              {searchQuery ? "No albums match your search." : "No albums yet."}
            </p>
          </div>
        ) : (
          filteredAlbums.map((album) => (
            <div
              key={album.id}
              className="group bg-white border border-border/40 rounded-lg overflow-hidden hover:border-border/80 hover:shadow-sm transition-all flex flex-col"
            >
              {/* Image */}
              <div className="relative aspect-[3/2] overflow-hidden bg-muted">
                {album.thumbnail_url ? (
                  <img
                    src={album.thumbnail_url}
                    alt={album.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center /30">
                    <ImageIcon size={36} strokeWidth={1} />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-3 flex-1 flex flex-col">
                {/* Title */}
                <h3 className="text-sm font-semibold truncate leading-snug">
                  {album.title}
                </h3>

                {/* Meta line */}
                <p className="text-xs  mt-0.5 truncate">
                  {album.categoryName}
                  <span className="mx-1.5">·</span>
                  {album._count?.photos ?? 0} photos
                  <span className="mx-1.5">·</span>
                  Order: {album.sort_order}
                  <span className="mx-1.5">·</span>
                  {new Date(album.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/30">
                  <Link
                    to={`/album/${album.slug}`}
                    target="_blank"
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-foreground text-background rounded-md text-xs font-medium transition-all hover:opacity-90"
                  >
                    <ExternalLink size={12} />
                    View
                  </Link>
                  <Link
                    to={`/admin/edit-album/${album.id}`}
                    className="p-1.5  hover:text-foreground hover:bg-muted rounded-md transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={15} />
                  </Link>

                  {/* Hidden delete form */}
                  <Form method="post" id={`delete-form-${album.id}`} className="hidden">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={album.id} />
                  </Form>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ id: album.id, title: album.title })}
                    disabled={isSubmitting}
                    className="p-1.5  hover:text-destructive hover:bg-destructive/5 rounded-md transition-colors disabled:opacity-30"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
