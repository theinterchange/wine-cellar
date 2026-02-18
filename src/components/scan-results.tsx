"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ScanResult {
  id: number;
  brand: string;
  varietal: string | null;
  vintage: number | null;
  region: string | null;
  drinkWindowStart: number;
  drinkWindowEnd: number;
  estimatedRating: number;
  ratingNotes: string;
  designation: string | null;
  foodPairings: string | null;
  marketPrice: string | null;
  imageUrl: string;
}

interface ScanResultsProps {
  result: ScanResult;
}

export default function ScanResults({ result }: ScanResultsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [toast, setToast] = useState<string | null>(null);

  const [brand, setBrand] = useState(result.brand);
  const [varietal, setVarietal] = useState(result.varietal ?? "");
  const [vintage, setVintage] = useState(result.vintage != null ? String(result.vintage) : "");
  const [region, setRegion] = useState(result.region ?? "");
  const [designation, setDesignation] = useState(result.designation ?? "");
  const [foodPairings, setFoodPairings] = useState(result.foodPairings ?? "");
  const [pairingInput, setPairingInput] = useState("");
  const [editingPairings, setEditingPairings] = useState(false);

  // Live display state (updated after rescore)
  const [drinkWindowStart, setDrinkWindowStart] = useState(result.drinkWindowStart);
  const [drinkWindowEnd, setDrinkWindowEnd] = useState(result.drinkWindowEnd);
  const [estimatedRating, setEstimatedRating] = useState(result.estimatedRating);
  const [ratingNotes, setRatingNotes] = useState(result.ratingNotes);
  const [marketPrice, setMarketPrice] = useState(result.marketPrice);

  // Dirty tracking
  const [original, setOriginal] = useState({
    brand: result.brand,
    varietal: result.varietal ?? "",
    vintage: result.vintage != null ? String(result.vintage) : "",
    region: result.region ?? "",
    designation: result.designation ?? "",
    foodPairings: result.foodPairings ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [rescoring, setRescoring] = useState(false);

  const isDirty =
    brand !== original.brand ||
    varietal !== original.varietal ||
    vintage !== original.vintage ||
    region !== original.region ||
    designation !== original.designation ||
    foodPairings !== original.foodPairings;

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

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
      const res = await fetch(`/api/wines/${result.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      // Update live display
      setDrinkWindowStart(data.drinkWindowStart);
      setDrinkWindowEnd(data.drinkWindowEnd);
      setEstimatedRating(data.estimatedRating);
      setRatingNotes(data.ratingNotes);
      setMarketPrice(data.marketPrice);
      // Update fields from response
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
      setToast(rescore ? "Re-scored successfully" : "Saved");
    } catch {
      setToast("Failed to save — try again");
    } finally {
      setSaving(false);
      setRescoring(false);
    }
  }

  async function addToInventory() {
    if (isDirty) await saveWine(false);
    setLoading(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wineId: result.id, quantity }),
      });
      if (res.ok) {
        setToast(`${brand} added to cellar!`);
        setTimeout(() => router.push("/inventory"), 1500);
      } else {
        setToast("Failed to add to cellar");
        setLoading(false);
      }
    } catch {
      setToast("Failed to add to cellar");
      setLoading(false);
    }
  }

  async function addToWishlist() {
    if (isDirty) await saveWine(false);
    setLoading(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wineId: result.id }),
      });
      if (res.ok) {
        setToast(`${brand} added to wish list!`);
        setTimeout(() => router.push("/wishlist"), 1500);
      } else {
        setToast("Failed to add to wish list");
        setLoading(false);
      }
    } catch {
      setToast("Failed to add to wish list");
      setLoading(false);
    }
  }

  const currentYear = new Date().getFullYear();
  const status =
    currentYear < drinkWindowStart
      ? "Too Early"
      : currentYear > drinkWindowEnd
        ? "Past Peak"
        : "Ready to Drink";

  const statusColor =
    status === "Ready to Drink"
      ? "bg-green-100 text-green-800"
      : status === "Too Early"
        ? "bg-blue-100 text-blue-800"
        : "bg-red-100 text-red-800";

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
        <input
          type="text"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="text-xl font-bold text-gray-900 w-full bg-transparent border-b border-transparent focus:border-gray-300 outline-none pb-0.5 transition-colors"
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">Varietal</label>
            <input
              type="text"
              value={varietal}
              onChange={(e) => setVarietal(e.target.value)}
              placeholder="e.g. Cabernet Sauvignon"
              className="w-full text-sm text-gray-900 bg-transparent border-b border-gray-200 focus:border-purple-400 outline-none pb-0.5 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">Vintage</label>
            <input
              type="text"
              inputMode="numeric"
              value={vintage}
              onChange={(e) => setVintage(e.target.value)}
              placeholder="e.g. 2019"
              className="w-full text-sm text-gray-900 bg-transparent border-b border-gray-200 focus:border-purple-400 outline-none pb-0.5 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">Region</label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. Napa Valley"
              className="w-full text-sm text-gray-900 bg-transparent border-b border-gray-200 focus:border-purple-400 outline-none pb-0.5 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">Designation</label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Reserve"
              className="w-full text-sm text-gray-900 bg-transparent border-b border-gray-200 focus:border-purple-400 outline-none pb-0.5 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${statusColor}`}>
            {status}
          </span>
          <span className="text-sm text-gray-600">
            Drink {drinkWindowStart}–{drinkWindowEnd}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-purple-600">{estimatedRating}</span>
          <span className="text-sm text-gray-500">/ 100 (AI Estimated)</span>
          {marketPrice && (
            <span className="ml-auto text-lg font-bold text-green-700">{marketPrice}</span>
          )}
        </div>

        <p className="text-sm text-gray-600 italic">{ratingNotes}</p>

        <div className="pt-2 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-400 font-medium">Food Pairings</label>
              <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <button
              onClick={() => {
                setEditingPairings(!editingPairings);
              }}
              className="text-xs text-purple-500 hover:text-purple-700 font-medium"
            >
              {editingPairings ? "Done" : "Edit"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {foodPairings ? (
              foodPairings.split(",").map((pairing, i) => {
                const trimmed = pairing.trim();
                if (!trimmed) return null;
                return (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium flex items-center gap-1"
                  >
                    {trimmed}
                    {editingPairings && (
                      <button
                        onClick={() => {
                          const tags = foodPairings.split(",").map(t => t.trim()).filter(Boolean);
                          tags.splice(i, 1);
                          setFoodPairings(tags.join(", "));
                        }}
                        className="text-purple-400 hover:text-purple-600 transition"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </span>
                );
              })
            ) : (
              <span className="text-sm text-gray-400 italic">No pairings yet — tap Edit to add</span>
            )}
          </div>
          {editingPairings && (
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
              className="w-full text-sm text-gray-600 bg-transparent border-b border-gray-200 focus:border-purple-400 outline-none pb-0.5 transition-colors"
              autoFocus
            />
          )}
        </div>
      </div>

      {/* Spacer when save bar is visible */}
      {isDirty && <div className="h-20" />}

      <div className="flex gap-3">
        <div className="flex items-center gap-2 bg-white rounded-lg border px-3 py-2">
          <label className="text-sm text-gray-600">Qty:</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            className="w-16 text-center border rounded px-1 py-0.5 text-gray-900"
          />
        </div>
        <button
          onClick={addToInventory}
          disabled={loading}
          className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 text-white font-medium hover:bg-purple-700 disabled:opacity-50"
        >
          Add to Inventory
        </button>
      </div>

      <button
        onClick={addToWishlist}
        disabled={loading}
        className="w-full rounded-lg border-2 border-purple-200 px-4 py-2.5 text-purple-700 font-medium hover:bg-purple-50 disabled:opacity-50"
      >
        Add to Wish List
      </button>

      {/* Sticky save bar */}
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

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-2xl text-sm shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
