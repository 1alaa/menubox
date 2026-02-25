import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { RestaurantDoc } from "../../types";
import { isActivePlan } from "../../lib/utils";
import {
  ExternalLink,
  LogOut,
  Pencil,
  Search,
  Settings,
  ShieldCheck,
  Truck,
  Loader2,
} from "lucide-react";

export default function SuperAdminDashboard() {
  const [restaurants, setRestaurants] = useState<RestaurantDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "restaurants"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setRestaurants(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as RestaurantDoc)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/admin/login");
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return restaurants;
    return restaurants.filter((r) =>
      (r.name || "").toLowerCase().includes(s) || (r.slug || "").toLowerCase().includes(s)
    );
  }, [restaurants, search]);

  const stats = useMemo(() => {
    const total = restaurants.length;
    const active = restaurants.filter((r) => isActivePlan(r as any)).length;
    const trial = restaurants.filter((r) => (r as any).planStatus === "trial").length;
    const expired = Math.max(0, total - active);
    const deliveryOn = restaurants.filter((r) => (r as any).deliveryEnabled !== false).length;
    return { total, active, trial, expired, deliveryOn };
  }, [restaurants]);

  const toggleDelivery = async (r: RestaurantDoc) => {
    try {
      setBusyId(r.id);
      const next = !(r as any).deliveryEnabled;
      await updateDoc(doc(db, "restaurants", r.id), { deliveryEnabled: next } as any);
      setRestaurants((prev) => prev.map((x) => (x.id === r.id ? ({ ...x, deliveryEnabled: next } as any) : x)));
    } catch (e) {
      console.error("Failed to toggle delivery", e);
      alert("Permission error. Check Firestore rules for superadmin.");
    } finally {
      setBusyId(null);
    }
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
      <nav className="bg-white border-b border-stone-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-stone-900 p-2 rounded-lg text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Super Admin</h1>
          </div>
          <button onClick={handleLogout} className="p-2 text-stone-500 hover:text-red-600 transition-colors" title="Logout">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
            <div className="text-xs font-black uppercase tracking-wider text-stone-500">Restaurants</div>
            <div className="mt-2 text-3xl font-black text-stone-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
            <div className="text-xs font-black uppercase tracking-wider text-stone-500">Active</div>
            <div className="mt-2 text-3xl font-black text-emerald-700">{stats.active}</div>
          </div>
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
            <div className="text-xs font-black uppercase tracking-wider text-stone-500">Trial</div>
            <div className="mt-2 text-3xl font-black text-stone-900">{stats.trial}</div>
          </div>
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
            <div className="text-xs font-black uppercase tracking-wider text-stone-500">Not Active</div>
            <div className="mt-2 text-3xl font-black text-red-700">{stats.expired}</div>
          </div>
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
            <div className="text-xs font-black uppercase tracking-wider text-stone-500">Delivery ON</div>
            <div className="mt-2 text-3xl font-black text-stone-900">{stats.deliveryOn}</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder="Search restaurants or slugs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-900 transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Restaurant</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Delivery</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((r) => {
                  const active = isActivePlan(r as any);
                  const deliveryOn = (r as any).deliveryEnabled !== false; // default ON
                  return (
                    <tr key={r.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-stone-900">{r.name}</div>
                        <div className="text-xs text-stone-400">/r/{r.slug}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                            active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {r.planStatus || (active ? "active" : "past_due")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleDelivery(r)}
                          disabled={busyId === r.id}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-black transition ${
                            deliveryOn
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                              : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                          } disabled:opacity-60`}
                        >
                          <Truck className="w-4 h-4" />
                          {deliveryOn ? "Delivery ON" : "Delivery OFF"}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            to={`/r/${r.slug}`}
                            target="_blank"
                            className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
                            title="Open customer menu"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>

                          <Link
                            to={`/sa/restaurants/${r.id}/menu`}
                            className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
                            title="Edit menu"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>

                          <Link
                            to={`/sa/restaurants/${r.id}`}
                            className="p-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-900 hover:text-white transition-all"
                            title="Restaurant settings"
                          >
                            <Settings className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="p-10 text-center text-stone-400">No restaurants found.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
