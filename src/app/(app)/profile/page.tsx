"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";

interface Stats {
  cellar: {
    totalBottles: number;
    totalWines: number;
    varietalBreakdown: { varietal: string; count: number }[];
  };
  consumed: {
    totalConsumed: number;
    averageRating: number;
    consumedByVarietal: { varietal: string; count: number }[];
  };
  milestones: {
    key: string;
    label: string;
    description: string;
    threshold: number;
    achieved: boolean;
  }[];
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="h-8 w-32 animate-pulse bg-gray-200 rounded-lg" />
        <div className="h-24 animate-pulse bg-gray-200 rounded-2xl" />
        <div className="h-24 animate-pulse bg-gray-200 rounded-2xl" />
        <div className="h-40 animate-pulse bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Profile</h1>
        {session?.user?.name && (
          <p className="text-sm text-gray-500 mt-0.5">{session.user.name}</p>
        )}
      </div>

      {stats && (
        <>
          {/* Cellar overview */}
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Cellar</h2>
            <div className="flex justify-around">
              <div className="text-center">
                <p className="text-2xl font-bold text-rose-600">{stats.cellar.totalBottles}</p>
                <p className="text-xs text-gray-400">Bottles</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.cellar.totalWines}</p>
                <p className="text-xs text-gray-400">Wines</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.cellar.varietalBreakdown.length}</p>
                <p className="text-xs text-gray-400">Varietals</p>
              </div>
            </div>
            {stats.cellar.varietalBreakdown.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {stats.cellar.varietalBreakdown.slice(0, 8).map((v) => (
                  <span key={v.varietal} className="px-2.5 py-1 bg-gray-50 text-gray-600 rounded-full text-xs">
                    {v.varietal} ({v.count})
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Consumed overview */}
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Consumed</h2>
            <div className="flex justify-around">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.consumed.totalConsumed}</p>
                <p className="text-xs text-gray-400">Wines Enjoyed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-rose-600">
                  {stats.consumed.averageRating > 0 ? stats.consumed.averageRating : "—"}
                </p>
                <p className="text-xs text-gray-400">Avg Rating</p>
              </div>
            </div>
            {stats.consumed.consumedByVarietal.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {stats.consumed.consumedByVarietal.slice(0, 8).map((v) => (
                  <span key={v.varietal} className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs">
                    {v.varietal} ({v.count})
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Milestones */}
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Milestones</h2>
            <div className="space-y-2">
              {stats.milestones.map((m) => (
                <div
                  key={m.key}
                  className={`flex items-center gap-3 p-3 rounded-xl transition ${
                    m.achieved ? "bg-amber-50" : "bg-gray-50 opacity-50"
                  }`}
                >
                  <span className="text-xl">{m.achieved ? "🏆" : "🔒"}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${m.achieved ? "text-gray-900" : "text-gray-500"}`}>
                      {m.label}
                    </p>
                    <p className="text-xs text-gray-400">{m.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition"
      >
        Sign Out
      </button>
    </div>
  );
}
