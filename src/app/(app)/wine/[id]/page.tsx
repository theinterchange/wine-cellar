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

  useEffect(() => {
    Promise.all([
      fetch(`/api/wines/${id}`).then((r) => r.json()),
      fetch("/api/inventory").then((r) => r.json()),
    ]).then(([wineData, inventoryData]) => {
      setWine(wineData);
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

  async function updateQuantity(delta: number) {
    if (!inventoryEntry) return;
    const newQty = inventoryEntry.quantity + delta;
    try {
      if (newQty < 1) {
        if (!confirm(`This is your last bottle of ${wine?.brand}. Remove from cellar?`)) return;
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
    const input = prompt(`How many bottles of ${wine.brand}?`, "1");
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
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        ← Back
      </button>

      {wine.imageUrl && (
        <img
          src={wine.imageUrl}
          alt={wine.brand}
          className="w-full max-h-72 object-contain rounded-2xl bg-white shadow-sm"
        />
      )}

      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{wine.brand}</h1>

        <div className="flex flex-wrap gap-2">
          {wine.varietal && (
            <span className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-full text-sm font-medium">
              {wine.varietal}
            </span>
          )}
          {wine.vintage && (
            <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              {wine.vintage}
            </span>
          )}
          {wine.region && (
            <span className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
              {wine.region}
            </span>
          )}
          {wine.designation && (
            <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
              {wine.designation}
            </span>
          )}
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

        {wine.foodPairings && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Food Pairings</h2>
            <div className="flex flex-wrap gap-2">
              {wine.foodPairings.split(",").map((pairing, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm"
                >
                  {pairing.trim()}
                </span>
              ))}
            </div>
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
      </div>

      {actionMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-2xl text-sm shadow-lg toast-animate z-50">
          {actionMsg}
        </div>
      )}
    </div>
  );
}
