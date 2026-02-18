"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import DrinkingWindowBadge from "@/components/drinking-window-badge";
import { SkeletonWineDetail } from "@/components/skeleton";
import RecommendModal from "@/components/recommend-modal";

interface Wine {
  id: number;
  brand: string;
  varietal: string | null;
  vintage: number | null;
  region: string | null;
  imageUrl: string | null;
  drinkWindowStart: number | null;
  drinkWindowEnd: number | null;
  estimatedRating: number | null;
  ratingNotes: string | null;
  designation: string | null;
  foodPairings: string | null;
  marketPrice: string | null;
}

interface InventoryEntry {
  id: number;
  quantity: number;
  purchaseDate: string | null;
  purchasePrice: number | null;
  notes: string | null;
  wine: { id: number };
}

interface ConsumedRecord {
  id: number;
  rating: number | null;
  notes: string | null;
  consumedAt: string;
}

export default function WineDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [wine, setWine] = useState<Wine | null>(null);
  const [inventoryEntry, setInventoryEntry] = useState<InventoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // My rating from consumed records
  const [myRating, setMyRating] = useState<ConsumedRecord | null>(null);

  // Metadata editing state
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [notes, setNotes] = useState("");

  // Wine editing state
  const [brand, setBrand] = useState("");
  const [varietal, setVarietal] = useState("");
  const [vintage, setVintage] = useState("");
  const [region, setRegion] = useState("");
  const [designation, setDesignation] = useState("");
  const [foodPairings, setFoodPairings] = useState("");

  // Original values for dirty detection
  const [original, setOriginal] = useState({
    brand: "", varietal: "", vintage: "", region: "", designation: "", foodPairings: "",
  });
  const [pairingInput, setPairingInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [consumedToast, setConsumedToast] = useState<{ id: number; wineName: string } | null>(null);
  const consumedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inline rating modal state (for drink toast)
  const [showDrinkRating, setShowDrinkRating] = useState(false);
  const [drinkConsumedId, setDrinkConsumedId] = useState<number | null>(null);
  const [drinkRatingValue, setDrinkRatingValue] = useState("");
  const [drinkRatingNotes, setDrinkRatingNotes] = useState("");
  const [savingDrinkRating, setSavingDrinkRating] = useState(false);
  const [showRecommend, setShowRecommend] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/wines/${id}`).then((r) => r.json()),
      fetch("/api/inventory").then((r) => r.json()),
      fetch("/api/consumed").then((r) => r.json()),
    ]).then(([wineData, inventoryData, consumedData]) => {
      setWine(wineData);
      const vals = {
        brand: wineData.brand || "",
        varietal: wineData.varietal || "",
        vintage: wineData.vintage != null ? String(wineData.vintage) : "",
        region: wineData.region || "",
        designation: wineData.designation || "",
        foodPairings: wineData.foodPairings || "",
      };
      setBrand(vals.brand);
      setVarietal(vals.varietal);
      setVintage(vals.vintage);
      setRegion(vals.region);
      setDesignation(vals.designation);
      setFoodPairings(vals.foodPairings);
      setOriginal(vals);
      const entry = inventoryData.find((i: InventoryEntry) => i.wine.id === Number(id));
      if (entry) {
        setInventoryEntry(entry);
        setPurchaseDate(entry.purchaseDate || "");
        setPurchasePrice(entry.purchasePrice != null ? String(entry.purchasePrice) : "");
        setNotes(entry.notes || "");
      }
      // Find most recent consumed record with a rating for this wine
      const wineConsumed = consumedData
        .filter((c: ConsumedRecord & { wine: { id: number } }) => c.wine.id === Number(id))
        .sort((a: ConsumedRecord, b: ConsumedRecord) => b.consumedAt.localeCompare(a.consumedAt));
      if (wineConsumed.length > 0) {
        const rated = wineConsumed.find((c: ConsumedRecord) => c.rating != null);
        setMyRating(rated || wineConsumed[0]);
      }
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (actionMsg) {
      const t = setTimeout(() => setActionMsg(null), 2500);
      return () => clearTimeout(t);
    }
  }, [actionMsg]);

  const isDirty =
    brand !== original.brand ||
    varietal !== original.varietal ||
    vintage !== original.vintage ||
    region !== original.region ||
    designation !== original.designation ||
    foodPairings !== original.foodPairings;

  function applyWineResponse(data: Wine) {
    setWine(data);
    const vals = {
      brand: data.brand || "",
      varietal: data.varietal || "",
      vintage: data.vintage != null ? String(data.vintage) : "",
      region: data.region || "",
      designation: data.designation || "",
      foodPairings: data.foodPairings || "",
    };
    setBrand(vals.brand);
    setVarietal(vals.varietal);
    setVintage(vals.vintage);
    setRegion(vals.region);
    setDesignation(vals.designation);
    setFoodPairings(vals.foodPairings);
    setOriginal(vals);
  }

  async function saveWine(rescore = false) {
    if (rescore) setRescoring(true); else setSaving(true);
    const body: Record<string, unknown> = {
      brand: brand || null,
      varietal: varietal || null,
      vintage: vintage ? parseInt(vintage) : null,
      region: region || null,
      designation: designation || null,
      foodPairings: foodPairings || null,
    };
    if (rescore) body.rescore = true;
    try {
      const res = await fetch(`/api/wines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      applyWineResponse(data);
      setActionMsg(rescore ? "Re-scored successfully" : "Saved");
    } catch {
      setActionMsg("Failed to save — try again");
    } finally {
      setSaving(false);
      setRescoring(false);
    }
  }

  async function updateQuantity(delta: number) {
    if (!inventoryEntry) return;
    const newQty = inventoryEntry.quantity + delta;
    try {
      if (newQty < 1) {
        if (!confirm(`This is your last bottle of ${brand}. Remove from cellar?`)) return;
        const res = await fetch(`/api/inventory/${inventoryEntry.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        setInventoryEntry(null);
        setActionMsg("Last bottle finished! Cheers!");
      } else {
        const res = await fetch(`/api/inventory/${inventoryEntry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: newQty }),
        });
        if (!res.ok) throw new Error();
        setInventoryEntry({ ...inventoryEntry, quantity: newQty });
        setActionMsg(`${newQty} bottle${newQty > 1 ? "s" : ""} remaining`);
      }
    } catch {
      setActionMsg("Failed to update — try again");
    }
  }

  async function saveMetadata(field: string, value: string) {
    if (!inventoryEntry) return;
    const body: Record<string, unknown> = {};
    if (field === "purchaseDate") body.purchaseDate = value || null;
    if (field === "purchasePrice") body.purchasePrice = value ? parseFloat(value) : null;
    if (field === "notes") body.notes = value || null;

    try {
      const res = await fetch(`/api/inventory/${inventoryEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
    } catch {
      setActionMsg("Failed to save — try again");
    }
  }

  async function addToInventory() {
    if (!wine) return;
    const input = prompt(`How many bottles of ${brand}?`, "1");
    if (!input) return;
    const quantity = parseInt(input);
    if (isNaN(quantity) || quantity < 1) return;

    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wineId: wine.id, quantity }),
    });
    const data = await res.json();
    const entry = { id: data.id, quantity, purchaseDate: null, purchasePrice: null, notes: null, wine: { id: wine.id } };
    setInventoryEntry(entry);
    setActionMsg("Added to cellar!");
  }

  async function addToWishlist() {
    if (!wine) return;
    await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wineId: wine.id }),
    });
    setActionMsg("Added to wish list!");
  }

  async function drinkOne() {
    if (!wine || !inventoryEntry) return;
    try {
      const res = await fetch("/api/consumed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wineId: wine.id, inventoryId: inventoryEntry.id }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      // Decrement locally
      if (inventoryEntry.quantity <= 1) {
        setInventoryEntry(null);
      } else {
        setInventoryEntry({ ...inventoryEntry, quantity: inventoryEntry.quantity - 1 });
      }

      // Show rich toast
      setConsumedToast({ id: data.id, wineName: brand });
      if (consumedTimerRef.current) clearTimeout(consumedTimerRef.current);
      consumedTimerRef.current = setTimeout(() => setConsumedToast(null), 5000);
    } catch {
      setActionMsg("Failed to record — try again");
    }
  }

  async function saveDrinkRating() {
    if (!drinkConsumedId) return;
    setSavingDrinkRating(true);
    try {
      const body: Record<string, unknown> = {
        rating: drinkRatingValue ? parseInt(drinkRatingValue) : null,
        notes: drinkRatingNotes || null,
      };
      const res = await fetch(`/api/consumed/${drinkConsumedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setShowDrinkRating(false);
      setConsumedToast(null);
      setActionMsg("Rating saved");
      // Update local my rating
      if (body.rating != null) {
        setMyRating({ id: drinkConsumedId, rating: body.rating as number, notes: body.notes as string | null, consumedAt: new Date().toISOString() });
      }
    } catch {
      setActionMsg("Failed to save — try again");
    } finally {
      setSavingDrinkRating(false);
    }
  }

  if (loading) {
    return <SkeletonWineDetail />;
  }

  if (!wine) {
    return (
      <div className="max-w-lg mx-auto p-4 text-center text-gray-400">Wine not found</div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {wine.imageUrl && (
        <img
          src={wine.imageUrl}
          alt={brand}
          className="w-full max-h-72 object-contain rounded-2xl bg-white shadow-sm"
        />
      )}

      <div className="space-y-4">
        <input
          type="text"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="text-2xl font-bold text-gray-900 tracking-tight w-full bg-transparent border-b border-transparent focus:border-gray-300 outline-none pb-0.5 transition-colors"
        />

        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900">Wine Details</h2>
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">Varietal</label>
              <input
                type="text"
                value={varietal}
                onChange={(e) => setVarietal(e.target.value)}
                placeholder="e.g. Cabernet Sauvignon"
                className="w-full text-sm text-gray-900 bg-transparent border-b border-gray-200 focus:border-rose-400 outline-none pb-0.5 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">Vintage</label>
              <input
                type="text"
                inputMode="numeric"
                value={vintage}
                onChange={(e) => setVintage(e.target.value)}
                placeholder="e.g. 2019"
                className="w-full text-sm text-gray-900 bg-transparent border-b border-gray-200 focus:border-rose-400 outline-none pb-0.5 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">Region</label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. Napa Valley"
                className="w-full text-sm text-gray-900 bg-transparent border-b border-gray-200 focus:border-rose-400 outline-none pb-0.5 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">Designation</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Reserve"
                className="w-full text-sm text-gray-900 bg-transparent border-b border-gray-200 focus:border-rose-400 outline-none pb-0.5 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900">Food Pairings</h2>
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <div className="flex flex-wrap gap-2">
            {foodPairings ? (
              foodPairings.split(",").map((pairing, i) => {
                const trimmed = pairing.trim();
                if (!trimmed) return null;
                return (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm flex items-center gap-1.5"
                  >
                    {trimmed}
                    <button
                      onClick={() => {
                        const tags = foodPairings.split(",").map(t => t.trim()).filter(Boolean);
                        tags.splice(i, 1);
                        setFoodPairings(tags.join(", "));
                      }}
                      className="text-amber-400 hover:text-amber-600 transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                );
              })
            ) : (
              <span className="text-sm text-gray-400 italic">No pairings yet — type below to add</span>
            )}
          </div>
          <input
            type="text"
            value={pairingInput}
            onChange={(e) => setPairingInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                const val = pairingInput.trim().replace(/,+$/, "").trim();
                if (val) {
                  setFoodPairings(foodPairings ? `${foodPairings}, ${val}` : val);
                  setPairingInput("");
                }
              } else if (e.key === "Backspace" && !pairingInput) {
                const tags = foodPairings.split(",").map(t => t.trim()).filter(Boolean);
                if (tags.length > 0) {
                  tags.pop();
                  setFoodPairings(tags.join(", "));
                }
              }
            }}
            placeholder="Type a pairing and press Enter"
            className="w-full text-sm text-gray-900 bg-transparent border-b border-gray-200 focus:border-rose-400 outline-none pb-0.5 transition-colors"
          />
        </div>

        {/* Spacer to prevent content from hiding behind fixed save bar */}
        {isDirty && <div className="h-20" />}

        {/* Inventory status with +/- controls */}
        {inventoryEntry && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In your cellar</p>
                <p className="text-2xl font-bold text-gray-900">
                  {inventoryEntry.quantity} bottle{inventoryEntry.quantity !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(-1)}
                  className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 text-xl font-medium hover:bg-gray-200 active:bg-gray-300 transition flex items-center justify-center"
                >
                  −
                </button>
                <span className="w-8 text-center text-lg font-bold text-gray-900">{inventoryEntry.quantity}</span>
                <button
                  onClick={() => updateQuantity(1)}
                  className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 text-xl font-medium hover:bg-gray-200 active:bg-gray-300 transition flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
            <button
              onClick={drinkOne}
              className="w-full mt-4 rounded-xl bg-green-600 px-4 py-3 text-white font-semibold text-sm hover:bg-green-700 active:bg-green-800 transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Drink One
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Drinking Window</h2>
          <div className="flex items-center gap-3">
            <DrinkingWindowBadge
              drinkWindowStart={wine.drinkWindowStart}
              drinkWindowEnd={wine.drinkWindowEnd}
            />
            {wine.drinkWindowStart && wine.drinkWindowEnd && (
              <span className="text-sm text-gray-500">
                {wine.drinkWindowStart}–{wine.drinkWindowEnd}
              </span>
            )}
          </div>

          {wine.drinkWindowStart && wine.drinkWindowEnd && (
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-rose-500 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, ((new Date().getFullYear() - wine.drinkWindowStart) / (wine.drinkWindowEnd - wine.drinkWindowStart)) * 100))}%`,
                }}
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">AI Estimated Rating</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-600">{wine.estimatedRating ?? "—"}</span>
            <span className="text-sm text-gray-400">/ 100</span>
          </div>
          {wine.ratingNotes && (
            <p className="text-sm text-gray-500 italic">{wine.ratingNotes}</p>
          )}
          <p className="text-xs text-gray-300">Rating estimated by AI based on wine knowledge</p>
        </div>

        {/* My Rating section */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">My Rating</h2>
          {myRating?.rating != null ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-purple-600">{myRating.rating}</span>
                <span className="text-sm text-gray-400">/ 100</span>
              </div>
              {myRating.notes && (
                <p className="text-sm text-gray-500 italic">{myRating.notes}</p>
              )}
              <p className="text-xs text-gray-300">
                Rated {new Date(myRating.consumedAt).toLocaleDateString()}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">
              {myRating ? "Consumed but not yet rated" : "Not yet rated — drink one to rate it"}
            </p>
          )}
        </div>

        {wine.marketPrice && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Market Price</h2>
            <span className="text-2xl font-bold text-green-700">{wine.marketPrice}</span>
            <p className="text-xs text-gray-300">Average US retail price via web search</p>
          </div>
        )}

        {/* Cellar Notes — only when in inventory */}
        {inventoryEntry && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Cellar Notes</h2>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                onBlur={(e) => saveMetadata("purchaseDate", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">Purchase Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                onBlur={(e) => saveMetadata("purchasePrice", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">Notes</label>
              <textarea
                rows={3}
                placeholder="Tasting notes, storage location, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={(e) => saveMetadata("notes", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition resize-none"
              />
            </div>
          </div>
        )}

        {!inventoryEntry && (
          <div className="flex gap-3">
            <button
              onClick={addToInventory}
              className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-white font-semibold text-sm hover:bg-rose-700 transition"
            >
              Add to Cellar
            </button>
            <button
              onClick={addToWishlist}
              className="flex-1 rounded-xl border border-rose-200 px-4 py-3 text-rose-600 font-semibold text-sm hover:bg-rose-50 transition"
            >
              Add to Wish List
            </button>
          </div>
        )}

        {inventoryEntry && (
          <button
            onClick={addToWishlist}
            className="w-full rounded-xl border border-rose-200 px-4 py-3 text-rose-600 font-semibold text-sm hover:bg-rose-50 transition"
          >
            Add to Wish List
          </button>
        )}

        <button
          onClick={() => setShowRecommend(true)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Recommend to Friend
        </button>
      </div>

      {/* Sticky save bar — fixed at bottom when dirty */}
      {isDirty && (
        <div className="fixed bottom-16 left-0 right-0 z-40">
          <div className="max-w-lg mx-auto px-4 pb-3">
            <div className="flex gap-3 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-3">
              <button
                onClick={() => saveWine(false)}
                disabled={saving || rescoring}
                className="flex-1 rounded-xl bg-gray-900 px-4 py-2.5 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => saveWine(true)}
                disabled={saving || rescoring}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 transition flex items-center justify-center gap-1.5"
              >
                {rescoring ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Re-scoring...
                  </>
                ) : (
                  <span className="flex flex-col items-center leading-tight">
                    <span>Save & Re-score</span>
                    <span className="text-[10px] font-normal opacity-75">AI estimate — may vary</span>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {consumedToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg">
          <div className="bg-gray-900 text-white px-5 py-4 rounded-2xl shadow-lg space-y-3">
            <p className="text-sm font-medium">Cheers! Enjoyed {consumedToast.wineName}</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDrinkConsumedId(consumedToast.id);
                  setDrinkRatingValue("");
                  setDrinkRatingNotes("");
                  setShowDrinkRating(true);
                  setConsumedToast(null);
                }}
                className="flex-1 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold hover:bg-rose-700 transition"
              >
                Rate
              </button>
              <button
                onClick={() => setConsumedToast(null)}
                className="flex-1 rounded-xl bg-gray-700 px-3 py-2 text-sm font-semibold hover:bg-gray-600 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline rating modal */}
      {showDrinkRating && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setShowDrinkRating(false)}>
          <div
            className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900">Rate & Note</h3>
            <p className="text-sm text-gray-500">{brand}</p>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">Rating (0-100)</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                value={drinkRatingValue}
                onChange={(e) => setDrinkRatingValue(e.target.value)}
                placeholder="e.g. 88"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">Notes</label>
              <textarea
                rows={3}
                value={drinkRatingNotes}
                onChange={(e) => setDrinkRatingNotes(e.target.value)}
                placeholder="How was it?"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDrinkRating(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveDrinkRating}
                disabled={savingDrinkRating}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition"
              >
                {savingDrinkRating ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-2xl text-sm shadow-lg toast-animate z-50">
          {actionMsg}
        </div>
      )}

      <RecommendModal
        open={showRecommend}
        onClose={() => setShowRecommend(false)}
        preselectedWine={wine ? { id: wine.id, brand: wine.brand, varietal: wine.varietal, vintage: wine.vintage } : null}
      />
    </div>
  );
}
