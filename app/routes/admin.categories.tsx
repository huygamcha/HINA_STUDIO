import { useState, useMemo, useEffect } from "react";
import { Form, useLoaderData, useActionData, useNavigation } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Loader2,
  AlertCircle,
  Tag,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "~/utils/supabase.server";
import { createSlug } from "~/utils/slug";

const PAGE_SIZE = 10;

export async function loader() {
  const categories = await getCategories();
  return { categories };
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  try {
    if (intent === "create") {
      const name = formData.get("name") as string;
      const slug = formData.get("slug") as string;
      const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;
      await createCategory({ name, slug, sort_order: sortOrder });
      return { success: true };
    }

    if (intent === "update") {
      const id = formData.get("id") as string;
      const name = formData.get("name") as string;
      const slug = formData.get("slug") as string;
      const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;
      await updateCategory(id, { name, slug, sort_order: sortOrder });
      return { success: true };
    }

    if (intent === "delete") {
      const id = formData.get("id") as string;
      await deleteCategory(id);
      return { success: true };
    }
  } catch (e: any) {
    if (intent === "delete") {
      return { error: "Cannot delete category that has albums associated with it." };
    }
    if (e.code === "P2002") {
      return { error: "A category with this name or slug already exists." };
    }
    return { error: "An unexpected error occurred. Please try again." };
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
  confirmLabel = "Delete",
  isLoading = false,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
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
                {confirmLabel}
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
export default function CategoriesPage() {
  const { categories } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting" || navigation.state === "loading";

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    catId: string;
    catName: string;
  }>({ isOpen: false, catId: "", catName: "" });
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const resetForm = () => {
    setName("");
    setSlug("");
    setSortOrder("0");
    setEditingId(null);
    setIsAdding(false);
  };

  const startEdit = (cat: any) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setSortOrder(cat.sort_order.toString());
    setIsAdding(false);
  };

  const autoSlug = (val: string) => {
    setName(val);
    setSlug(createSlug(val));
  };

  // Filtered + paginated
  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
    );
  }, [categories, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset to page 1 when search changes
  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  // Delete via form submission
  const handleDeleteConfirm = () => {
    setIsDeleteSubmitting(true);
    const form = document.getElementById(`delete-form-${confirmDialog.catId}`) as HTMLFormElement;
    if (form) form.requestSubmit();
  };

  // Close dialog on success or error return, OR when navigation finishes
  useEffect(() => {
    if (actionData) {
      setConfirmDialog({ isOpen: false, catId: "", catName: "" });
      setIsDeleteSubmitting(false);
    }
  }, [actionData]);

  useEffect(() => {
    if (navigation.state === "idle" && !isSubmitting) {
      setConfirmDialog({ isOpen: false, catId: "", catName: "" });
      setIsDeleteSubmitting(false);
    }
  }, [navigation.state, isSubmitting]);

  return (
    <div className="max-w-8xl mx-auto p-4 md:p-6">
      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Category"
        message={`Are you sure you want to delete "${confirmDialog.catName}"? This cannot be undone and will fail if it contains albums.`}
        confirmLabel="Delete"
        isLoading={isDeleteSubmitting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setConfirmDialog({ isOpen: false, catId: "", catName: "" });
          setIsDeleteSubmitting(false);
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Manage your album categories · {categories.length} total
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsAdding(true);
          }}
          disabled={isAdding}
          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
        >
          <Plus size={16} />
          New Category
        </button>
      </div>

      {/* Error */}
      {actionData?.error && (
        <div className="mb-4 px-4 py-3 bg-destructive/5 border border-destructive/20 rounded-lg flex items-center gap-2 text-sm text-destructive">
          <AlertCircle size={16} className="shrink-0" />
          {actionData.error}
        </div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="border border-border/50 rounded-lg p-4 bg-muted/30 space-y-4">
              <p className="text-sm font-medium">New Category</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => autoSlug(e.target.value)}
                  placeholder="Name"
                  className="flex-1 bg-white border border-border/50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring/20 focus:border-ring outline-none transition-all"
                />
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="Slug"
                  className="flex-1 bg-white border border-border/50 rounded-lg px-3 py-2 text-sm  focus:ring-2 focus:ring-ring/20 focus:border-ring outline-none transition-all"
                />
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  placeholder="Order"
                  className="w-20 bg-white border border-border/50 rounded-lg px-3 py-2 text-sm text-center focus:ring-2 focus:ring-ring/20 focus:border-ring outline-none transition-all"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={resetForm}
                  className="px-3 py-1.5 text-sm font-medium  hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <Form method="post" className="inline">
                  <input type="hidden" name="intent" value="create" />
                  <input type="hidden" name="name" value={name} />
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="sortOrder" value={sortOrder} />
                  <button
                    type="submit"
                    disabled={isSubmitting || !name || !slug}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-foreground text-background rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Create
                  </button>
                </Form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 " />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full bg-white border border-border/50 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-ring/20 focus:border-ring outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5  hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <span className="text-xs ">
          Showing {paged.length} of {filtered.length}
        </span>
      </div>

      {/* Table */}
      <div className="border border-border/50 rounded-lg overflow-hidden bg-white">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_1fr_80px_80px_100px] gap-4 px-4 py-2.5 bg-muted/40 border-b border-border/40 text-xs font-semibold  uppercase ">
          <span>Name</span>
          <span>Slug</span>
          <span className="text-center">Order</span>
          <span className="text-center">Albums</span>
          <span className="text-right">Actions</span>
        </div>

        {/* Empty state */}
        {paged.length === 0 && (
          <div className="py-16 text-center">
            <Tag size={28} className="mx-auto /40 mb-2" />
            <p className="text-sm ">
              {search ? "No categories match your search." : "No categories yet."}
            </p>
          </div>
        )}

        {/* Rows */}
        {paged.map((cat) => (
          <div key={cat.id}>
            {editingId === cat.id ? (
              /* ── Edit row ── */
              <div className="grid grid-cols-[1fr_1fr_80px_80px_100px] gap-4 px-4 py-2.5 border-b border-border/30 bg-blue-50/30 items-center">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-ring/20 focus:border-ring outline-none transition-all"
                />
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="bg-white border border-border/50 rounded-lg px-3 py-1.5 text-sm  focus:ring-2 focus:ring-ring/20 focus:border-ring outline-none transition-all"
                />
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="bg-white border border-border/50 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-ring/20 focus:border-ring outline-none transition-all"
                />
                <div />
                <div className="flex items-center justify-end gap-1">
                  <Form method="post" className="inline">
                    <input type="hidden" name="intent" value="update" />
                    <input type="hidden" name="id" value={cat.id} />
                    <input type="hidden" name="name" value={name} />
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="sortOrder" value={sortOrder} />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Save"
                    >
                      {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    </button>
                  </Form>
                  <button
                    onClick={resetForm}
                    className="p-1.5  hover:bg-muted rounded-lg transition-colors"
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              /* ── Display row ── */
              <div className="grid grid-cols-[1fr_1fr_80px_80px_100px] gap-4 px-4 py-3 border-b border-border/30 hover:bg-muted/20 transition-colors items-center group">
                <span className="text-sm font-medium truncate">{cat.name}</span>
                <span className="text-sm  truncate">{cat.slug}</span>
                <span className="text-sm  text-center">{cat.sort_order}</span>
                <span className="text-sm  text-center">
                  {cat._count?.albums ?? 0}
                </span>
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(cat)}
                    className="p-1.5  hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={15} />
                  </button>

                  {/* Hidden delete form */}
                  <Form method="post" id={`delete-form-${cat.id}`} className="hidden">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={cat.id} />
                  </Form>

                  <button
                    onClick={() =>
                      setConfirmDialog({ isOpen: true, catId: cat.id, catName: cat.name })
                    }
                    disabled={(cat._count?.albums ?? 0) > 0}
                    className="p-1.5  hover:text-destructive hover:bg-destructive/5 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:"
                    title={
                      (cat._count?.albums ?? 0) > 0
                        ? "Cannot delete: has albums"
                        : "Delete"
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-xs ">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5  hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${n === currentPage
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5  hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
