import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, doc, updateDoc, Timestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { RestaurantDoc, RestaurantTheme } from "../../types";
import { Loader2, ArrowLeft, Store } from "lucide-react";

const CreateRestaurantPage: React.FC = () => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    // Auto-generate slug
    setSlug(val.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      // Check slug uniqueness
      const q = query(collection(db, "restaurants"), where("slug", "==", slug));
      const snap = await getDocs(q);
      if (!snap.empty) {
        throw new Error("This slug is already taken. Please choose another one.");
      }

      const defaultTheme: RestaurantTheme = {
        mode: "light",
        primary: "#10b981",
        secondary: "#059669",
        background: "#f9fafb",
      };

      const restaurantData: Omit<RestaurantDoc, "id"> = {
        name,
        slug,
        ownerUid: user.uid,
        phone,
        whatsappPhoneE164: whatsapp.replace(/\D/g, ""),
        isActive: true,
        planStatus: "trial",
        trialEndsAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        createdAt: Timestamp.now(),
        branding: {
          theme: defaultTheme,
        },
      };

      const docRef = await addDoc(collection(db, "restaurants"), restaurantData);
      
      // Update user doc
      await updateDoc(doc(db, "users", user.uid), {
        restaurantId: docRef.id,
      });

      navigate("/admin");
    } catch (err: any) {
      setError(err.message || "Failed to create restaurant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate("/admin")} className="flex items-center gap-2 text-stone-500 hover:text-stone-900 mb-8 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8 sm:p-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600">
              <Store className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Create Restaurant</h1>
              <p className="text-stone-500">Set up your digital menu profile</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-stone-700 mb-2">Restaurant Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={handleNameChange}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="e.g. The Green Bistro"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Slug (URL Path)</label>
                <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
                  <span className="text-stone-400 text-sm mr-1">/r/</span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                    className="flex-1 bg-transparent outline-none text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="+961 70 123 456"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-stone-700 mb-2">WhatsApp (Digits Only)</label>
                <input
                  type="text"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="96170123456"
                />
                <p className="text-xs text-stone-400 mt-1">Include country code, no + or spaces.</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create & Start 30-Day Trial"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateRestaurantPage;
