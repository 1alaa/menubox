import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { RestaurantDoc } from "../../types";
import { isActivePlan } from "../../lib/utils";
import { 
  ArrowLeft, 
  ShieldCheck, 
  AlertCircle, 
  MessageCircle, 
  Calendar, 
  FileText,
  Check,
  Loader2,
  ExternalLink
} from "lucide-react";

const ManageRestaurantPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<RestaurantDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) return;
      const docRef = doc(db, "restaurants", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as RestaurantDoc;
        setRestaurant(data);
        setNote(data.billingNote || "");
      }
      setLoading(false);
    };

    fetchRestaurant();
  }, [id]);

  const handleAction = async (action: string) => {
    if (!id || !restaurant) return;
    setUpdating(true);

    try {
      const now = new Date();
      let updates: any = {};

      switch (action) {
        case "activate_1":
          updates = {
            planStatus: "active",
            subscriptionEndsAt: Timestamp.fromDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)),
            isActive: true
          };
          break;
        case "activate_3":
          updates = {
            planStatus: "active",
            subscriptionEndsAt: Timestamp.fromDate(new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)),
            isActive: true
          };
          break;
        case "extend_trial":
          updates = {
            planStatus: "trial",
            trialEndsAt: Timestamp.fromDate(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)),
            isActive: true
          };
          break;
        case "mark_past_due":
          updates = { planStatus: "past_due" };
          break;
        case "disable":
          updates = { planStatus: "disabled", isActive: false };
          break;
        case "enable":
          updates = { isActive: true };
          break;
        case "save_note":
          updates = { billingNote: note };
          break;
      }

      await updateDoc(doc(db, "restaurants", id), updates);
      // Refresh local state
      setRestaurant({ ...restaurant, ...updates });
    } catch (err) {
      console.error(err);
      alert("Failed to update restaurant");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Loader2 className="animate-spin text-emerald-600" /></div>;
  if (!restaurant) return <div className="p-8">Restaurant not found</div>;

  const active = isActivePlan(restaurant);

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <nav className="bg-white border-b border-stone-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button onClick={() => navigate("/sa")} className="flex items-center gap-2 text-stone-500 hover:text-stone-900 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to List
          </button>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
              active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {active ? "Active" : "Inactive"}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight">{restaurant.name}</h1>
            <p className="text-stone-500 font-medium">Slug: {restaurant.slug} • ID: {id}</p>
          </div>
          <Link to={`/r/${restaurant.slug}`} target="_blank" className="flex items-center gap-2 text-emerald-600 font-bold hover:underline">
            Open Menu <ExternalLink className="w-4 h-4" />
          </Link>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Billing Actions */}
          <section className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" /> Billing Actions
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => handleAction("activate_1")}
                disabled={updating}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                Activate 1 Month
              </button>
              <button 
                onClick={() => handleAction("activate_3")}
                disabled={updating}
                className="w-full py-3 bg-emerald-900 text-white rounded-xl font-bold hover:bg-emerald-950 transition-all disabled:opacity-50"
              >
                Activate 3 Months
              </button>
              <button 
                onClick={() => handleAction("extend_trial")}
                disabled={updating}
                className="w-full py-3 bg-stone-100 text-stone-700 rounded-xl font-bold hover:bg-stone-200 transition-all disabled:opacity-50"
              >
                Extend Trial 14 Days
              </button>
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-stone-100">
                <button 
                  onClick={() => handleAction("mark_past_due")}
                  disabled={updating}
                  className="py-3 bg-orange-50 text-orange-700 rounded-xl font-bold hover:bg-orange-100 transition-all disabled:opacity-50"
                >
                  Past Due
                </button>
                <button 
                  onClick={() => handleAction(restaurant.isActive ? "disable" : "enable")}
                  disabled={updating}
                  className={`py-3 rounded-xl font-bold transition-all disabled:opacity-50 ${
                    restaurant.isActive ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {restaurant.isActive ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          </section>

          {/* Info & Notes */}
          <div className="space-y-8">
            <section className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" /> Billing Notes
              </h3>
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add internal notes about billing, payments, or contact history..."
                className="w-full h-32 p-4 bg-stone-50 border border-stone-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
              />
              <button 
                onClick={() => handleAction("save_note")}
                disabled={updating}
                className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Note
              </button>
            </section>

            <section className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" /> Contact Owner
              </h3>
              <div className="space-y-4">
                {restaurant.whatsappPhoneE164 ? (
                  <button 
                    onClick={() => window.open(`https://wa.me/${restaurant.whatsappPhoneE164}`, "_blank")}
                    className="w-full py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold hover:bg-emerald-200 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" /> WhatsApp Owner
                  </button>
                ) : (
                  <p className="text-sm text-stone-400 italic">No WhatsApp number provided</p>
                )}
                <p className="text-xs text-stone-500">Phone: {restaurant.phone || "N/A"}</p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManageRestaurantPage;
