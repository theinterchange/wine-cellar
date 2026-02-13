"use client";

import { signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const mainTabs = new Set(["/dashboard", "/scan", "/inventory", "/wishlist"]);
  const showBack = !mainTabs.has(pathname);

  return (
    <header className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center justify-between relative">
        {showBack ? (
          <>
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
            >
              ← Back
            </button>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight absolute left-1/2 -translate-x-1/2">
              Optimal Wine Time
            </h1>
          </>
        ) : (
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">Optimal Wine Time</h1>
        )}
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
