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

  async function addToInventory() {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wineId: result.id, quantity }),
      });
      if (res.ok) {
        setToast(`${result.brand} added to cellar!`);
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
        setToast(`${result.brand} added to wish list!`);
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
        <h2 className="text-xl font-bold text-gray-900">{result.brand}</h2>

        <div className="flex flex-wrap gap-2">
          {result.varietal && (
            <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
              {result.varietal}
            </span>
          )}
          {result.vintage && (
            <span className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
              {result.vintage}
            </span>
          )}
          {result.region && (
            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">
              {result.region}
            </span>
          )}
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
        </div>

        <p className="text-sm text-gray-600 italic">{result.ratingNotes}</p>
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
