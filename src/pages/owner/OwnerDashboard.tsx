import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { RestaurantDoc } from "../../types";
import { isActivePlan, getPlanStatusLabel, getDaysRemaining } from "../../lib/utils";
import { 
  LayoutDashboard, 
  ExternalLink, 
  Palette, 
  QrCode,
  ListChecks,
  MessageCircle, 
  LogOut, 
  PlusCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  Loader2
} from "lucide-react";

const OwnerDashboard: React.FC = () => {
  const { userDoc } = useAuth();
  const [restaurant, setRestaurant] = useState<RestaurantDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (userDoc?.restaurantId) {
        const docRef = doc(db, "restaurants", userDoc.restaurantId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRestaurant({ id: docSnap.id, ...docSnap.data() } as RestaurantDoc);
        }
      }
      setLoading(false);
    };

    fetchRestaurant();
  }, [userDoc]);

  const handleLogout = () => {
    auth.signOut();
    navigate("/admin/login");
  };

  const handleContactSupport = () => {
    if (!restaurant) return;
    const supportPhone = import.meta.env.VITE_MENUBOX_SUPPORT_PHONE_E164;
    const message = `Hello Menubox Support, I am the owner of ${restaurant.name} (slug: ${restaurant.slug}). My current plan status is ${restaurant.planStatus}. I need assistance with my account.`;
    window.open(`https://wa.me/${supportPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
    </div>;
  }

  if (!userDoc?.restaurantId) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-white p-10 rounded-3xl border border-stone-200 shadow-sm">
          <PlusCircle className="w-16 h-16 text-emerald-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Welcome to Menubox!</h2>
          <p className="text-stone-600 mb-8">You haven't linked a restaurant to your account yet. Let's get started.</p>
          <Link to="/admin/restaurant" className="inline-block w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all">
            Create Your Restaurant
          </Link>
        </div>
      </div>
    );
  }

  if (!restaurant) return null;

  const active = isActivePlan(restaurant);
  const statusLabel = getPlanStatusLabel(restaurant);
  const daysLeft = restaurant.planStatus === "trial" 
    ? getDaysRemaining(restaurant.trialEndsAt.toDate())
    : restaurant.subscriptionEndsAt ? getDaysRemaining(restaurant.subscriptionEndsAt.toDate()) : 0;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Sidebar/Nav */}
      <nav className="bg-white border-b border-stone-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <LayoutDashboard className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">Menubox Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleLogout} className="p-2 text-stone-500 hover:text-red-600 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-black tracking-tight">{restaurant.name}</h2>
                  <p className="text-stone-500 font-medium">slug: {restaurant.slug}</p>
                </div>
                <Link 
                  to={`/r/${restaurant.slug}`} 
                  target="_blank"
                  className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-semibold hover:bg-stone-200 transition-all"
                >
                  <ExternalLink className="w-4 h-4" /> View Menu
                </Link>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Link to="/admin/menu" className="flex items-center gap-4 p-6 bg-stone-50 border border-stone-200 rounded-2xl hover:border-emerald-500 transition-all group">
                  <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <ListChecks className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">Manage Menu</h3>
                    <p className="text-sm text-stone-500">Categories & Items</p>
                  </div>
                </Link>

                <Link to="/admin/branding" className="flex items-center gap-4 p-6 bg-stone-50 border border-stone-200 rounded-2xl hover:border-emerald-500 transition-all group">
                  <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Palette className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">Branding</h3>
                    <p className="text-sm text-stone-500">Logo & Theme</p>
                  </div>
                </Link>

                <Link to="/admin/qr" className="flex items-center gap-4 p-6 bg-stone-50 border border-stone-200 rounded-2xl hover:border-emerald-500 transition-all group">
                  <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">QR Code</h3>
                    <p className="text-sm text-stone-500">Download & Print</p>
                  </div>
                </Link>

                <button onClick={handleContactSupport} className="flex items-center gap-4 p-6 bg-stone-50 border border-stone-200 rounded-2xl hover:border-emerald-500 transition-all group text-left">
                  <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">Contact Support</h3>
                    <p className="text-sm text-stone-500">WhatsApp Menubox</p>
                  </div>
                </button>
              </div>
            </section>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-8">
            <section className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" /> Subscription
              </h3>
              
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-stone-500 uppercase tracking-wider font-bold mb-1">Status</p>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {active ? <ShieldCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {statusLabel}
                  </div>
                </div>

                {active && (
                  <div>
                    <p className="text-sm text-stone-500 uppercase tracking-wider font-bold mb-1">Time Remaining</p>
                    <p className="text-2xl font-black">{daysLeft} Days</p>
                  </div>
                )}

                {!active && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
                    Your plan has expired. Please contact support to renew your subscription.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};
export default OwnerDashboard;
