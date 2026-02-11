"use client";

import { useEffect, useState } from "react";
import WineCard from "@/components/wine-card";
import Link from "next/link";

interface InventoryItem {
  id: number;
  quantity: number;
  purchaseDate: string | null;
  purchasePrice: number | null;
  notes: string | null;
  addedAt: string;
  wine: {
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
  };
}

type SortOption = "name" | "rating" | "vintage" | "status" | "added";
type StatusFilter = "all" | "ready" | "early" | "soon" | "past";

function getStatus(wine: InventoryItem["wine"]): StatusFilter {
  const year = new Date().getFullYear();
  const start = wine.drinkWindowStart;
  const end = wine.drinkWindowEnd;
  if (!start || !end) return "ready";
  if (year < start) return "early";
  if (year > end) return "past";
  if (year === end) return "soon";
  return "ready";
}

function sortItems(items: InventoryItem[], sort: SortOption): InventoryItem[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case "name":
        return a.wine.brand.localeCompare(b.wine.brand);
      case "rating":
        return (b.wine.estimatedRating ?? 0) - (a.wine.estimatedRating ?? 0);
      case "vintage":
        return (b.wine.vintage ?? 0) - (a.wine.vintage ?? 0);
      case "status": {
        const order: Record<string, number> = { soon: 0, ready: 1, early: 2, past: 3, all: 4 };
        return order[getStatus(a.wine)] - order[getStatus(b.wine)];
      }
      case "added":
        return (b.addedAt ?? "").localeCompare(a.addedAt ?? "");
      default:
        return 0;
    }
  });
}

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All",
  ready: "Ready",
  early: "Too Early",
  soon: "Drink Soon",
  past: "Past Peak",
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<SortOption>("name");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const filtered = items
    .filter((item) => {
      if (statusFilter !== "all" && getStatus(item.wine) !== statusFilter) return false;
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (
        item.wine.brand.toLowerCase().includes(q) ||
        item.wine.varietal?.toLowerCase().includes(q) ||
        item.wine.region?.toLowerCase().includes(q)
      );
    });

  const sorted = sortItems(filtered, sort);

  async function updateQuantity(item: InventoryItem, delta: number) {
    const newQty = item.quantity + delta;
    if (newQty < 1) {
      if (!confirm(`Remove ${item.wine.brand} from your cellar?`)) return;
      await fetch(`/api/inventory/${item.id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setToast(`${item.wine.brand} removed`);
    } else {
      await fetch(`/api/inventory/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty }),
      });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i)));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cellar</h1>
        <Link
          href="/scan"
          className="rounded-xl bg-rose-600 px-4 py-2 text-sm text-white font-semibold hover:bg-rose-700 transition"
        >
          + Add
        </Link>
      </div>

      <input
        type="text"
        placeholder="Search by name, varietal, region..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition shadow-sm"
      />

      <div className="flex items-center gap-3">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white focus:border-rose-400 outline-none shadow-sm"
        >
          <option value="name">Name A-Z</option>
          <option value="rating">Rating</option>
          <option value="vintage">Vintage</option>
          <option value="status">Status</option>
          <option value="added">Date Added</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.entries(STATUS_LABELS) as [StatusFilter, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              statusFilter === key
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-white text-gray-500 hover:bg-gray-100 shadow-sm"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">
            {items.length === 0 ? "No wines in your cellar" : "No wines match your filters"}
          </p>
          {items.length === 0 && (
            <Link href="/scan" className="text-rose-600 hover:underline mt-2 inline-block">
              Scan your first bottle
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((item) => (
            <WineCard
              key={item.id}
              wine={item.wine}
              quantity={item.quantity}
              extra={
                <div className="flex items-center gap-1 mt-2" onClick={(e) => e.preventDefault()}>
                  <button
                    onClick={() => updateQuantity(item, -1)}
                    className="w-8 h-8 rounded-xl bg-gray-100 text-gray-600 text-lg font-medium hover:bg-gray-200 active:bg-gray-300 transition flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-gray-700">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item, 1)}
                    className="w-8 h-8 rounded-xl bg-gray-100 text-gray-600 text-lg font-medium hover:bg-gray-200 active:bg-gray-300 transition flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}

      <p className="text-center text-sm text-gray-400 pt-2">
        {items.reduce((sum, i) => sum + i.quantity, 0)} bottles total
      </p>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-2xl text-sm shadow-lg toast-animate z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
