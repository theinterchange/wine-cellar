"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import WineCard from "@/components/wine-card";

interface CellarWine {
  id: number;
  brand: string;
  varietal: string | null;
  vintage: number | null;
  region: string | null;
  imageUrl: string | null;
  drinkWindowStart: number | null;
  drinkWindowEnd: number | null;
  estimatedRating: number | null;
  quantity: number;
}

export default function FriendCellarPage() {
  const { id } = useParams();
  const router = useRouter();
  const [friendName, setFriendName] = useState("");
  const [wines, setWines] = useState<CellarWine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/friends/${id}/cellar`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 403 ? "Access denied" : "Failed to load");
        return r.json();
      })
      .then((data) => {
        setFriendName(data.friendName);
        setWines(data.wines);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="h-8 w-48 animate-pulse bg-gray-200 rounded-lg" />
        <div className="h-24 animate-pulse bg-gray-200 rounded-2xl" />
        <div className="h-24 animate-pulse bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-gray-400">{error}</p>
        <button
          onClick={() => router.push("/friends")}
          className="mt-4 text-sm text-rose-600 font-medium"
        >
          Back to Friends
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/friends")} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{friendName}&apos;s Cellar</h1>
      </div>

      {wines.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-12">No wines in cellar</p>
      ) : (
        <div className="space-y-3">
          {wines.map((w) => (
            <WineCard key={w.id} wine={w} quantity={w.quantity} href={null} />
          ))}
        </div>
      )}
    </div>
  );
}
