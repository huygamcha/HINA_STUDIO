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
    try {
      await deleteCategory(id);
      return { success: true };
    } catch (e) {
      return { error: "Cannot delete category that has albums." };
    }
  }

  return null;
}

export default function CategoriesPage() {
  const { categories } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

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
    <div className="p-8 max-w-4xl">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-normal mb-2">Categories</h1>
          <p className="text-muted-foreground font-normal text-sm">Manage portfolio categories and organization.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsAdding(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent/90 transition-all cursor-pointer"
        >
          <Plus size={18} /> Add Category
        </button>
      </div>

      {actionData?.error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3 text-destructive text-sm font-medium">
          <AlertCircle size={18} /> {actionData.error}
        </div>
      )}

      <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border/50">
              <th className="px-6 py-4 text-xs uppercase font-medium text-muted-foreground">Name</th>
              <th className="px-6 py-4 text-xs uppercase font-medium text-muted-foreground">Slug</th>
              <th className="px-6 py-4 text-xs uppercase font-medium text-muted-foreground w-20 text-center">Sort</th>
              <th className="px-6 py-4 text-xs uppercase font-medium text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {/* Inline Add Form */}
            <AnimatePresence>
              {isAdding && (
                <motion.tr 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-accent/5"
                >
                  <td className="px-6 py-4">
                    <input 
                      autoFocus
                      value={name} 
                      onChange={(e) => autoSlug(e.target.value)}
                      placeholder="Category Name" 
                      className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      value={slug} 
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="slug" 
                      className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm font-mono"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="number"
                      value={sortOrder} 
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-center"
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Form method="post" className="flex justify-end gap-2">
                      <input type="hidden" name="intent" value="create" />
                      <input type="hidden" name="name" value={name} />
                      <input type="hidden" name="slug" value={slug} />
                      <input type="hidden" name="sortOrder" value={sortOrder} />
                      <button 
                        type="submit" 
                        disabled={isSubmitting || !name || !slug}
                        className="p-1.5 text-green-500 hover:bg-green-500/10 rounded transition-colors"
                      >
                        <Check size={18} />
                      </button>
                      <button 
                        type="button" 
                        onClick={resetForm}
                        className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </Form>
                  </td>
                </motion.tr>
              )}
            </AnimatePresence>

            {categories.map((cat) => (
              <tr key={cat.id} className="group hover:bg-muted/30 transition-colors">
                {editingId === cat.id ? (
                  <>
                    <td className="px-6 py-4">
                      <input 
                        autoFocus
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        value={slug} 
                        onChange={(e) => setSlug(e.target.value)}
                        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm font-mono"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="number"
                        value={sortOrder} 
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-center"
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Form method="post" className="flex justify-end gap-2">
                        <input type="hidden" name="intent" value="update" />
                        <input type="hidden" name="id" value={cat.id} />
                        <input type="hidden" name="name" value={name} />
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="sortOrder" value={sortOrder} />
                        <button 
                          type="submit" 
                          disabled={isSubmitting}
                          className="p-1.5 text-green-500 hover:bg-green-500/10 rounded transition-colors"
                        >
                          <Check size={18} />
                        </button>
                        <button 
                          type="button" 
                          onClick={resetForm}
                          className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </Form>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 text-sm font-normal">{cat.name}</td>
                    <td className="px-6 py-4 text-xs font-mono text-muted-foreground">{cat.slug}</td>
                    <td className="px-6 py-4 text-sm font-normal text-center">{cat.sort_order}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => startEdit(cat)}
                          className="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/5 rounded transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <Form method="post" onSubmit={(e) => !confirm("Are you sure? This will fail if category has albums.") && e.preventDefault()}>
                          <input type="hidden" name="intent" value="delete" />
                          <input type="hidden" name="id" value={cat.id} />
                          <button 
                            type="submit"
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </Form>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
