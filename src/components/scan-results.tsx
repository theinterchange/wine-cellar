"use client";

import { useState } from "react";
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
  const [editingPairings, setEditingPairings] = useState(false);

  async function saveField(field: string, value: string) {
    const body: Record<string, unknown> = {};
    if (field === "vintage") {
      body[field] = value ? parseInt(value) : null;
    } else {
      body[field] = value || null;
    }
    try {
      await fetch(`/api/wines/${result.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      setToast("Failed to save — try again");
    }
  }

  async function addToInventory() {
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
    currentYear < result.drinkWindowStart
      ? "Too Early"
      : currentYear > result.drinkWindowEnd
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
          onBlur={() => saveField("brand", brand)}
          className="text-xl font-bold text-gray-900 w-full bg-transparent border-b border-transparent focus:border-gray-300 outline-none pb-0.5 transition-colors"
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">Varietal</label>
            <input
              type="text"
              value={varietal}
              onChange={(e) => setVarietal(e.target.value)}
              onBlur={() => saveField("varietal", varietal)}
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
              onBlur={() => saveField("vintage", vintage)}
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
              onBlur={() => saveField("region", region)}
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
              onBlur={() => saveField("designation", designation)}
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
            Drink {result.drinkWindowStart}–{result.drinkWindowEnd}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-purple-600">{result.estimatedRating}</span>
          <span className="text-sm text-gray-500">/ 100 (AI Estimated)</span>
          {result.marketPrice && (
            <span className="ml-auto text-lg font-bold text-green-700">{result.marketPrice}</span>
          )}
        </div>

        <p className="text-sm text-gray-600 italic">{result.ratingNotes}</p>

        <div className="pt-2 border-t border-gray-100 space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400 font-medium">Food Pairings</label>
            <button
              onClick={() => setEditingPairings(!editingPairings)}
              className="text-xs text-purple-500 hover:text-purple-700 font-medium"
            >
              {editingPairings ? "Done" : "Edit"}
            </button>
          </div>
          {editingPairings ? (
            <input
              type="text"
              value={foodPairings}
              onChange={(e) => setFoodPairings(e.target.value)}
              onBlur={() => saveField("foodPairings", foodPairings)}
              placeholder="e.g. Grilled steak, aged cheeses"
              className="w-full text-sm text-gray-600 bg-transparent border-b border-gray-200 focus:border-purple-400 outline-none pb-0.5 transition-colors"
              autoFocus
            />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {foodPairings ? (
                foodPairings.split(",").map((pairing, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium"
                  >
                    {pairing.trim()}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400 italic">No pairings yet</span>
              )}
            </div>
          )}
        </div>
      </div>

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

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-2xl text-sm shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
