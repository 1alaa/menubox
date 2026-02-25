import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  Loader2,
  Pencil,
  X,
} from "lucide-react";

type CategoryDoc = {
  id: string;
  nameEn: string;
  nameAr?: string;
  order: number;
  active?: boolean;
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

export default function SuperAdminMenuManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [restaurantName, setRestaurantName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<CategoryDoc[]>([]);
  const [items, setItems] = useState<ItemDoc[]>([]);

  // UI
  const [activeCatId, setActiveCatId] = useState<string>("");

  // Category modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryDoc | null>(null);
  const [catForm, setCatForm] = useState({ nameEn: "", nameAr: "", coverImageUrl: "", active: true });

  // Item modal
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemDoc | null>(null);
  const [itemForm, setItemForm] = useState({
    categoryId: "",
    nameEn: "",
    nameAr: "",
    descEn: "",
    descAr: "",
    price: "",
    currency: "USD",
    available: true,
    imageUrl: "",
  });

  useEffect(() => {
    const run = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const rest = await getDoc(doc(db, "restaurants", id));
        if (rest.exists()) setRestaurantName((rest.data() as any)?.name || "Restaurant");

        const catSnap = await getDocs(
          query(collection(db, `restaurants/${id}/categories`), orderBy("order", "asc"))
        );
        const c = catSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as CategoryDoc[];
        setCats(c);
        setActiveCatId((prev) => prev || c?.[0]?.id || "");

        const itemSnap = await getDocs(
          query(collection(db, `restaurants/${id}/items`), orderBy("order", "asc"))
        );
        const it = itemSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ItemDoc[];
        setItems(it);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  const itemsByCat = useMemo(() => {
    const map: Record<string, ItemDoc[]> = {};
    for (const it of items) {
      if (!map[it.categoryId]) map[it.categoryId] = [];
      map[it.categoryId].push(it);
    }
    return map;
  }, [items]);

  const nextOrder = (arr: Array<{ order: number }>) => (arr.length ? Math.max(...arr.map((x) => Number(x.order) || 0)) + 1 : 1);

  const openNewCategory = () => {
    setEditingCat(null);
    setCatForm({ nameEn: "", nameAr: "", coverImageUrl: "", active: true });
    setCatModalOpen(true);
  };

  const openEditCategory = (c: CategoryDoc) => {
    setEditingCat(c);
    setCatForm({
      nameEn: c.nameEn || "",
      nameAr: c.nameAr || "",
      coverImageUrl: c.coverImageUrl || "",
      active: c.active !== false,
    });
    setCatModalOpen(true);
  };

  const saveCategory = async () => {
    if (!id) return;
    if (!catForm.nameEn.trim()) return;

    const payload = {
      nameEn: catForm.nameEn.trim(),
      nameAr: catForm.nameAr.trim() || "",
      coverImageUrl: catForm.coverImageUrl.trim() || "",
      active: !!catForm.active,
    };

    if (editingCat) {
      await updateDoc(doc(db, `restaurants/${id}/categories/${editingCat.id}`), payload as any);
      setCats((prev) => prev.map((x) => (x.id === editingCat.id ? { ...x, ...payload } as any : x)));
    } else {
      const order = nextOrder(cats);
      const ref = await addDoc(collection(db, `restaurants/${id}/categories`), { ...payload, order });
      setCats((prev) => [...prev, { id: ref.id, ...payload, order } as any]);
      setActiveCatId((prev) => prev || ref.id);
    }

    setCatModalOpen(false);
  };

  const deleteCategory = async (catId: string) => {
    if (!id) return;
    if (!confirm("Delete category? Items under it will stay but become hidden until moved.")) return;
    await deleteDoc(doc(db, `restaurants/${id}/categories/${catId}`));
    setCats((prev) => prev.filter((x) => x.id !== catId));
    if (activeCatId === catId) setActiveCatId((prev) => cats.find((c) => c.id !== prev)?.id || "");
  };

  const openNewItem = () => {
    setEditingItem(null);
    setItemForm({
      categoryId: activeCatId || cats?.[0]?.id || "",
      nameEn: "",
      nameAr: "",
      descEn: "",
      descAr: "",
      price: "",
      currency: "USD",
      available: true,
      imageUrl: "",
    });
    setItemModalOpen(true);
  };

  const openEditItem = (it: ItemDoc) => {
    setEditingItem(it);
    setItemForm({
      categoryId: it.categoryId,
      nameEn: it.nameEn || "",
      nameAr: it.nameAr || "",
      descEn: it.descEn || "",
      descAr: it.descAr || "",
      price: String(it.price ?? ""),
      currency: it.currency || "USD",
      available: it.available !== false,
      imageUrl: it.imageUrl || "",
    });
    setItemModalOpen(true);
  };

  const saveItem = async () => {
    if (!id) return;
    if (!itemForm.nameEn.trim()) return;
    if (!itemForm.categoryId) return;

    const payload = {
      categoryId: itemForm.categoryId,
      nameEn: itemForm.nameEn.trim(),
      nameAr: itemForm.nameAr.trim() || "",
      descEn: itemForm.descEn.trim() || "",
      descAr: itemForm.descAr.trim() || "",
      price: Number(itemForm.price || 0),
      currency: itemForm.currency || "USD",
      available: !!itemForm.available,
      imageUrl: itemForm.imageUrl.trim() || "",
    };

    if (editingItem) {
      await updateDoc(doc(db, `restaurants/${id}/items/${editingItem.id}`), payload as any);
      setItems((prev) => prev.map((x) => (x.id === editingItem.id ? ({ ...x, ...payload } as any) : x)));
    } else {
      const order = nextOrder(items.filter((x) => x.categoryId === itemForm.categoryId));
      const ref = await addDoc(collection(db, `restaurants/${id}/items`), { ...payload, order });
      setItems((prev) => [...prev, { id: ref.id, ...payload, order } as any]);
    }

    setItemModalOpen(false);
  };

  const deleteItem = async (itemId: string) => {
    if (!id) return;
    if (!confirm("Delete item?")) return;
    await deleteDoc(doc(db, `restaurants/${id}/items/${itemId}`));
    setItems((prev) => prev.filter((x) => x.id !== itemId));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-100"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="text-sm text-stone-500 font-bold">Super Admin</div>
              <div className="text-2xl font-black">Menu Editor — {restaurantName || "Restaurant"}</div>
            </div>
          </div>

          <Link
            to={`/sa/restaurants/${id}`}
            className="px-4 py-2 rounded-xl bg-white border border-stone-200 font-black hover:bg-stone-100"
          >
            Restaurant Settings
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">
          {/* Categories */}
          <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <div className="font-black">Categories</div>
              <button
                onClick={openNewCategory}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-900 text-white font-black text-sm"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            <div className="p-3 space-y-2">
              {cats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCatId(c.id)}
                  className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between gap-2 ${
                    activeCatId === c.id
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-white border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-black truncate">{c.nameEn}</div>
                    <div className="text-xs text-stone-500">{c.active === false ? "Hidden" : "Visible"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditCategory(c);
                      }}
                      className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200"
                      title="Edit"
                      role="button"
                    >
                      <Pencil className="w-4 h-4" />
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCategory(c.id);
                      }}
                      className="p-2 rounded-xl bg-red-50 hover:bg-red-100"
                      title="Delete"
                      role="button"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </span>
                  </div>
                </button>
              ))}

              {cats.length === 0 && (
                <div className="text-sm text-stone-500 p-4">No categories yet.</div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <div className="font-black">Items</div>
              <button
                onClick={openNewItem}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white font-black text-sm"
                disabled={!activeCatId}
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            <div className="p-4 space-y-3">
              {(itemsByCat[activeCatId] || []).map((it) => (
                <div key={it.id} className="p-4 rounded-2xl border border-stone-200 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-black truncate">{it.nameEn}</div>
                    <div className="text-xs text-stone-500 truncate">
                      {it.available === false ? "Out of stock" : "Available"} • {Number(it.price || 0).toFixed(2)} {it.currency}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditItem(it)}
                      className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteItem(it.id)}
                      className="p-2 rounded-xl bg-red-50 hover:bg-red-100"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}

              {(itemsByCat[activeCatId] || []).length === 0 && (
                <div className="text-sm text-stone-500">No items in this category.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCatModalOpen(false)} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-lg bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div className="font-black text-lg">{editingCat ? "Edit Category" : "New Category"}</div>
              <button onClick={() => setCatModalOpen(false)} className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input
                value={catForm.nameEn}
                onChange={(e) => setCatForm((p) => ({ ...p, nameEn: e.target.value }))}
                placeholder="Name (EN)"
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 outline-none"
              />
              <input
                value={catForm.nameAr}
                onChange={(e) => setCatForm((p) => ({ ...p, nameAr: e.target.value }))}
                placeholder="Name (AR)"
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 outline-none"
              />
              <input
                value={catForm.coverImageUrl}
                onChange={(e) => setCatForm((p) => ({ ...p, coverImageUrl: e.target.value }))}
                placeholder="Cover Image URL (optional)"
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 outline-none"
              />
              <label className="flex items-center gap-2 text-sm font-bold text-stone-700">
                <input
                  type="checkbox"
                  checked={catForm.active}
                  onChange={(e) => setCatForm((p) => ({ ...p, active: e.target.checked }))}
                />
                Visible
              </label>
            </div>
            <div className="p-5 border-t border-stone-100 flex justify-end">
              <button
                onClick={saveCategory}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 text-white font-black"
              >
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setItemModalOpen(false)} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-lg bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div className="font-black text-lg">{editingItem ? "Edit Item" : "New Item"}</div>
              <button onClick={() => setItemModalOpen(false)} className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <select
                value={itemForm.categoryId}
                onChange={(e) => setItemForm((p) => ({ ...p, categoryId: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 outline-none"
              >
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameEn}
                  </option>
                ))}
              </select>
              <input
                value={itemForm.nameEn}
                onChange={(e) => setItemForm((p) => ({ ...p, nameEn: e.target.value }))}
                placeholder="Name (EN)"
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 outline-none"
              />
              <input
                value={itemForm.nameAr}
                onChange={(e) => setItemForm((p) => ({ ...p, nameAr: e.target.value }))}
                placeholder="Name (AR)"
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 outline-none"
              />
              <input
                value={itemForm.price}
                onChange={(e) => setItemForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="Price"
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 outline-none"
              />
              <input
                value={itemForm.currency}
                onChange={(e) => setItemForm((p) => ({ ...p, currency: e.target.value }))}
                placeholder="Currency (e.g. USD)"
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 outline-none"
              />
              <input
                value={itemForm.imageUrl}
                onChange={(e) => setItemForm((p) => ({ ...p, imageUrl: e.target.value }))}
                placeholder="Image URL (optional)"
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 outline-none"
              />
              <textarea
                value={itemForm.descEn}
                onChange={(e) => setItemForm((p) => ({ ...p, descEn: e.target.value }))}
                placeholder="Description (EN)"
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 outline-none"
                rows={2}
              />
              <textarea
                value={itemForm.descAr}
                onChange={(e) => setItemForm((p) => ({ ...p, descAr: e.target.value }))}
                placeholder="Description (AR)"
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 outline-none"
                rows={2}
              />
              <label className="flex items-center gap-2 text-sm font-bold text-stone-700">
                <input
                  type="checkbox"
                  checked={itemForm.available}
                  onChange={(e) => setItemForm((p) => ({ ...p, available: e.target.checked }))}
                />
                Available
              </label>
            </div>
            <div className="p-5 border-t border-stone-100 flex justify-end">
              <button
                onClick={saveItem}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-black"
              >
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
