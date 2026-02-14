"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DrinkingWindowBadge from "@/components/drinking-window-badge";
import { SkeletonWineDetail } from "@/components/skeleton";

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

export default function WineDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [wine, setWine] = useState<Wine | null>(null);
  const [inventoryEntry, setInventoryEntry] = useState<InventoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

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
  const [saving, setSaving] = useState(false);
  const [rescoring, setRescoring] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/wines/${id}`).then((r) => r.json()),
      fetch("/api/inventory").then((r) => r.json()),
    ]).then(([wineData, inventoryData]) => {
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
          <h2 className="font-semibold text-gray-900">Wine Details</h2>
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
            <span className="text-3xl font-bold text-rose-600">{wine.estimatedRating}</span>
            <span className="text-sm text-gray-400">/ 100</span>
          </div>
          {wine.ratingNotes && (
            <p className="text-sm text-gray-500 italic">{wine.ratingNotes}</p>
          )}
          <p className="text-xs text-gray-300">Rating estimated by AI based on wine knowledge</p>
        </div>

        {wine.marketPrice && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Market Price</h2>
            <span className="text-2xl font-bold text-green-700">{wine.marketPrice}</span>
            <p className="text-xs text-gray-300">Average US retail price via web search</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Food Pairings</h2>
          <input
            type="text"
            value={foodPairings}
            onChange={(e) => setFoodPairings(e.target.value)}
            placeholder="e.g. Grilled steak, aged cheeses"
            className="w-full text-sm text-gray-900 bg-transparent border-b border-gray-200 focus:border-rose-400 outline-none pb-0.5 transition-colors"
          />
          {foodPairings && (
            <div className="flex flex-wrap gap-2">
              {foodPairings.split(",").map((pairing, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm"
                >
                  {pairing.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

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
      </div>

      {isDirty && (
        <div className="fixed bottom-20 left-0 right-0 z-40">
          <div className="max-w-lg mx-auto px-4">
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
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {rescoring ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Re-scoring...
                  </>
                ) : "Save & Re-score"}
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
    </div>
  );
}
