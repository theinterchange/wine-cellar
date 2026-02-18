"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RecommendModal from "@/components/recommend-modal";

interface Friend {
  id: number;
  status: "pending" | "accepted";
  direction: "sent" | "received";
  friend: { id: number; name: string; email: string };
  iShareMyCellar: boolean;
  theyShareTheirCellar: boolean;
}

interface Recommendation {
  id: number;
  message: string | null;
  fromUserName: string;
  createdAt: string;
  wineId: number;
  brand: string;
  varietal: string | null;
  vintage: number | null;
  region: string | null;
  imageUrl: string | null;
  estimatedRating: number | null;
  designation: string | null;
  marketPrice: string | null;
}

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [recommendFriend, setRecommendFriend] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/friends").then((r) => r.json()),
      fetch("/api/friends/recommend").then((r) => r.json()),
    ]).then(([friendsData, recsData]) => {
      setFriends(friendsData);
      setRecommendations(recsData);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function sendRequest() {
    if (!searchEmail.trim()) return;
    setSearching(true);
    try {
      await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: searchEmail.trim() }),
      });
      setToast("Request sent");
      setSearchEmail("");
      // Refresh friends list
      const res = await fetch("/api/friends");
      setFriends(await res.json());
    } catch {
      setToast("Failed to send request");
    } finally {
      setSearching(false);
    }
  }

  async function respondToRequest(friendshipId: number, action: "accept" | "decline") {
    try {
      await fetch(`/api/friends/${friendshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setToast(action === "accept" ? "Friend added!" : "Request declined");
      const res = await fetch("/api/friends");
      setFriends(await res.json());
    } catch {
      setToast("Failed — try again");
    }
  }

  async function unfriend(friendshipId: number) {
    if (!confirm("Remove this friend? This also revokes cellar sharing.")) return;
    try {
      await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
      setFriends(friends.filter((f) => f.id !== friendshipId));
      setToast("Friend removed");
    } catch {
      setToast("Failed — try again");
    }
  }

  async function toggleShare(friendId: number, currently: boolean) {
    try {
      await fetch("/api/friends/share", {
        method: currently ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId }),
      });
      setFriends(
        friends.map((f) =>
          f.friend.id === friendId ? { ...f, iShareMyCellar: !currently } : f
        )
      );
    } catch {
      setToast("Failed — try again");
    }
  }

  async function handleInvite() {
    setInviting(true);
    try {
      const res = await fetch("/api/friends/invite", { method: "POST" });
      const { invite } = await res.json();
      const url = `${window.location.origin}/invite/${invite.code}`;

      if (navigator.share) {
        await navigator.share({ title: "Join me on WineTime!", url });
      } else {
        await navigator.clipboard.writeText(url);
        setToast("Invite link copied!");
      }
    } catch {
      setToast("Failed to create invite");
    } finally {
      setInviting(false);
    }
  }

  async function addToWishlist(wineId: number) {
    try {
      await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wineId }),
      });
      setToast("Added to wish list!");
    } catch {
      setToast("Failed — try again");
    }
  }

  const pendingReceived = friends.filter((f) => f.status === "pending" && f.direction === "received");
  const pendingSent = friends.filter((f) => f.status === "pending" && f.direction === "sent");
  const accepted = friends.filter((f) => f.status === "accepted");

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="h-8 w-32 animate-pulse bg-gray-200 rounded-lg" />
        <div className="h-20 animate-pulse bg-gray-200 rounded-2xl" />
        <div className="h-20 animate-pulse bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Friends</h1>
        <button
          onClick={handleInvite}
          disabled={inviting}
          className="rounded-xl bg-rose-600 px-4 py-2 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 transition"
        >
          Invite
        </button>
      </div>

      {/* Email search */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Add Friend</h2>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="friend@email.com"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendRequest()}
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition"
          />
          <button
            onClick={sendRequest}
            disabled={searching || !searchEmail.trim()}
            className="rounded-xl bg-gray-900 px-4 py-2.5 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition"
          >
            Send
          </button>
        </div>
      </div>

      {/* Pending received */}
      {pendingReceived.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500">Pending Requests</h2>
          {pendingReceived.map((f) => (
            <div key={f.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{f.friend.name}</p>
                <p className="text-xs text-gray-400">{f.friend.email}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => respondToRequest(f.id, "accept")}
                  className="rounded-xl bg-green-600 px-3 py-1.5 text-white text-xs font-semibold hover:bg-green-700 transition"
                >
                  Accept
                </button>
                <button
                  onClick={() => respondToRequest(f.id, "decline")}
                  className="rounded-xl border border-gray-200 px-3 py-1.5 text-gray-500 text-xs font-semibold hover:bg-gray-50 transition"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending sent */}
      {pendingSent.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500">Sent Requests</h2>
          {pendingSent.map((f) => (
            <div key={f.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{f.friend.name}</p>
                <p className="text-xs text-gray-400">Pending</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      {accepted.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500">Friends</h2>
          {accepted.map((f) => (
            <div key={f.id} className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{f.friend.name}</p>
                  <p className="text-xs text-gray-400">{f.friend.email}</p>
                </div>
                <button
                  onClick={() => unfriend(f.id)}
                  className="text-xs text-gray-400 hover:text-red-500 transition"
                >
                  Remove
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => toggleShare(f.friend.id, f.iShareMyCellar)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    f.iShareMyCellar
                      ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                      : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {f.iShareMyCellar ? "Sharing my cellar" : "Share my cellar"}
                </button>
                {f.theyShareTheirCellar && (
                  <button
                    onClick={() => router.push(`/friends/${f.friend.id}/cellar`)}
                    className="rounded-xl bg-purple-100 text-purple-700 px-3 py-1.5 text-xs font-semibold hover:bg-purple-200 transition"
                  >
                    View Cellar
                  </button>
                )}
                <button
                  onClick={() => setRecommendFriend({ id: f.friend.id, name: f.friend.name })}
                  className="rounded-xl border border-gray-200 text-gray-500 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 transition"
                >
                  Recommend
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {accepted.length === 0 && pendingReceived.length === 0 && pendingSent.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">No friends yet. Send an invite or add by email!</p>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500">Recommendations</h2>
          {recommendations.map((rec) => (
            <div key={rec.id} className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
              <div className="flex items-start gap-3">
                {rec.imageUrl && (
                  <img
                    src={rec.imageUrl}
                    alt={rec.brand}
                    className="w-12 h-12 object-contain rounded-lg bg-gray-50"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{rec.brand}</p>
                  <p className="text-xs text-gray-400">
                    {[rec.varietal, rec.vintage, rec.region].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    From <span className="font-medium">{rec.fromUserName}</span>
                  </p>
                </div>
                {rec.estimatedRating && (
                  <span className="text-sm font-bold text-rose-600">{rec.estimatedRating}</span>
                )}
              </div>
              {rec.message && (
                <p className="text-sm text-gray-600 italic">&ldquo;{rec.message}&rdquo;</p>
              )}
              <button
                onClick={() => addToWishlist(rec.wineId)}
                className="w-full rounded-xl border border-rose-200 px-3 py-2 text-rose-600 text-xs font-semibold hover:bg-rose-50 transition"
              >
                Add to Wish List
              </button>
            </div>
          ))}
        </div>
      )}

      <RecommendModal
        open={!!recommendFriend}
        onClose={() => setRecommendFriend(null)}
        preselectedFriend={recommendFriend}
      />

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-2xl text-sm shadow-lg toast-animate z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
