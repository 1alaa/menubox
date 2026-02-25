import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { RestaurantDoc, CategoryDoc, ItemDoc } from "../types";
import { isActivePlan } from "../lib/utils";
import { ThemeHandler } from "../components/ThemeHandler";
import { Search, Globe, MessageCircle, AlertTriangle, Loader2, ShoppingBag, Plus, Minus, X, MapPin, Phone, Mail, Clock } from "lucide-react";

type CartLine = {
  item: ItemDoc;
  qty: number;
};

const CustomerMenuPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [restaurant, setRestaurant] = useState<RestaurantDoc | null>(null);
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [items, setItems] = useState<ItemDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNote, setCustomerNote] = useState("");

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [selectedCatId, setSelectedCatId] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;
      
      try {
        const q = query(collection(db, "restaurants"), where("slug", "==", slug));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const restDoc = snap.docs[0];
          const restData = { id: restDoc.id, ...restDoc.data() } as RestaurantDoc;
          setRestaurant(restData);

          // Fetch categories
          const catSnap = await getDocs(query(collection(db, `restaurants/${restDoc.id}/categories`), orderBy("order")));
          setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() } as CategoryDoc)));

          // Fetch items
          const itemSnap = await getDocs(query(collection(db, `restaurants/${restDoc.id}/items`), orderBy("order")));
          setItems(itemSnap.docs.map(d => ({ id: d.id, ...d.data() } as ItemDoc)));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  // Menu behaves like "pages": show only one category at a time.
  // Default to the first category when data loads.
  useEffect(() => {
    if (!selectedCatId && categories.length) {
      setSelectedCatId(categories[0].id);
    }
  }, [categories, selectedCatId]);

  // IMPORTANT: All hooks (useMemo, etc.) MUST run on every render.
  // So compute state-derived values safely even during loading / missing restaurant.
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const active = restaurant ? isActivePlan(restaurant) : false;
  // Optional (may exist in Firestore even if not in TS type)
  const deliveryEnabled = Boolean((restaurant as any)?.deliveryEnabled);
  const menuDisplayName = ((restaurant as any)?.branding?.displayName || restaurant?.name || "").toString();
  const heroImageUrl = (restaurant as any)?.branding?.heroImageUrl || (restaurant as any)?.coverUrl || "";
  const brandLogoUrl = (restaurant as any)?.branding?.logoUrl || "";

  const contact = (restaurant as any)?.branding?.contact || {};
  const contactAddress = (contact.address || (restaurant as any)?.address || "").toString();
  const contactPhone = (contact.phone || (restaurant as any)?.phone || "").toString();
  const contactEmail = (contact.email || "").toString();
  const contactHours = (contact.hours || "").toString();

  const filteredItems = useMemo(() => {
    const s = search.toLowerCase();
    return items.filter((item) => {
      const name = (isAr ? item.nameAr : item.nameEn) || "";
      const desc = (isAr ? item.descAr : item.descEn) || "";
      return name.toLowerCase().includes(s) || desc.toLowerCase().includes(s);
    });
  }, [items, search, isAr]);

  const cartLines: CartLine[] = useMemo(() => {
    const map = new Map(items.map((i) => [i.id, i] as const));
    return Object.entries(cart)
      .map(([id, qty]) => ({ item: map.get(id) as ItemDoc, qty }))
      .filter((l) => Boolean(l.item) && l.qty > 0);
  }, [cart, items]);

  const cartCount = useMemo(() => cartLines.reduce((sum, l) => sum + l.qty, 0), [cartLines]);
  const cartTotal = useMemo(
    () => cartLines.reduce((sum, l) => sum + l.qty * (Number(l.item?.price) || 0), 0),
    [cartLines]
  );
  const cartCurrency = useMemo(() => {
    const set = new Set(cartLines.map((l) => l.item?.currency).filter(Boolean));
    return set.size === 1 ? (Array.from(set)[0] as string) : (cartLines[0]?.item?.currency || "USD");
  }, [cartLines]);

  const handleWhatsApp = () => {
    if (!restaurant?.whatsappPhoneE164) return;
    const msg = isAr ? `مرحباً، أود الاستفسار عن المنيو الخاص بكم.` : `Hello, I'd like to inquire about your menu.`;
    window.open(`https://wa.me/${restaurant.whatsappPhoneE164}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="animate-spin text-emerald-600" />
      </div>
    );
  }
  if (!restaurant) {
    return <div className="min-h-screen flex items-center justify-center">Restaurant not found</div>;
  }

  // If subscription is not active, hide the menu completely.
  if (!active) {
    return (
      <div className="min-h-screen" dir="ltr">
        <ThemeHandler theme={restaurant.theme} />
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4">
          <div className="w-full max-w-lg">
            <div className="rounded-3xl border border-black/5 bg-[var(--color-surface)] shadow-xl overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-[color:var(--color-primary)]/10">
                    <AlertTriangle className="h-6 w-6 text-[color:var(--color-primary)]" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-semibold text-[var(--color-text)] truncate">
                      {restaurant.name || "Menu"}
                    </h1>
                    <p className="mt-1 text-sm text-black/60 dark:text-white/70">
                      This menu is currently unavailable.
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-black/5 bg-black/5 dark:bg-white/10 p-4">
                  <p className="text-[var(--color-text)] font-medium">Temporarily paused</p>
                  <p className="mt-1 text-sm text-black/60 dark:text-white/70">
                    The restaurant’s subscription has ended, so the menu is temporarily closed. Please check back later.
                  </p>
                </div>

                {restaurant.whatsappPhoneE164 ? (
                  <button
                    onClick={() => {
                      const msg = `Hello, I'd like to contact you about your menu.`;
                      window.open(
                        `https://wa.me/${restaurant.whatsappPhoneE164}?text=${encodeURIComponent(msg)}`,
                        "_blank"
                      );
                    }}
                    className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[color:var(--color-primary)] px-4 py-3 text-white font-semibold shadow-sm hover:opacity-95 active:opacity-90"
                  >
                    <MessageCircle className="h-5 w-5" />
                    Contact on WhatsApp
                  </button>
                ) : null}

                <div className="mt-6 text-center text-xs text-black/50 dark:text-white/60">
                  Powered by Menubox
                </div>
              </div>
              <div className="h-2 bg-[color:var(--color-primary)]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const addItem = (item: ItemDoc) => {
    if (!active) return;
    if (!item.available) return;
    setCart(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
  };

  const removeItem = (item: ItemDoc) => {
    setCart(prev => {
      const next = { ...prev };
      const cur = next[item.id] || 0;
      if (cur <= 1) delete next[item.id];
      else next[item.id] = cur - 1;
      return next;
    });
  };

  const clearCart = () => setCart({});

  const scrollToCategory = (catId: string) => {
    setSelectedCatId(catId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openCheckout = () => {
    if (!active) return;
    if (!deliveryEnabled) return;
    if (!restaurant.whatsappPhoneE164) return;
    if (cartCount <= 0) return;
    setCheckoutOpen(true);
  };

  const sendOrderWhatsApp = () => {
    if (!restaurant.whatsappPhoneE164) return;
    const lines = cartLines
      .map(l => {
        const name = isAr ? l.item.nameAr : l.item.nameEn;
        const lineTotal = l.qty * (Number(l.item.price) || 0);
        return `• ${name} × ${l.qty} = ${lineTotal} ${l.item.currency}`;
      })
      .join("\n");

    const header = isAr ? `طلب دليفري – ${menuDisplayName || restaurant.name}` : `Delivery Order – ${menuDisplayName || restaurant.name}`;
    const customer = isAr
      ? `\n\nالاسم: ${customerName || "-"}\nالهاتف: ${customerPhone || "-"}\nالعنوان: ${customerAddress || "-"}${customerNote ? `\nملاحظة: ${customerNote}` : ""}`
      : `\n\nName: ${customerName || "-"}\nPhone: ${customerPhone || "-"}\nAddress: ${customerAddress || "-"}${customerNote ? `\nNote: ${customerNote}` : ""}`;

    const totals = isAr
      ? `\n\nالمجموع: ${cartTotal} ${cartCurrency}`
      : `\n\nTotal: ${cartTotal} ${cartCurrency}`;

    const msg = `${header}\n\n${lines}${totals}${customer}`;
    window.open(`https://wa.me/${restaurant.whatsappPhoneE164}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Show only the selected category (acts like separate pages)
  const selectedCategory = categories.find((c) => c.id === selectedCatId) || categories[0] || null;
  const categoriesToRender = selectedCategory ? [selectedCategory] : [];

  return (
    <div className={`min-h-screen bg-background text-text transition-colors duration-300`} dir={dir}>
      <ThemeHandler theme={restaurant.branding.theme} />
      
      {/* Header */}
      <header className="bg-surface/95 backdrop-blur shadow-sm sticky top-0 z-30 border-b border-stone-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {restaurant.branding.logoUrl ? (
              <img src={restaurant.branding.logoUrl} alt={menuDisplayName || restaurant.name} className="w-10 h-10 rounded-lg object-contain" />
            ) : (
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold">
                {restaurant.name.charAt(0)}
              </div>
            )}
            <h1 className="font-bold text-lg">{menuDisplayName || restaurant.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (deliveryEnabled && restaurant.whatsappPhoneE164) {
                  if (cartCount > 0) openCheckout();
                  else window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                }
              }}
              className="relative flex items-center gap-2 px-3 py-2 bg-stone-100 rounded-full text-xs font-black hover:bg-stone-200 transition-all"
              aria-label="cart"
            >
              <ShoppingBag className="w-4 h-4" />
              {isAr ? "السلة" : "Cart"}
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-primary text-white text-[11px] font-black flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Inactive Banner */}
      {!active && (
        <div className="bg-red-600 text-white px-4 py-3 text-center text-sm font-bold flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {isAr ? "هذا المنيو يتطلب التجديد. يرجى مراجعة الإدارة." : "Subscription renewal required. Please contact management."}
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
        {/* Hero */}
        <div className="mb-7">
          <div className="relative overflow-hidden rounded-[28px] border border-black/5 bg-surface shadow-sm">
            {Boolean(heroImageUrl) ? (
              <>
                <img
                  src={heroImageUrl}
                  alt={menuDisplayName || restaurant.name}
                  className="h-44 w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
              </>
            ) : (
              <div className="h-44 w-full bg-[radial-gradient(circle_at_25%_25%,color:var(--color-primary)/22,transparent_45%),radial-gradient(circle_at_80%_15%,color:var(--color-primary)/18,transparent_40%),linear-gradient(135deg,rgba(0,0,0,0.04),rgba(0,0,0,0))]" />
            )}

            <div className="absolute inset-0">
              <div className="h-full w-full p-5 flex flex-col justify-end">
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full bg-black/35 text-white px-3 py-1 text-[11px] font-black tracking-wide">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      {isAr ? "منيو مباشر" : "Live Menu"}
                    </div>
                    <h2 className="mt-3 text-white text-2xl sm:text-3xl font-black tracking-tight drop-shadow truncate">
                      {menuDisplayName || restaurant.name}
                    </h2>
                    {brandLogoUrl ? (
                      <div className="mt-3">
                        <img
                          src={brandLogoUrl}
                          alt="logo"
                          className="h-10 w-auto max-w-[180px] rounded-xl bg-white/10 p-2 backdrop-blur"
                        />
                      </div>
                    ) : null}
                    <p className="mt-1 text-white/85 text-sm font-semibold line-clamp-2">
                      {((restaurant as any)?.tagline || (restaurant as any)?.shortDesc) ? (isAr ? ((restaurant as any)?.taglineAr || (restaurant as any)?.tagline || (restaurant as any)?.shortDesc) : ((restaurant as any)?.tagline || (restaurant as any)?.shortDescEn || (restaurant as any)?.shortDesc)) : (isAr ? "اختر من الأصناف واطلب دليفري إذا كان متاحاً" : "Pick your items and order delivery if available")}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {restaurant.whatsappPhoneE164 ? (
                      <button
                        onClick={handleWhatsApp}
                        className="h-10 w-10 rounded-2xl bg-white/15 hover:bg-white/20 active:bg-white/25 text-white flex items-center justify-center backdrop-blur"
                        aria-label="whatsapp"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                    ) : null}
                    <button
                      onClick={() => setLang(lang === "en" ? "ar" : "en")}
                      className="h-10 rounded-2xl bg-white/15 hover:bg-white/20 active:bg-white/25 text-white px-3 flex items-center gap-2 text-xs font-black backdrop-blur"
                    >
                      <Globe className="w-4 h-4" />
                      {isAr ? "English" : "العربية"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400`} />
          <input 
            type="text"
            placeholder={isAr ? "ابحث في المنيو..." : "Search menu..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full ${isAr ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-surface border border-stone-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all`}
          />
        </div>

        {/* Category Tabs */}
        {categories.length > 0 && (
          <div className="sticky top-[72px] z-20 -mx-4 px-4 pb-3 pt-2 bg-background/90 backdrop-blur border-b border-stone-100 mb-6">
            <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs font-black tracking-wide border transition whitespace-nowrap ${
                    selectedCatId === cat.id
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-surface border-stone-100 hover:border-primary hover:bg-primary/5"
                  }`}
                >
                  {isAr ? cat.nameAr : cat.nameEn}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category "Page" */}
        {categoriesToRender.map(cat => {
          const catItems = filteredItems.filter(i => i.categoryId === cat.id);
          if (catItems.length === 0) return null;

          const catImageUrl = ((cat as any)?.coverImageUrl || (cat as any)?.imageUrl) as string | undefined;

          return (
            <section key={cat.id} className="mb-12">
              <div ref={(el) => { sectionRefs.current[cat.id] = el; }} className="scroll-mt-40">
                <div className="relative overflow-hidden rounded-3xl bg-surface border border-stone-100 shadow-sm">
                  {catImageUrl ? (
                    <div className="relative">
                      <img src={catImageUrl} alt={isAr ? cat.nameAr : cat.nameEn} className="w-full h-36 object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                      <div className="absolute bottom-0 p-5">
                        <h2 className="text-white text-2xl font-black tracking-tight drop-shadow">
                          {isAr ? cat.nameAr : cat.nameEn}
                        </h2>
                        <p className="text-white/85 text-xs font-bold mt-1">
                          {catItems.length} {isAr ? "صنف" : "items"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6">
                      <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                        <span className="w-2 h-8 bg-primary rounded-full"></span>
                        {isAr ? cat.nameAr : cat.nameEn}
                      </h2>
                      <p className="text-stone-500 text-sm mt-2">
                        {catItems.length} {isAr ? "صنف" : "items"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4">
                {catItems.map(item => {
                  const qty = cart[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      className="group bg-surface rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                    >
                      <div className="p-4 flex gap-3 items-start">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={isAr ? item.nameAr : item.nameEn}
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover flex-shrink-0"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 flex-shrink-0">
                            <ShoppingBag className="w-6 h-6" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="font-black text-[15px] sm:text-base leading-tight truncate">
                                {isAr ? item.nameAr : item.nameEn}
                              </h3>
                              {!!(isAr ? item.descAr : item.descEn) && (
                                <p className="text-stone-500 text-sm mt-1 line-clamp-2">
                                  {isAr ? item.descAr : item.descEn}
                                </p>
                              )}
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-primary font-black whitespace-nowrap">
                                {item.price} <span className="text-[10px] opacity-60">{item.currency}</span>
                              </div>
                              {!item.available && (
                                <div className="mt-2 text-red-500 text-[10px] font-bold uppercase tracking-wider">
                                  {isAr ? "غير متوفر" : "Out of stock"}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-end">
                            {qty > 0 ? (
                              <div className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-2 py-1">
                                <button
                                  onClick={() => removeItem(item)}
                                  className="w-9 h-9 rounded-full bg-white border border-stone-200 hover:bg-stone-50 flex items-center justify-center"
                                  aria-label="decrease"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <div className="w-6 text-center font-black">{qty}</div>
                                <button
                                  onClick={() => addItem(item)}
                                  disabled={!active || !item.available}
                                  className="w-9 h-9 rounded-full bg-primary text-white hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                                  aria-label="increase"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addItem(item)}
                                disabled={!active || !item.available}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white font-black text-sm hover:opacity-95 active:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Plus className="w-4 h-4" />
                                {isAr ? "أضف" : "Add"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-20 text-stone-400">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>{isAr ? "لا توجد نتائج تطابق بحثك" : "No items found matching your search"}</p>
          </div>
        )}

        {/* Contact Info */}
        {(contactAddress || contactPhone || contactEmail || contactHours) && (
          <div className="mt-10">
            <div className="rounded-3xl bg-surface border border-stone-100 shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="text-2xl font-black tracking-tight" style={{ color: "var(--color-primary)" }}>
                  {isAr ? "معلومات التواصل" : "Contact Info"}
                </div>
                <div className="mt-3 h-1 w-24 rounded-full" style={{ background: "var(--color-primary)" }} />

                <div className="mt-6 space-y-4">
                  {contactAddress && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="text-[15px] leading-relaxed text-stone-700 dark:text-white/80">
                        {contactAddress}
                      </div>
                    </div>
                  )}

                  {contactPhone && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Phone className="w-5 h-5" />
                      </div>
                      <a
                        href={`tel:${contactPhone.replace(/\s+/g, "")}`}
                        className="text-[15px] font-semibold text-stone-900 hover:underline dark:text-white"
                      >
                        {contactPhone}
                      </a>
                    </div>
                  )}

                  {contactEmail && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5" />
                      </div>
                      <a
                        href={`mailto:${contactEmail}`}
                        className="text-[15px] font-semibold text-stone-900 hover:underline dark:text-white"
                      >
                        {contactEmail}
                      </a>
                    </div>
                  )}

                  {contactHours && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="text-[15px] font-semibold text-stone-900 dark:text-white">
                        {contactHours}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="h-2" style={{ background: "var(--color-primary)" }} />
            </div>
          </div>
        )}
      </main>

      {/* Bottom Cart Bar (Delivery) */}
      {deliveryEnabled && restaurant.whatsappPhoneE164 && (
        <div className="fixed left-0 right-0 bottom-0 z-40">
          <div className="max-w-2xl mx-auto px-4 pb-4">
            <div className="bg-surface/90 backdrop-blur border border-stone-100 shadow-2xl rounded-3xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="font-black truncate">
                    {isAr ? "السلة" : "Cart"} • {cartCount}
                  </div>
                  <div className="text-stone-500 text-sm truncate">
                    {isAr ? "المجموع" : "Total"}: {cartTotal} {cartCurrency}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearCart}
                  disabled={cartCount === 0}
                  className="px-3 py-2 rounded-2xl bg-stone-100 font-black text-xs hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isAr ? "تفريغ" : "Clear"}
                </button>
                <button
                  onClick={openCheckout}
                  disabled={!active || cartCount === 0}
                  className="px-4 py-2 rounded-2xl bg-emerald-500 text-white font-black text-sm hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isAr ? "اطلب دليفري" : "Delivery"}
                </button>
              </div>
            </div>
            {!active && (
              <div className="text-center text-[11px] text-red-600 font-bold mt-2">
                {isAr ? "الدليفري معطل لأن الاشتراك غير فعّال" : "Delivery disabled because subscription is inactive"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCheckoutOpen(false)} />
          <div className="absolute left-0 right-0 bottom-0">
            <div className="max-w-2xl mx-auto p-4">
              <div className="bg-surface rounded-t-[28px] rounded-b-3xl shadow-2xl border border-stone-100 overflow-hidden">
                <div className="p-5 flex items-center justify-between border-b border-stone-100">
                  <div>
                    <div className="font-black text-lg">{isAr ? "تفاصيل الدليفري" : "Delivery details"}</div>
                    <div className="text-stone-500 text-sm">{isAr ? "رح نبعتهن على واتساب" : "We’ll send this on WhatsApp"}</div>
                  </div>
                  <button
                    onClick={() => setCheckoutOpen(false)}
                    className="w-10 h-10 rounded-2xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center"
                    aria-label="close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-3 max-h-[70vh] overflow-auto">
                  <div className="bg-stone-50 rounded-3xl p-4 border border-stone-100">
                    <div className="flex items-center justify-between">
                      <div className="font-black">{isAr ? "الطلب" : "Order"}</div>
                      <div className="text-primary font-black">{cartTotal} {cartCurrency}</div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {cartLines.map(l => (
                        <div key={l.item.id} className="flex items-center justify-between text-sm">
                          <div className="truncate">
                            {isAr ? l.item.nameAr : l.item.nameEn} <span className="opacity-60">× {l.qty}</span>
                          </div>
                          <div className="font-bold shrink-0">{l.qty * (Number(l.item.price) || 0)} {l.item.currency}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={isAr ? "الاسم" : "Name"}
                      className="w-full px-4 py-3 rounded-2xl bg-background border border-stone-200 outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder={isAr ? "رقم الهاتف" : "Phone"}
                      className="w-full px-4 py-3 rounded-2xl bg-background border border-stone-200 outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder={isAr ? "العنوان" : "Address"}
                      className="w-full px-4 py-3 rounded-2xl bg-background border border-stone-200 outline-none focus:ring-2 focus:ring-primary"
                    />
                    <textarea
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      placeholder={isAr ? "ملاحظة (اختياري)" : "Note (optional)"}
                      className="w-full px-4 py-3 rounded-2xl bg-background border border-stone-200 outline-none focus:ring-2 focus:ring-primary min-h-[90px]"
                    />
                  </div>
                </div>

                <div className="p-5 border-t border-stone-100 flex gap-2">
                  <button
                    onClick={() => setCheckoutOpen(false)}
                    className="flex-1 px-4 py-3 rounded-2xl bg-stone-100 font-black hover:bg-stone-200"
                  >
                    {isAr ? "رجوع" : "Back"}
                  </button>
                  <button
                    onClick={sendOrderWhatsApp}
                    className="flex-1 px-4 py-3 rounded-2xl bg-emerald-500 text-white font-black hover:opacity-95"
                  >
                    {isAr ? "إرسال واتساب" : "Send WhatsApp"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating WhatsApp (inquiry) */}
      {restaurant.whatsappPhoneE164 && (
        <button 
          onClick={handleWhatsApp}
          className={`fixed ${isAr ? 'left-6' : 'right-6'} bottom-6 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform z-30`}
        >
          <MessageCircle className="w-7 h-7" />
        </button>
      )}
    </div>
  );
};

export default CustomerMenuPage;
