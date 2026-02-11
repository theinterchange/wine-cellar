"use client";

import { signOut } from "next-auth/react";

export default function NavBar() {
  return (
    <header className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">Optimal Wine Time</h1>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
