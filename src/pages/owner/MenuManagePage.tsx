import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../../lib/firebase";
import { resolveOwnerRestaurantId } from "../../lib/restaurantLink";
import ImageDropzone from "../../components/ImageDropzone";
import { uploadRestaurantImage } from "../../lib/storageUpload";
import { Loader2 } from "lucide-react";

type CategoryDoc = {
  id: string;
  nameEn: string;
  nameAr?: string;
  order: number;
  coverImageUrl?: string;
};

type ItemDoc = {
  id: string;
  categoryId: string;
  nameEn: string;
  nameAr?: string;
  descEn?: string;
  descAr?: string;
  price: number;
  currency: string;
  available: boolean;
  order: number;
  imageUrl?: string;
};

type RestaurantDocLite = {
  id: string;
  name: string;
  slug: string;
};

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function toNumberSafe(v: string, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function nextOrder(list: { order: number }[]) {
  if (!list.length) return 1;
  return Math.max(...list.map((x) => x.order ?? 0)) + 1;
}

export default function MenuManagePage() {
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantDocLite | null>(null);
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [items, setItems] = useState<ItemDoc[]>([]);
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Modals
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDoc | null>(null);
  const [editingItem, setEditingItem] = useState<ItemDoc | null>(null);

  // Category form
  const [catNameEn, setCatNameEn] = useState("");
  const [catNameAr, setCatNameAr] = useState("");
  const [catCover, setCatCover] = useState("");
  const [catUploading, setCatUploading] = useState(false);

  // Item form
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemNameEn, setItemNameEn] = useState("");
  const [itemNameAr, setItemNameAr] = useState("");
  const [itemDescEn, setItemDescEn] = useState("");
  const [itemDescAr, setItemDescAr] = useState("");
  const [itemPrice, setItemPrice] = useState("0");
  const [itemCurrency, setItemCurrency] = useState("USD");
  const [itemAvailable, setItemAvailable] = useState(true);
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [itemUploading, setItemUploading] = useState(false);

  const refreshAll = async (rid: string) => {
    const rSnap = await getDoc(doc(db, "restaurants", rid));
    if (rSnap.exists()) {
      setRestaurant({ id: rSnap.id, ...(rSnap.data() as any) });
    }

    const catSnap = await getDocs(
      query(collection(db, `restaurants/${rid}/categories`), orderBy("order", "asc"))
    );
    setCategories(catSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));

    const itemSnap = await getDocs(
      query(collection(db, `restaurants/${rid}/items`), orderBy("order", "asc"))
    );
    setItems(itemSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const rid = await resolveOwnerRestaurantId();
        if (!rid) {
          setRestaurantId(null);
          setLoading(false);
          return;
        }
        setRestaurantId(rid);
        await refreshAll(rid);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load menu.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, ItemDoc[]>();
    for (const it of items) {
      const list = map.get(it.categoryId) || [];
      list.push(it);
      map.set(it.categoryId, list);
    }
    return map;
  }, [items]);

  // ----- Category helpers -----
  const openAddCategory = () => {
    setEditingCategory(null);
    setCatNameEn("");
    setCatNameAr("");
    setCatCover("");
    setCatModalOpen(true);
  };

  const openEditCategory = (cat: CategoryDoc) => {
    setEditingCategory(cat);
    setCatNameEn(cat.nameEn || "");
    setCatNameAr(cat.nameAr || "");
    setCatCover(cat.coverImageUrl || "");
    setCatModalOpen(true);
  };

  const saveCategory = async () => {
    if (!restaurantId) return;
    setError("");

    const nameEn = catNameEn.trim();
    if (!nameEn) {
      setError("Category name (English) is required.");
      return;
    }

    try {
      setSaving(true);
      const colRef = collection(db, `restaurants/${restaurantId}/categories`);

      if (editingCategory) {
        await updateDoc(doc(colRef, editingCategory.id), {
          nameEn,
          nameAr: catNameAr.trim(),
          coverImageUrl: catCover.trim(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(colRef, {
          nameEn,
          nameAr: catNameAr.trim(),
          coverImageUrl: catCover.trim(),
          order: nextOrder(categories),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setCatModalOpen(false);
      await refreshAll(restaurantId);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (cat: CategoryDoc) => {
    if (!restaurantId) return;
    setError("");

    const catItems = itemsByCategory.get(cat.id) || [];
    if (catItems.length > 0) {
      setError("Delete items inside this category first.");
      return;
    }

    try {
      setSaving(true);
      await deleteDoc(doc(db, `restaurants/${restaurantId}/categories/${cat.id}`));
      await refreshAll(restaurantId);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to delete category.");
    } finally {
      setSaving(false);
    }
  };

  const moveCategory = async (catId: string, dir: "up" | "down") => {
    if (!restaurantId) return;
    const index = categories.findIndex((c) => c.id === catId);
    if (index < 0) return;
    const swapIndex = dir === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= categories.length) return;

    const a = categories[index];
    const b = categories[swapIndex];

    try {
      setSaving(true);
      await updateDoc(doc(db, `restaurants/${restaurantId}/categories/${a.id}`), {
        order: b.order,
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, `restaurants/${restaurantId}/categories/${b.id}`), {
        order: a.order,
        updatedAt: serverTimestamp(),
      });
      await refreshAll(restaurantId);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to reorder categories.");
    } finally {
      setSaving(false);
    }
  };

  // ----- Item helpers -----
  const openAddItem = (defaultCategoryId?: string) => {
    setEditingItem(null);
    setItemCategoryId(defaultCategoryId || categories[0]?.id || "");
    setItemNameEn("");
    setItemNameAr("");
    setItemDescEn("");
    setItemDescAr("");
    setItemPrice("0");
    setItemCurrency("USD");
    setItemAvailable(true);
    setItemImageUrl("");
    setItemModalOpen(true);
  };

  const openEditItem = (it: ItemDoc) => {
    setEditingItem(it);
    setItemCategoryId(it.categoryId);
    setItemNameEn(it.nameEn || "");
    setItemNameAr(it.nameAr || "");
    setItemDescEn(it.descEn || "");
    setItemDescAr(it.descAr || "");
    setItemPrice(String(it.price ?? 0));
    setItemCurrency(it.currency || "USD");
    setItemAvailable(Boolean(it.available));
    setItemImageUrl(it.imageUrl || "");
    setItemModalOpen(true);
  };

  const saveItem = async () => {
    if (!restaurantId) return;
    setError("");

    const nameEn = itemNameEn.trim();
    if (!nameEn) return setError("Item name (English) is required.");
    if (!itemCategoryId) return setError("Select a category for the item.");

    const price = toNumberSafe(itemPrice, 0);
    if (price < 0) return setError("Price must be 0 or more.");

    try {
      setSaving(true);
      const colRef = collection(db, `restaurants/${restaurantId}/items`);

      if (editingItem) {
        await updateDoc(doc(colRef, editingItem.id), {
          categoryId: itemCategoryId,
          nameEn,
          nameAr: itemNameAr.trim(),
          descEn: itemDescEn.trim(),
          descAr: itemDescAr.trim(),
          price,
          currency: (itemCurrency.trim() || "USD").toUpperCase(),
          available: itemAvailable,
          imageUrl: itemImageUrl.trim(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const catItems = itemsByCategory.get(itemCategoryId) || [];
        await addDoc(colRef, {
          categoryId: itemCategoryId,
          nameEn,
          nameAr: itemNameAr.trim(),
          descEn: itemDescEn.trim(),
          descAr: itemDescAr.trim(),
          price,
          currency: (itemCurrency.trim() || "USD").toUpperCase(),
          available: itemAvailable,
          imageUrl: itemImageUrl.trim(),
          order: nextOrder(catItems),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setItemModalOpen(false);
      await refreshAll(restaurantId);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to save item.");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (it: ItemDoc) => {
    if (!restaurantId) return;
    setError("");
    try {
      setSaving(true);
      await deleteDoc(doc(db, `restaurants/${restaurantId}/items/${it.id}`));
      await refreshAll(restaurantId);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to delete item.");
    } finally {
      setSaving(false);
    }
  };

  const moveItem = async (it: ItemDoc, dir: "up" | "down") => {
    if (!restaurantId) return;
    const list = (itemsByCategory.get(it.categoryId) || []).slice().sort((a, b) => a.order - b.order);
    const index = list.findIndex((x) => x.id === it.id);
    if (index < 0) return;
    const swapIndex = dir === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= list.length) return;

    const a = list[index];
    const b = list[swapIndex];

    try {
      setSaving(true);
      await updateDoc(doc(db, `restaurants/${restaurantId}/items/${a.id}`), {
        order: b.order,
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, `restaurants/${restaurantId}/items/${b.id}`), {
        order: a.order,
        updatedAt: serverTimestamp(),
      });
      await refreshAll(restaurantId);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to reorder items.");
    } finally {
      setSaving(false);
    }
  };

  // ----- UI -----
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!restaurantId) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-6 text-center">
          <h1 className="text-xl font-black">No restaurant linked</h1>
          <p className="text-stone-500 mt-2 text-sm">
            Your account is not linked to a restaurant yet. Create one first.
          </p>
          <Link
            to="/admin/restaurant"
            className="inline-flex mt-5 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700"
          >
            Create Restaurant
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">Menu Management</h1>
            <p className="text-stone-500 text-sm mt-1">Add, edit, delete, and reorder categories and items.</p>
            {restaurant?.slug && (
              <a
                href={`/r/${restaurant.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex mt-3 text-sm font-bold text-emerald-700 hover:underline"
              >
                View Menu →
              </a>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={openAddCategory}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-white border border-stone-200 font-bold text-sm hover:bg-stone-50 disabled:opacity-60"
            >
              + Add Category
            </button>
            <button
              onClick={() => openAddItem()}
              disabled={saving || categories.length === 0}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              + Add Item
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 font-semibold">
            {error}
          </div>
        )}

        <div className="mt-8 grid md:grid-cols-2 gap-4">
          {categories.map((cat) => {
            const catItems = (itemsByCategory.get(cat.id) || []).slice().sort((a, b) => a.order - b.order);
            return (
              <div key={cat.id} className="bg-white border border-stone-200 rounded-3xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-lg font-black truncate">{cat.nameEn}</div>
                    <div className="text-xs text-stone-400 mt-1">{catItems.length} item(s)</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => moveCategory(cat.id, "up")}
                      disabled={saving}
                      className="px-3 py-2 rounded-xl bg-stone-100 font-bold text-xs hover:bg-stone-200 disabled:opacity-60"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveCategory(cat.id, "down")}
                      disabled={saving}
                      className="px-3 py-2 rounded-xl bg-stone-100 font-bold text-xs hover:bg-stone-200 disabled:opacity-60"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => openEditCategory(cat)}
                      disabled={saving}
                      className="px-3 py-2 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 disabled:opacity-60"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCategory(cat)}
                      disabled={saving}
                      className="px-3 py-2 rounded-xl bg-red-50 text-red-700 font-bold text-xs hover:bg-red-100 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex justify-between">
                  <button
                    onClick={() => openAddItem(cat.id)}
                    disabled={saving}
                    className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs hover:bg-emerald-100 disabled:opacity-60"
                  >
                    + Add item to this category
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {catItems.map((it) => (
                    <div
                      key={it.id}
                      className={cn(
                        "p-3 rounded-2xl border bg-stone-50 flex items-start justify-between gap-3",
                        it.available ? "border-stone-100" : "border-red-200"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="font-black truncate">{it.nameEn}</div>
                        {it.descEn && <div className="text-xs text-stone-500 mt-1 line-clamp-2">{it.descEn}</div>}
                        {!it.available && (
                          <div className="text-[10px] font-black text-red-600 mt-2 uppercase">Out of stock</div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-emerald-700">
                          {it.price} <span className="text-[10px] opacity-60">{it.currency}</span>
                        </div>
                        <div className="flex gap-2 justify-end mt-2">
                          <button
                            onClick={() => moveItem(it, "up")}
                            disabled={saving}
                            className="px-2 py-1.5 rounded-xl bg-white border border-stone-200 font-bold text-xs hover:bg-stone-50 disabled:opacity-60"
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveItem(it, "down")}
                            disabled={saving}
                            className="px-2 py-1.5 rounded-xl bg-white border border-stone-200 font-bold text-xs hover:bg-stone-50 disabled:opacity-60"
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => openEditItem(it)}
                            disabled={saving}
                            className="px-3 py-1.5 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 disabled:opacity-60"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteItem(it)}
                            disabled={saving}
                            className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 font-bold text-xs hover:bg-red-100 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {catItems.length === 0 && (
                    <div className="text-sm text-stone-400 py-6 text-center">No items in this category yet.</div>
                  )}
                </div>
              </div>
            );
          })}

          {categories.length === 0 && (
            <div className="md:col-span-2 bg-white border border-stone-200 rounded-3xl p-10 text-center text-stone-500">
              No categories yet. Click <b>Add Category</b> to start.
            </div>
          )}
        </div>
      </div>

      {/* Category Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xl font-black">{editingCategory ? "Edit Category" : "Add Category"}</div>
                <div className="text-sm text-stone-500 mt-1">English is required.</div>
              </div>
              <button
                onClick={() => setCatModalOpen(false)}
                className="px-3 py-2 rounded-xl bg-stone-100 font-bold text-sm hover:bg-stone-200"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-500 uppercase">Name (English)</label>
                <input
                  value={catNameEn}
                  onChange={(e) => setCatNameEn(e.target.value)}
                  className="mt-1 w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Drinks"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-500 uppercase">Name (Arabic) (optional)</label>
                <input
                  value={catNameAr}
                  onChange={(e) => setCatNameAr(e.target.value)}
                  className="mt-1 w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="مشروبات"
                />
              </div>

              <ImageDropzone
                label="Category Cover Image"
                valueUrl={catCover}
                helperText="PNG/JPG • max 3MB"
                onFileSelected={async (file) => {
                  if (!restaurantId) return;
                  try {
                    setSaving(true);
                    setCatUploading(true);
                    const url = await uploadRestaurantImage({ restaurantId, folder: "categories", file });
                    setCatCover(url);
                  } catch (e: any) {
                    setError(e?.message || "Upload failed");
                  } finally {
                    setCatUploading(false);
                    setSaving(false);
                  }
                }}
              />
              {catUploading && <div className="text-sm text-stone-500">Uploading...</div>}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setCatModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white border border-stone-200 font-bold hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={saveCategory}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {itemModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xl font-black">{editingItem ? "Edit Item" : "Add Item"}</div>
                <div className="text-sm text-stone-500 mt-1">English name and category are required.</div>
              </div>
              <button
                onClick={() => setItemModalOpen(false)}
                className="px-3 py-2 rounded-xl bg-stone-100 font-bold text-sm hover:bg-stone-200"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-stone-500 uppercase">Category</label>
                <select
                  value={itemCategoryId}
                  onChange={(e) => setItemCategoryId(e.target.value)}
                  className="mt-1 w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-500 uppercase">Name (English)</label>
                <input
                  value={itemNameEn}
                  onChange={(e) => setItemNameEn(e.target.value)}
                  className="mt-1 w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Cappuccino"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-500 uppercase">Name (Arabic) (optional)</label>
                <input
                  value={itemNameAr}
                  onChange={(e) => setItemNameAr(e.target.value)}
                  className="mt-1 w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="كابتشينو"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-500 uppercase">Description (English) (optional)</label>
                <input
                  value={itemDescEn}
                  onChange={(e) => setItemDescEn(e.target.value)}
                  className="mt-1 w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Espresso with steamed milk"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-500 uppercase">Description (Arabic) (optional)</label>
                <input
                  value={itemDescAr}
                  onChange={(e) => setItemDescAr(e.target.value)}
                  className="mt-1 w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="إسبريسو مع حليب"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-500 uppercase">Price</label>
                <input
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="mt-1 w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="3"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-500 uppercase">Currency</label>
                <input
                  value={itemCurrency}
                  onChange={(e) => setItemCurrency(e.target.value)}
                  className="mt-1 w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="USD"
                />
              </div>

              <div className="md:col-span-2">
                <ImageDropzone
                  label="Item Image"
                  valueUrl={itemImageUrl}
                  helperText="PNG/JPG • max 3MB"
                  onFileSelected={async (file) => {
                    if (!restaurantId) return;
                    try {
                      setSaving(true);
                      setItemUploading(true);
                      const url = await uploadRestaurantImage({ restaurantId, folder: "items", file });
                      setItemImageUrl(url);
                    } catch (e: any) {
                      setError(e?.message || "Upload failed");
                    } finally {
                      setItemUploading(false);
                      setSaving(false);
                    }
                  }}
                />
                {itemUploading && <div className="text-sm text-stone-500 mt-2">Uploading...</div>}
              </div>

              <div className="md:col-span-2 flex items-center justify-between p-4 rounded-2xl border border-stone-200 bg-stone-50">
                <div>
                  <div className="font-black">Availability</div>
                  <div className="text-sm text-stone-500">If disabled, the item shows as out of stock.</div>
                </div>
                <button
                  onClick={() => setItemAvailable((v) => !v)}
                  className={cn(
                    "px-4 py-2 rounded-xl font-black text-sm transition",
                    itemAvailable ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-red-600 text-white hover:bg-red-700"
                  )}
                >
                  {itemAvailable ? "Available" : "Out of stock"}
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setItemModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white border border-stone-200 font-bold hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={saveItem}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
