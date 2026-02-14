"use client";

import { useEffect, useState, useCallback, useMemo, useDeferredValue } from "react";
import WineCard from "@/components/wine-card";
import SwipeableRow from "@/components/swipeable-row";
import { SkeletonWineCard } from "@/components/skeleton";

interface ConsumedItem {
  id: number;
  rating: number | null;
  notes: string | null;
  consumedAt: string;
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

type SortOption = "name" | "rating" | "date";

function sortItems(items: ConsumedItem[], sort: SortOption): ConsumedItem[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case "name":
        return a.wine.brand.localeCompare(b.wine.brand);
      case "rating":
        return (b.rating ?? -1) - (a.rating ?? -1);
      case "date":
        return (b.consumedAt ?? "").localeCompare(a.consumedAt ?? "");
      default:
        return 0;
    }
  });
}

export default function ConsumedPage() {
  const [items, setItems] = useState<ConsumedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<SortOption>("date");
  const [toast, setToast] = useState<string | null>(null);
  const deferredFilter = useDeferredValue(filter);

  // Rating modal state
  const [ratingItem, setRatingItem] = useState<ConsumedItem | null>(null);
  const [ratingValue, setRatingValue] = useState("");
  const [ratingNotes, setRatingNotes] = useState("");
  const [savingRating, setSavingRating] = useState(false);

  const loadData = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    fetch("/api/consumed")
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

  const sorted = useMemo(() => {
    const filtered = items.filter((item) => {
      if (!deferredFilter) return true;
      const q = deferredFilter.toLowerCase();
      return (
        item.wine.brand.toLowerCase().includes(q) ||
        (item.wine.varietal?.toLowerCase().includes(q) ?? false) ||
        (item.wine.region?.toLowerCase().includes(q) ?? false) ||
        (item.wine.vintage != null && String(item.wine.vintage).includes(q))
      );
    });
    return sortItems(filtered, sort);
  }, [items, deferredFilter, sort]);

  async function deleteItem(item: ConsumedItem) {
    if (!confirm(`Remove ${item.wine.brand} from consumed?`)) return;
    try {
      const res = await fetch(`/api/consumed/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setToast(`${item.wine.brand} removed`);
    } catch {
      setToast("Failed to remove — try again");
    }
  }

  function openRating(item: ConsumedItem) {
    setRatingItem(item);
    setRatingValue(item.rating != null ? String(item.rating) : "");
    setRatingNotes(item.notes ?? "");
  }

  async function saveRating() {
    if (!ratingItem) return;
    setSavingRating(true);
    try {
      const body: Record<string, unknown> = {
        rating: ratingValue ? parseInt(ratingValue) : null,
        notes: ratingNotes || null,
      };
      const res = await fetch(`/api/consumed/${ratingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setItems((prev) =>
        prev.map((i) =>
          i.id === ratingItem.id
            ? { ...i, rating: body.rating as number | null, notes: body.notes as string | null }
            : i
        )
      );
      setRatingItem(null);
      setToast("Rating saved");
    } catch {
      setToast("Failed to save — try again");
    } finally {
      setSavingRating(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="h-8 w-32 animate-pulse bg-gray-200 rounded-lg" />
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
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Consumed</h1>

      <input
        type="text"
        placeholder="Search name, grape, region, year..."
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
          <option value="date">Date Consumed</option>
          <option value="name">Name A-Z</option>
          <option value="rating">Rating</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-5xl">🥂</p>
          <p className="text-lg text-gray-500">
            {items.length === 0 ? "No wines consumed yet" : "No wines match your search"}
          </p>
          {items.length === 0 && (
            <p className="text-sm text-gray-400">
              Open a wine from your cellar and tap &quot;Drink One&quot;
            </p>
          )}
        </div>
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
                extra={
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      {item.wine.estimatedRating != null && (
                        <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                          AI: {item.wine.estimatedRating}
                        </span>
                      )}
                      {item.rating != null ? (
                        <button
                          onClick={(e) => { e.preventDefault(); openRating(item); }}
                          className="text-xs font-semibold text-rose-600 bg-rose-50 rounded-full px-2.5 py-0.5 hover:bg-rose-100 transition"
                        >
                          My: {item.rating}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.preventDefault(); openRating(item); }}
                          className="text-xs font-medium text-rose-600 bg-rose-50 rounded-full px-2.5 py-0.5 hover:bg-rose-100 transition"
                        >
                          Rate
                        </button>
                      )}
                      <span className="text-[10px] text-gray-400">
                        {new Date(item.consumedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-xs text-gray-500 line-clamp-2">{item.notes}</p>
                    )}
                  </div>
                }
              />
            </SwipeableRow>
          ))}
        </div>
      )}

      {/* Rating modal */}
      {ratingItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setRatingItem(null)}>
          <div
            className="bg-white rounded-t-3xl w-full max-w-lg p-6 space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900">Rate &amp; Note</h3>
            <p className="text-sm text-gray-500">{ratingItem.wine.brand}</p>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">Rating (0-100)</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                value={ratingValue}
                onChange={(e) => setRatingValue(e.target.value)}
                placeholder="e.g. 88"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">Notes</label>
              <textarea
                rows={3}
                value={ratingNotes}
                onChange={(e) => setRatingNotes(e.target.value)}
                placeholder="How was it?"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRatingItem(null)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveRating}
                disabled={savingRating}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition"
              >
                {savingRating ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
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
