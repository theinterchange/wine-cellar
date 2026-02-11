"use client";

import { useEffect, useState, useCallback } from "react";
import WineCard from "@/components/wine-card";
import Link from "next/link";

interface InventoryItem {
  id: number;
  quantity: number;
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

type Category = "ready" | "soon" | "early" | "past";

function categorize(item: InventoryItem): Category {
  const year = new Date().getFullYear();
  const start = item.wine.drinkWindowStart;
  const end = item.wine.drinkWindowEnd;
  if (!start || !end) return "ready";
  if (year < start) return "early";
  if (year > end) return "past";
  if (year === end) return "soon";
  return "ready";
}

export default function DashboardPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    setLoading(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600" />
      </div>
    );
  }

  const ready = items.filter((i) => categorize(i) === "ready");
  const soon = items.filter((i) => categorize(i) === "soon");
  const early = items.filter((i) => categorize(i) === "early");
  const past = items.filter((i) => categorize(i) === "past");

  const uniqueVarietals = new Set(
    items.map((i) => i.wine.varietal?.toLowerCase()).filter(Boolean)
  ).size;

  const sections: { title: string; items: InventoryItem[]; emptyText: string }[] = [
    { title: "Ready to Drink", items: ready, emptyText: "No wines ready right now" },
    { title: "Drink Soon", items: soon, emptyText: "" },
    { title: "Coming Soon", items: early, emptyText: "" },
    { title: "Past Peak", items: past, emptyText: "" },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-white hover:shadow-sm transition"
            title="Refresh"
          >
            ↻
          </button>
          <Link
            href="/scan"
            className="rounded-xl bg-rose-600 px-4 py-2 text-white font-semibold text-sm hover:bg-rose-700 transition"
          >
            Scan Wine
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <p className="text-5xl">🍷</p>
          <p className="text-lg text-gray-500">Your cellar is empty</p>
          <Link
            href="/scan"
            className="inline-block rounded-xl bg-rose-600 px-6 py-3 text-white font-semibold hover:bg-rose-700 transition"
          >
            Scan Your First Bottle
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-rose-600">
                {items.reduce((s, i) => s + i.quantity, 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Total Bottles</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{ready.length + soon.length}</p>
              <p className="text-xs text-gray-400 mt-1">Ready to Drink</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{uniqueVarietals}</p>
              <p className="text-xs text-gray-400 mt-1">Varietals</p>
            </div>
          </div>

          {sections.map(
            (section) =>
              section.items.length > 0 && (
                <div key={section.title} className="space-y-3">
                  <h2 className="text-lg font-semibold text-gray-800">{section.title}</h2>
                  <div className="space-y-2.5">
                    {section.items.map((item) => (
                      <WineCard
                        key={item.id}
                        wine={item.wine}
                        quantity={item.quantity}
                      />
                    ))}
                  </div>
                </div>
              )
          )}
        </>
      )}
    </div>
  );
}
