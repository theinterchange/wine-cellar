"use client";

import { useEffect, useState } from "react";

interface Wine {
  id: number;
  brand: string;
  varietal: string | null;
  vintage: number | null;
}

interface Friend {
  id: number;
  name: string;
}

interface RecommendModalProps {
  open: boolean;
  onClose: () => void;
  // Pre-select a friend (from friends page) or a wine (from wine detail page)
  preselectedFriend?: Friend | null;
  preselectedWine?: Wine | null;
}

export default function RecommendModal({ open, onClose, preselectedFriend, preselectedWine }: RecommendModalProps) {
  const [wines, setWines] = useState<Wine[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedWine, setSelectedWine] = useState<Wine | null>(preselectedWine || null);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(preselectedFriend || null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!open) return;
    setSelectedWine(preselectedWine || null);
    setSelectedFriend(preselectedFriend || null);
    setMessage("");
    setSearch("");
    setToast("");

    const fetches: Promise<void>[] = [];
    if (!preselectedWine) {
      fetches.push(
        fetch("/api/wines/search?q=")
          .then((r) => r.ok ? r.json() : [])
          .catch(() => [])
          .then((data) => setWines(Array.isArray(data) ? data : []))
      );
    }
    if (!preselectedFriend) {
      fetches.push(
        fetch("/api/friends")
          .then((r) => r.json())
          .then((data) => {
            const accepted = data.filter((f: { status: string }) => f.status === "accepted");
            setFriends(accepted.map((f: { friend: Friend }) => f.friend));
          })
          .catch(() => setFriends([]))
      );
    }
    Promise.all(fetches).then(() => setLoadingData(false));
  }, [open, preselectedWine, preselectedFriend]);

  async function handleSend() {
    if (!selectedWine || !selectedFriend) return;
    setSending(true);
    try {
      const res = await fetch("/api/friends/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: selectedFriend.id,
          wineId: selectedWine.id,
          message: message || null,
        }),
      });
      if (!res.ok) throw new Error();
      setToast("Recommendation sent!");
      setTimeout(() => onClose(), 1200);
    } catch {
      setToast("Failed to send");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  // Filter wines by search
  const filteredWines = wines.filter((w) =>
    w.brand.toLowerCase().includes(search.toLowerCase()) ||
    (w.varietal && w.varietal.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900">Recommend a Wine</h3>

        {/* Friend selection */}
        {!preselectedFriend && (
          <div className="space-y-2">
            <label className="text-xs text-gray-500 font-medium">To</label>
            {selectedFriend ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{selectedFriend.name}</span>
                <button onClick={() => setSelectedFriend(null)} className="text-xs text-gray-400 hover:text-gray-600">Change</button>
              </div>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {friends.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFriend(f)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50 text-sm text-gray-900 transition"
                  >
                    {f.name}
                  </button>
                ))}
                {friends.length === 0 && !loadingData && (
                  <p className="text-sm text-gray-400">No friends yet</p>
                )}
              </div>
            )}
          </div>
        )}

        {preselectedFriend && (
          <p className="text-sm text-gray-500">To: <span className="font-medium text-gray-900">{preselectedFriend.name}</span></p>
        )}

        {/* Wine selection */}
        {!preselectedWine && (
          <div className="space-y-2">
            <label className="text-xs text-gray-500 font-medium">Wine</label>
            {selectedWine ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {selectedWine.brand} {selectedWine.vintage && `(${selectedWine.vintage})`}
                </span>
                <button onClick={() => setSelectedWine(null)} className="text-xs text-gray-400 hover:text-gray-600">Change</button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Search your wines..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-rose-400 outline-none transition"
                />
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {filteredWines.slice(0, 20).map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setSelectedWine(w)}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50 text-sm transition"
                    >
                      <span className="font-medium text-gray-900">{w.brand}</span>
                      <span className="text-gray-400 ml-1.5">
                        {[w.varietal, w.vintage].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {preselectedWine && (
          <p className="text-sm text-gray-500">
            Wine: <span className="font-medium text-gray-900">{preselectedWine.brand}</span>
          </p>
        )}

        {/* Message */}
        <div className="space-y-1">
          <label className="text-xs text-gray-500 font-medium">Message (optional)</label>
          <textarea
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="You have to try this one!"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-rose-400 outline-none transition resize-none"
          />
        </div>

        {toast && <p className="text-sm text-center text-green-600 font-medium">{toast}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !selectedWine || !selectedFriend}
            className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
