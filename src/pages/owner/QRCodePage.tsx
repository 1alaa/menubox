import React, { useEffect, useMemo, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { db } from "../../lib/firebase";
import { resolveOwnerRestaurantId } from "../../lib/restaurantLink";
import { Loader2 } from "lucide-react";

type RestaurantDocLite = {
  id: string;
  name: string;
  slug: string;
};

export default function QRCodePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [restaurant, setRestaurant] = useState<RestaurantDocLite | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const menuUrl = useMemo(() => {
    if (!restaurant?.slug) return "";
    // Use current origin (works on Netlify too)
    return `${window.location.origin}/r/${restaurant.slug}`;
  }, [restaurant?.slug]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const rid = await resolveOwnerRestaurantId();
        if (!rid) {
          setRestaurant(null);
          setLoading(false);
          return;
        }

        const snap = await getDoc(doc(db, "restaurants", rid));
        if (!snap.exists()) throw new Error("Restaurant not found");
        const r = { id: snap.id, ...(snap.data() as any) } as RestaurantDocLite;
        setRestaurant(r);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load QR code");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const draw = async () => {
      if (!menuUrl || !canvasRef.current) return;
      try {
        await QRCode.toCanvas(canvasRef.current, menuUrl, {
          width: 512,
          margin: 2,
          errorCorrectionLevel: "H",
        });
      } catch (e) {
        console.error(e);
      }
    };
    draw();
  }, [menuUrl]);

  const downloadPng = () => {
    if (!canvasRef.current || !restaurant) return;
    const url = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${restaurant.slug}-menu-qr.png`;
    a.click();
  };

  const copyLink = async () => {
    if (!menuUrl) return;
    try {
      await navigator.clipboard.writeText(menuUrl);
      alert("Menu link copied!");
    } catch {
      alert(menuUrl);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-6 text-center">
          <h1 className="text-xl font-black">No restaurant linked</h1>
          <p className="text-stone-500 mt-2 text-sm">Create a restaurant first.</p>
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
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-black">QR Code</h1>
          <p className="text-stone-500 mt-2">
            Print this QR code and place it on tables. Customers scan to open your menu.
          </p>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 font-semibold">
              {error}
            </div>
          )}

          <div className="mt-8 grid md:grid-cols-2 gap-8 items-start">
            <div className="bg-stone-50 border border-stone-200 rounded-3xl p-6 flex items-center justify-center">
              <div className="text-center">
                <canvas ref={canvasRef} className="mx-auto rounded-2xl bg-white p-3" />
                <div className="mt-4 font-black">{restaurant.name}</div>
                <div className="text-xs text-stone-500 break-all mt-1">{menuUrl}</div>
              </div>
            </div>

            <div>
              <div className="rounded-3xl border border-stone-200 bg-white p-6">
                <div className="text-sm font-black text-stone-700">Actions</div>
                <div className="mt-4 flex flex-col gap-3">
                  <button
                    onClick={downloadPng}
                    className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700"
                  >
                    Download PNG
                  </button>
                  <button
                    onClick={copyLink}
                    className="w-full py-3 rounded-2xl bg-stone-900 text-white font-black hover:bg-stone-800"
                  >
                    Copy Menu Link
                  </button>
                  <a
                    href={menuUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 rounded-2xl bg-white border border-stone-200 text-center font-black hover:bg-stone-50"
                  >
                    Open Menu
                  </a>
                </div>
              </div>

              <div className="mt-4 text-xs text-stone-500">
                Tip: print at least 8–10cm size for fast scanning.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
