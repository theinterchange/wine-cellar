"use client";

import { useEffect, useState, useCallback } from "react";
import WineCard from "@/components/wine-card";
import SwipeableRow from "@/components/swipeable-row";
import { SkeletonWineCard } from "@/components/skeleton";
import Link from "next/link";

interface WishlistItem {
  id: number;
  priority: number | null;
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

type SortOption = "name" | "rating" | "added";

function sortItems(items: WishlistItem[], sort: SortOption): WishlistItem[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case "name":
        return a.wine.brand.localeCompare(b.wine.brand);
      case "rating":
        return (b.wine.estimatedRating ?? 0) - (a.wine.estimatedRating ?? 0);
      case "added":
        return (b.addedAt ?? "").localeCompare(a.addedAt ?? "");
      default:
        return 0;
    }
  });
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<SortOption>("name");

  const loadData = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    fetch("/api/wishlist")
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

  const filtered = items.filter((item) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      item.wine.brand.toLowerCase().includes(q) ||
      item.wine.varietal?.toLowerCase().includes(q) ||
      item.wine.region?.toLowerCase().includes(q)
    );
  });

  const sorted = sortItems(filtered, sort);

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function moveToInventory(item: WishlistItem) {
    const input = prompt(`How many bottles of ${item.wine.brand} do you have?`, "1");
    if (!input) return;
    const quantity = parseInt(input);
    if (isNaN(quantity) || quantity < 1) return;

    try {
      const res = await fetch(`/api/wishlist/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setToast(`${item.wine.brand} moved to cellar`);
    } catch {
      setToast("Failed to move — try again");
    }
  }

  async function remove(item: WishlistItem) {
    if (!confirm(`Remove ${item.wine.brand} from your wish list?`)) return;
    try {
      const res = await fetch(`/api/wishlist/${item.id}`, { method: "DELETE" });
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
        <div className="flex items-center justify-between">
          <div className="h-8 w-28 animate-pulse bg-gray-200 rounded-lg" />
          <div className="h-9 w-20 animate-pulse bg-gray-200 rounded-xl" />
        </div>
        <div className="h-11 animate-pulse bg-gray-200 rounded-xl" />
        <div className="space-y-3">
          <SkeletonWineCard />
          <SkeletonWineCard />
          <SkeletonWineCard />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Wish List</h1>
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
          <option value="added">Date Added</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        items.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-5xl">💭</p>
            <p className="text-lg text-gray-500">Your wish list is empty</p>
            <Link
              href="/scan"
              className="inline-block rounded-xl bg-rose-600 px-6 py-3 text-white font-semibold hover:bg-rose-700 transition"
            >
              Scan a Wine
            </Link>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No wines match your search</p>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {sorted.map((item) => (
            <SwipeableRow
              key={item.id}
              onSwipeAction={() => remove(item)}
              actionLabel="Remove"
              actionColor="bg-red-500"
            >
              <WineCard
                wine={item.wine}
                extra={
                  <div className="flex items-center gap-3 mt-2" onClick={(e) => e.preventDefault()}>
                    <button
                      onClick={() => moveToInventory(item)}
                      className="text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Move to Inventory
                    </button>
                    <button
                      onClick={() => remove(item)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
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
