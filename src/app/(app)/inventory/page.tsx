"use client";

import { useEffect, useState, useCallback, useMemo, useDeferredValue } from "react";
import WineCard from "@/components/wine-card";
import SwipeableRow from "@/components/swipeable-row";
import { SkeletonWineCard } from "@/components/skeleton";

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
    foodPairings: string | null;
    designation: string | null;
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

function getMatchedPairing(wine: InventoryItem["wine"], query: string): string | null {
  if (!query) return null;
  const q = query.toLowerCase();
  if (
    wine.brand.toLowerCase().includes(q) ||
    (wine.varietal?.toLowerCase().includes(q) ?? false) ||
    (wine.region?.toLowerCase().includes(q) ?? false) ||
    (wine.designation?.toLowerCase().includes(q) ?? false) ||
    (wine.vintage != null && String(wine.vintage).includes(q))
  ) return null;
  if (!wine.foodPairings) return null;
  const match = wine.foodPairings.split(",").find((p) => p.trim().toLowerCase().includes(q));
  return match ? match.trim() : null;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<SortOption>("name");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [toast, setToast] = useState<string | null>(null);
  const deferredFilter = useDeferredValue(filter);

  const loadData = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const onVisChange = () => {
      if (document.visibilityState === "visible") loadData(true);
    };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [loadData]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const totalBottles = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const readyCount = useMemo(() => {
    return items.filter((i) => {
      const s = getStatus(i.wine);
      return s === "ready" || s === "soon";
    }).length;
  }, [items]);
  const varietalCount = useMemo(() => {
    return new Set(items.map((i) => i.wine.varietal?.toLowerCase()).filter(Boolean)).size;
  }, [items]);

  const sorted = useMemo(() => {
    const filtered = items.filter((item) => {
      if (statusFilter !== "all" && getStatus(item.wine) !== statusFilter) return false;
      if (!deferredFilter) return true;
      const q = deferredFilter.toLowerCase();
      return (
        item.wine.brand.toLowerCase().includes(q) ||
        (item.wine.varietal?.toLowerCase().includes(q) ?? false) ||
        (item.wine.region?.toLowerCase().includes(q) ?? false) ||
        (item.wine.designation?.toLowerCase().includes(q) ?? false) ||
        (item.wine.vintage != null && String(item.wine.vintage).includes(q)) ||
        (item.wine.foodPairings?.toLowerCase().includes(q) ?? false)
      );
    });
    return sortItems(filtered, sort);
  }, [items, deferredFilter, statusFilter, sort]);

  const hasFilters = filter !== "" || statusFilter !== "all";

  async function updateQuantity(item: InventoryItem, delta: number) {
    const newQty = item.quantity + delta;
    try {
      if (newQty < 1) {
        if (!confirm(`Remove ${item.wine.brand} from your cellar?`)) return;
        const res = await fetch(`/api/inventory/${item.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setToast(`${item.wine.brand} removed`);
      } else {
        const res = await fetch(`/api/inventory/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: newQty }),
        });
        if (!res.ok) throw new Error();
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i)));
      }
    } catch {
      setToast("Failed to update — try again");
    }
  }

  async function deleteItem(item: InventoryItem) {
    if (!confirm(`Remove ${item.wine.brand} from your cellar?`)) return;
    try {
      const res = await fetch(`/api/inventory/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setToast(`${item.wine.brand} removed`);
    } catch {
      setToast("Failed to remove — try again");
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="h-8 w-24 animate-pulse bg-gray-200 rounded-lg" />
        <div className="h-11 animate-pulse bg-gray-200 rounded-xl" />
        <div className="flex gap-3">
          <div className="h-10 flex-1 animate-pulse bg-gray-200 rounded-xl" />
          <div className="h-10 flex-1 animate-pulse bg-gray-200 rounded-xl" />
          <div className="h-10 flex-1 animate-pulse bg-gray-200 rounded-xl" />
        </div>
        <div className="space-y-3">
          <SkeletonWineCard />
          <SkeletonWineCard />
          <SkeletonWineCard />
          <SkeletonWineCard />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cellar</h1>

      <input
        type="text"
        placeholder="Search name, grape, region, year, food pairing..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition shadow-sm"
      />

      {items.length > 0 && (
        <div className="flex justify-around bg-white rounded-2xl shadow-sm py-3">
          <div className="text-center">
            <p className="text-lg font-bold text-rose-600">{totalBottles}</p>
            <p className="text-[10px] text-gray-400">Bottles</p>
          </div>
          <div className="text-center border-x border-gray-100 px-6">
            <p className="text-lg font-bold text-green-600">{readyCount}</p>
            <p className="text-[10px] text-gray-400">Ready</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-600">{varietalCount}</p>
            <p className="text-[10px] text-gray-400">Varietals</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white focus:border-rose-400 outline-none shadow-sm"
        >
          {(Object.entries(STATUS_LABELS) as [StatusFilter, string][]).map(([key, label]) => (
            <option key={key} value={key}>{key === "all" ? "Status: All" : label}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white focus:border-rose-400 outline-none shadow-sm"
        >
          <option value="name">Sort: Name</option>
          <option value="rating">Sort: Rating</option>
          <option value="vintage">Sort: Vintage</option>
          <option value="status">Sort: Status</option>
          <option value="added">Sort: Added</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        items.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-5xl">🍾</p>
            <p className="text-lg text-gray-500">Your cellar is empty</p>
            <p className="text-sm text-gray-400">Tap the scan button to add your first bottle</p>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No wines match your {hasFilters ? "filters" : "search"}</p>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {sorted.map((item) => (
            <SwipeableRow
              key={item.id}
              onSwipeAction={() => deleteItem(item)}
              actionLabel="Delete"
              actionColor="bg-red-500"
            >
              <WineCard
                wine={item.wine}
                quantity={item.quantity}
                extra={
                  <>
                    {(() => {
                      const matched = getMatchedPairing(item.wine, deferredFilter);
                      return matched ? (
                        <p className="text-xs text-amber-700 bg-amber-50 rounded-full px-2.5 py-0.5 mt-1.5 inline-block">
                          Pairs with: {matched}
                        </p>
                      ) : null;
                    })()}
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
                      <button
                        onClick={() => deleteItem(item)}
                        className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </>
                }
              />
            </SwipeableRow>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-2xl text-sm shadow-lg toast-animate z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
