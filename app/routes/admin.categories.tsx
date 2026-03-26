import { useState } from "react";
import { Form, useLoaderData, useActionData, useNavigation } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, X, Check, Loader2, AlertCircle, Tag } from "lucide-react";
import { getCategories, createCategory, updateCategory, deleteCategory } from "~/utils/supabase.server";

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
    if (e.code === 'P2002') {
      return { error: "A category with this name or slug already exists." };
    }
    return { error: "An unexpected error occurred. Please try again." };
  }

  return null;
}

export default function CategoriesPage() {
  const { categories } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting" || navigation.state === "loading";

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

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
    setSlug(val.toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "")
    );
  };

  return (
    <div className="max-w-8xl mx-auto p-4 md:p-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="space-y-1">
          <h1 className="text-4xl font-light   flex items-center gap-3">
            Portfolio <span className="font-semibold ">Categories</span>
          </h1>
          <p className=" font-light text-base max-w-md leading-relaxed">
            Organize your albums and photos into distinct gallery sections.
          </p>
        </div>

        <button
          onClick={() => { resetForm(); setIsAdding(true); }}
          disabled={isAdding}
          className="group relative flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-full text-sm font-medium transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50 overflow-hidden shadow-xl shadow-foreground/10"
        >
          <div className="absolute inset-0 bg-accent translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none opacity-20" />
          <Plus size={18} className="transition-transform group-hover:rotate-90 duration-300" />
          <span>Create New Category</span>
        </button>
      </div>

      {actionData?.error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 p-4 bg-destructive/5 border border-destructive/20 rounded-2xl flex items-start gap-3  text-sm"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold mb-0.5">Operation failed</p>
            <p className="opacity-90">{actionData.error}</p>
          </div>
        </motion.div>
      )}

      {/* Categories Grid/Table Area */}
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-accent/5 border border-accent/20 rounded-2xl p-6 shadow-sm ring-1 ring-accent/5"
            >
              <div className="flex flex-col md:flex-row gap-6 mb-6">
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-semibold uppercase   ml-1">Name</label>
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => autoSlug(e.target.value)}
                    placeholder="e.g. Portrait Photography"
                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all placeholder:/50"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-semibold uppercase   ml-1">Url Slug</label>
                  <div className="relative">
                    <Tag size={14} className="absolute left-4 top-1/2 -translate-y-1/2 " />
                    <input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="portrait-photography"
                      className="w-full bg-background border border-border/50 rounded-xl pl-10 pr-4 py-3 text-sm  focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="w-full md:w-32 space-y-2">
                  <label className="text-xs font-semibold uppercase   ml-1 text-center block">Sort Index</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm text-center focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={resetForm}
                  className="px-5 py-2.5 text-sm font-medium  hover:bg-muted rounded-xl transition-colors"
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
                    className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} />}
                    Create Category
                  </button>
                </Form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-4">
          {categories.length === 0 && !isAdding && (
            <div className="py-24 text-center border-2 border-dashed border-border/50 rounded-3xl space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto /50">
                <Tag size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-medium ">No categories yet</p>
                <p className="text-sm ">Start by creating your first organizational category.</p>
              </div>
            </div>
          )}

          <AnimatePresence>
            {categories.map((cat, index) => (
              <motion.div
                layout
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`group bg-card border border-border/40 rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-foreground/5 hover:border-border/80 ${editingId === cat.id ? 'ring-2 ring-accent border-transparent' : ''}`}
              >
                {editingId === cat.id ? (
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6 mb-6">
                      <div className="flex-1 space-y-2">
                        <label className="text-xs font-semibold uppercase   ml-1">Name</label>
                        <input
                          autoFocus
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="text-xs font-semibold uppercase   ml-1 text-center block">Url Slug</label>
                        <input
                          value={slug}
                          onChange={(e) => setSlug(e.target.value)}
                          className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm  focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                        />
                      </div>
                      <div className="w-full md:w-32 space-y-2">
                        <label className="text-xs font-semibold uppercase   ml-1 text-center block">Sort Index</label>
                        <input
                          type="number"
                          value={sortOrder}
                          onChange={(e) => setSortOrder(e.target.value)}
                          className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 text-sm text-center focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 border-t border-border/50 pt-6">
                      <button
                        onClick={resetForm}
                        className="px-5 py-2.5 text-sm font-medium  hover:bg-muted rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <Form method="post" className="inline">
                        <input type="hidden" name="intent" value="update" />
                        <input type="hidden" name="id" value={cat.id} />
                        <input type="hidden" name="name" value={name} />
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="sortOrder" value={sortOrder} />
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
                        >
                          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} />}
                          Save Changes
                        </button>
                      </Form>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 md:p-6">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-accent/5 rounded-2xl flex items-center justify-center  ring-1 ring-accent/10">
                        <Tag size={20} strokeWidth={1.5} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-medium  ">{cat.name}</h3>
                          <span className="hidden sm:inline-flex px-2 py-0.5 bg-muted  text-[10px] font-bold uppercase  rounded-full ring-1 ring-border/50">
                            {cat.slug}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-light  uppercase ">
                          <span className="flex items-center gap-1.5 bg-foreground/5 px-2 py-0.5 rounded-full ring-1 ring-foreground/5">
                            Index: <span className="font-bold ">{cat.sort_order}</span>
                          </span>
                          <span className="flex items-center gap-1.5 bg-foreground/5 px-2 py-0.5 rounded-full ring-1 ring-foreground/5">
                            Albums: <span className="font-bold ">{cat._count?.albums ?? 0}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-border/50">
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-3  hover: hover:bg-accent/5 rounded-2xl transition-all group/btn"
                        title="Edit Category"
                      >
                        <Edit2 size={20} strokeWidth={1.5} className="group-hover/btn:scale-110 transition-transform" />
                      </button>
                      <Form
                        method="post"
                        onSubmit={(e) => !confirm(`Delete "${cat.name}"? This action cannot be undone and will fail if the category contains albums.`) && e.preventDefault()}
                        className="inline"
                      >
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={cat.id} />
                        <button
                          type="submit"
                          disabled={cat._count?.albums > 0}
                          className="p-3  hover: hover:bg-destructive/5 rounded-2xl transition-all group/btn disabled:opacity-30 disabled:hover:bg-transparent"
                          title={cat._count?.albums > 0 ? "Cannot delete category with albums" : "Delete Category"}
                        >
                          <Trash2 size={20} strokeWidth={1.5} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                      </Form>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
