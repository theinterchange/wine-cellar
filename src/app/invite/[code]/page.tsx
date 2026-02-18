"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SessionProvider } from "next-auth/react";

function InviteContent() {
  const { code } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [inviterName, setInviterName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetch(`/api/friends/invite/${code}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 410 ? "This invite has expired or already been used." : "Invite not found.");
        return r.json();
      })
      .then((data) => {
        setInviterName(data.inviterName);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [code]);

  async function acceptInvite() {
    setAccepting(true);
    try {
      const res = await fetch(`/api/friends/invite/${code}`, { method: "POST" });
      if (!res.ok) throw new Error();
      router.push("/friends");
    } catch {
      setError("Failed to accept invite. Please try again.");
      setAccepting(false);
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center space-y-4">
          <p className="text-gray-500">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-rose-600 font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{inviterName} wants to connect!</h1>
          <p className="text-sm text-gray-500">Sign up or log in to become friends on WineTime.</p>
          <button
            onClick={() => router.push(`/login?invite=${code}`)}
            className="w-full rounded-xl bg-rose-600 px-4 py-3 text-white font-semibold text-sm hover:bg-rose-700 transition"
          >
            Sign Up to Connect
          </button>
        </div>
      </div>
    );
  }

  // Logged in
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{inviterName} wants to connect!</h1>
        <p className="text-sm text-gray-500">Accept to become friends and share wine recommendations.</p>
        <button
          onClick={acceptInvite}
          disabled={accepting}
          className="w-full rounded-xl bg-rose-600 px-4 py-3 text-white font-semibold text-sm hover:bg-rose-700 disabled:opacity-50 transition"
        >
          {accepting ? "Accepting..." : "Accept"}
        </button>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <SessionProvider>
      <InviteContent />
    </SessionProvider>
  );
}
