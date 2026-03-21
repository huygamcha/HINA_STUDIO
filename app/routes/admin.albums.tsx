import { useLoaderData, useActionData, useNavigation, Form, Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit2,
  Search,
  FolderOpen,
  Image as ImageIcon,
  Calendar,
  Tag,
  ExternalLink,
  AlertCircle,
  Loader2
} from "lucide-react";
import { getAlbums, deleteAlbum } from "~/utils/supabase.server";
import { useState } from "react";

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
      await deleteAlbum(id);
      return { success: true };
    } catch (e: any) {
      return { error: "Failed to delete album. Please try again." };
    }
  }

  return null;
}

export default function AlbumsPage() {
  const { albums } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [searchQuery, setSearchQuery] = useState("");

  const filteredAlbums = albums.filter(album =>
    album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    album.categoryName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-12 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="space-y-1">
          <h1 className="text-4xl font-light  text-foreground flex items-center gap-3">
            Portfolio <span className="font-semibold text-accent">Albums</span>
          </h1>
          <p className="text-muted-foreground font-light text-base max-w-md leading-relaxed">
            Manage your photography collections, upload photos, and organize your work.
          </p>
        </div>

        <Link
          to="/admin/new-album"
          className="group relative flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-full text-sm font-medium transition-all hover:scale-[1.03] active:scale-95 overflow-hidden shadow-xl shadow-foreground/10"
        >
          <div className="absolute inset-0 bg-accent translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none opacity-20" />
          <Plus size={18} className="transition-transform group-hover:rotate-90 duration-300" />
          <span>Upload New Album</span>
        </Link>
      </div>

      {actionData?.error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 p-4 bg-destructive/5 border border-destructive/20 rounded-2xl flex items-start gap-3 text-destructive text-sm"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold mb-0.5">Operation failed</p>
            <p className="opacity-90">{actionData.error}</p>
          </div>
        </motion.div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border/40 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-4 px-4 bg-card border border-border/40 rounded-2xl text-xs font-medium text-muted-foreground">
          <span>{filteredAlbums.length} {filteredAlbums.length === 1 ? 'Album' : 'Albums'}</span>
        </div>
      </div>

      {/* Albums Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredAlbums.length === 0 ? (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-24 text-center border-2 border-dashed border-border/50 rounded-3xl space-y-4"
            >
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground/50">
                <FolderOpen size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-medium text-foreground">No albums found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or create a new album.</p>
              </div>
            </motion.div>
          ) : (
            filteredAlbums.map((album, index) => (
              <motion.div
                layout
                key={album.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className="group bg-card border border-border/40 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-foreground/5 hover:border-border/80 flex flex-col"
              >
                {/* Cover Image */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  {album.cover_url ? (
                    <img
                      src={album.cover_url}
                      alt={album.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground/30">
                      <ImageIcon size={48} strokeWidth={1} />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 pt-12">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-accent text-[10px] font-bold uppercase  text-white rounded-full">
                        {album.categoryName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold  text-foreground line-clamp-1">{album.title}</h3>
                    <p className="text-xs font-mono text-muted-foreground uppercase  mb-1">{album.slug}</p>
                  </div>

                  {album.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 font-light leading-relaxed">
                      {album.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase  text-muted-foreground/70 mt-auto pt-4 border-t border-border/30">
                    <div className="flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-accent" />
                      <span>{album._count?.photos ?? 0} Photos</span>
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <Calendar size={14} />
                      <span>{new Date(album.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Link
                      to={`/album/${album.slug}`}
                      target="_blank"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl text-xs font-semibold uppercase  transition-all"
                    >
                      <ExternalLink size={14} /> View
                    </Link>
                    <Link
                      to={`/admin/edit-album/${album.id}`}
                      className="p-2.5 text-muted-foreground hover:text-accent hover:bg-accent/5 rounded-xl transition-all"
                      title="Edit Album"
                    >
                      <Edit2 size={18} strokeWidth={1.5} />
                    </Link>
                    <Form
                      method="post"
                      onSubmit={(e) => !confirm(`Delete "${album.title}"? This cannot be undone.`) && e.preventDefault()}
                      className="inline"
                    >
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="id" value={album.id} />
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl transition-all disabled:opacity-30"
                        title="Delete Album"
                      >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} strokeWidth={1.5} />}
                      </button>
                    </Form>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
