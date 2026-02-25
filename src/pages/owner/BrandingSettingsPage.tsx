import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { resolveOwnerRestaurantId } from "../../lib/restaurantLink";
import ImageDropzone from "../../components/ImageDropzone";
import { uploadRestaurantImage } from "../../lib/storageUpload";
import { Loader2, ArrowLeft, Palette, Check, Wand2 } from "lucide-react";

type RestaurantTheme = {
  mode: "light" | "dark";
  primary: string;
  secondary: string;
  background: string;
};

type RestaurantDocLite = {
  id: string;
  name: string;
  slug: string;
  // optional existing fields on restaurant doc
  phone?: string;
  address?: string;
  branding?: {
    logoUrl?: string;
    displayName?: string;
    heroImageUrl?: string;
    contact?: {
      address?: string;
      phone?: string;
      email?: string;
      hours?: string;
    };
    theme: RestaurantTheme;
  };
};

type ThemeTemplate = {
  key: string;
  name: string;
  description: string;
  theme: RestaurantTheme;
};

const TEMPLATES: ThemeTemplate[] = [
  {
    key: "mint",
    name: "Fresh Mint",
    description: "Clean, modern, friendly",
    theme: { mode: "light", primary: "#10b981", secondary: "#059669", background: "#f9fafb" },
  },
  {
    key: "ocean",
    name: "Ocean",
    description: "Premium blue with calm vibes",
    theme: { mode: "light", primary: "#2563eb", secondary: "#1d4ed8", background: "#f8fafc" },
  },
  {
    key: "sunset",
    name: "Sunset",
    description: "Warm + bold for fast food",
    theme: { mode: "light", primary: "#f97316", secondary: "#ea580c", background: "#fff7ed" },
  },
  {
    key: "berry",
    name: "Berry",
    description: "Trendy purple for cafes",
    theme: { mode: "light", primary: "#7c3aed", secondary: "#6d28d9", background: "#faf5ff" },
  },
  {
    key: "midnight",
    name: "Midnight",
    description: "Dark mode, ultra modern",
    theme: { mode: "dark", primary: "#22c55e", secondary: "#16a34a", background: "#0b1220" },
  },
  {
    key: "mono",
    name: "Monochrome",
    description: "Minimal black & white",
    theme: { mode: "dark", primary: "#e5e7eb", secondary: "#9ca3af", background: "#0a0a0a" },
  },
];

export default function BrandingSettingsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantDocLite | null>(null);

  const [displayName, setDisplayName] = useState("");

  const [logoUrl, setLogoUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);

  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [heroUploading, setHeroUploading] = useState(false);

  // Contact Info (shown on customer menu)
  const [contactAddress, setContactAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactHours, setContactHours] = useState("");
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [primary, setPrimary] = useState("#10b981");
  const [secondary, setSecondary] = useState("#059669");
  const [background, setBackground] = useState("#f9fafb");

  const selectedTemplateKey = useMemo(() => {
    const found = TEMPLATES.find(
      (t) =>
        t.theme.mode === mode &&
        t.theme.primary.toLowerCase() === primary.toLowerCase() &&
        t.theme.secondary.toLowerCase() === secondary.toLowerCase() &&
        t.theme.background.toLowerCase() === background.toLowerCase()
    );
    return found?.key ?? null;
  }, [mode, primary, secondary, background]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const rid = await resolveOwnerRestaurantId();
      if (!rid) {
        setRestaurantId(null);
        setRestaurant(null);
        return;
      }
      setRestaurantId(rid);
      const snap = await getDoc(doc(db, "restaurants", rid));
      if (!snap.exists()) throw new Error("Restaurant not found");
      const r = { id: snap.id, ...(snap.data() as any) } as RestaurantDocLite;
      setRestaurant(r);

      const theme = r.branding?.theme ?? {
        mode: "light" as const,
        primary: "#10b981",
        secondary: "#059669",
        background: "#f9fafb",
      };
      setLogoUrl(r.branding?.logoUrl ?? "");
      setDisplayName(r.branding?.displayName ?? "");
      setHeroImageUrl(r.branding?.heroImageUrl ?? "");

      // Contact info: prefer branding.contact then fallback to restaurant fields
      setContactAddress(r.branding?.contact?.address ?? (r.address ?? ""));
      setContactPhone(r.branding?.contact?.phone ?? (r.phone ?? ""));
      setContactEmail(r.branding?.contact?.email ?? "");
      setContactHours(r.branding?.contact?.hours ?? "");
      setMode(theme.mode);
      setPrimary(theme.primary);
      setSecondary(theme.secondary);
      setBackground(theme.background);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to load branding");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyTemplate = (t: ThemeTemplate) => {
    setMode(t.theme.mode);
    setPrimary(t.theme.primary);
    setSecondary(t.theme.secondary);
    setBackground(t.theme.background);
  };

  const save = async () => {
    if (!restaurantId) return;
    setSaving(true);
    setError("");
    try {
      await updateDoc(doc(db, "restaurants", restaurantId), {
        branding: {
          displayName: displayName.trim(),
          logoUrl: logoUrl.trim(),
          heroImageUrl: heroImageUrl.trim(),
          contact: {
            address: contactAddress.trim(),
            phone: contactPhone.trim(),
            email: contactEmail.trim(),
            hours: contactHours.trim(),
          },
          theme: {
            mode,
            primary: primary.trim(),
            secondary: secondary.trim(),
            background: background.trim(),
          },
        },
        updatedAt: serverTimestamp(),
      });
      await load();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to save branding");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!restaurantId || !restaurant) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-6 text-center">
          <h1 className="text-xl font-black">No restaurant linked</h1>
          <p className="text-stone-500 mt-2 text-sm">Create a restaurant first.</p>
          <button
            onClick={() => navigate("/admin/restaurant")}
            className="inline-flex mt-5 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700"
          >
            Create Restaurant
          </button>
        </div>
      </div>
    );
  }

  const previewBg = mode === "dark" ? "bg-[#070a12]" : "bg-white";
  const previewCard = mode === "dark" ? "bg-white/5 border-white/10" : "bg-stone-50 border-stone-200";
  const previewText = mode === "dark" ? "text-white" : "text-stone-900";
  const previewSub = mode === "dark" ? "text-white/70" : "text-stone-500";

  return (
    <div className="min-h-screen bg-stone-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 text-stone-500 hover:text-stone-900 mb-8 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8 sm:p-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600">
                <Palette className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Branding</h1>
                <p className="text-stone-500">Logo & theme colors for your menu</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-2xl mb-6 text-sm font-semibold border border-red-100">
                {error}
              </div>
            )}

            {/* Templates */}
            <div className="mb-8">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-lg font-black">Templates</h2>
                  <p className="text-stone-500 text-sm">Pick a ready style then fine-tune it</p>
                </div>
                <div className="flex items-center gap-2 text-stone-500 text-sm">
                  <Wand2 className="w-4 h-4" /> One click apply
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {TEMPLATES.map((t) => {
                  const active = selectedTemplateKey === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className={
                        "text-left rounded-2xl border p-4 transition-all hover:shadow-sm " +
                        (active ? "border-emerald-300 bg-emerald-50" : "border-stone-200 bg-white")
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-black text-stone-900 flex items-center gap-2">
                            {t.name}
                            {active && (
                              <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                                <Check className="w-3 h-3" /> Selected
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-stone-500 mt-1">{t.description}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full border border-black/10" style={{ background: t.theme.primary }} />
                          <span className="w-5 h-5 rounded-full border border-black/10" style={{ background: t.theme.secondary }} />
                          <span
                            className="w-5 h-5 rounded-full border border-black/10"
                            style={{ background: t.theme.background }}
                            title={t.theme.mode}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Menu Display Name</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={restaurant?.name || "Restaurant name"}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                  <div className="text-xs text-stone-500 mt-2">This name will be shown on the public menu.</div>
                </div>
                <div className="hidden sm:block" />
              </div>

              <ImageDropzone
                label="Menu Hero Image"
                valueUrl={heroImageUrl}
                helperText="Optional cover image shown on top of the menu • PNG/JPG • max 3MB"
                onFileSelected={async (file) => {
                  if (!restaurantId) return;
                  try {
                    setSaving(true);
                    setHeroUploading(true);
                    const url = await uploadRestaurantImage({ restaurantId, folder: "branding", file });
                    setHeroImageUrl(url);
                  } catch (e: any) {
                    setError(e?.message || "Upload failed");
                  } finally {
                    setHeroUploading(false);
                    setSaving(false);
                  }
                }}
              />
              {heroUploading && <div className="text-sm text-stone-500">Uploading...</div>}


              <ImageDropzone
                label="Logo"
                valueUrl={logoUrl}
                helperText="PNG/JPG • max 3MB"
                onFileSelected={async (file) => {
                  if (!restaurantId) return;
                  try {
                    setSaving(true);
                    setLogoUploading(true);
                    const url = await uploadRestaurantImage({ restaurantId, folder: "branding", file });
                    setLogoUrl(url);
                  } catch (e: any) {
                    setError(e?.message || "Upload failed");
                  } finally {
                    setLogoUploading(false);
                    setSaving(false);
                  }
                }}
              />
              {logoUploading && <div className="text-sm text-stone-500">Uploading...</div>}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Background</label>
                  <input
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    type="color"
                    className="w-full h-[52px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-2xl"
                  />
                  <div className="text-xs text-stone-500 mt-1 font-mono">{background}</div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Primary</label>
                  <input
                    value={primary}
                    onChange={(e) => setPrimary(e.target.value)}
                    type="color"
                    className="w-full h-[52px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-2xl"
                  />
                  <div className="text-xs text-stone-500 mt-1 font-mono">{primary}</div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Secondary</label>
                  <input
                    value={secondary}
                    onChange={(e) => setSecondary(e.target.value)}
                    type="color"
                    className="w-full h-[52px] px-3 py-2 bg-stone-50 border border-stone-200 rounded-2xl"
                  />
                  <div className="text-xs text-stone-500 mt-1 font-mono">{secondary}</div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="pt-2">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-lg font-black">Contact Info</h2>
                    <p className="text-stone-500 text-sm">Shown at the bottom of your public menu</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-bold text-stone-700 mb-2">Address</label>
                    <input
                      value={contactAddress}
                      onChange={(e) => setContactAddress(e.target.value)}
                      placeholder="Street, city, landmark..."
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">Phone</label>
                    <input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+961 ..."
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">Email</label>
                    <input
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-bold text-stone-700 mb-2">Opening Hours</label>
                    <input
                      value={contactHours}
                      onChange={(e) => setContactHours(e.target.value)}
                      placeholder="Open 2pm to 1am"
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                    <div className="text-xs text-stone-500 mt-2">Example: Open 2pm to 1am</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={load}
                  disabled={saving}
                  className="px-5 py-3 rounded-2xl border border-stone-200 bg-white font-black text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                >
                  Reset
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
            <div
              className={"p-6 " + previewBg}
              style={{ background: background }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className={"text-sm font-black " + previewText}>LOGO</span>
                  )}
                </div>
                <div>
                  <div className={"text-lg font-black leading-tight " + previewText}>{restaurant.name}</div>
                  <div className={"text-sm " + previewSub}>Menu preview</div>
                </div>
              </div>

              <div className={"mt-5 rounded-2xl border p-4 " + previewCard}>
                <div className={"font-black " + previewText}>Featured Item</div>
                <div className={"text-sm mt-1 " + previewSub}>Looks great with your theme</div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl font-black text-white"
                    style={{ background: primary }}
                  >
                    Primary
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl font-black text-white"
                    style={{ background: secondary }}
                  >
                    Secondary
                  </button>
                </div>
              </div>

              <div className={"mt-4 text-xs " + previewSub}>
                Mode: <span className="font-mono">{mode}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
