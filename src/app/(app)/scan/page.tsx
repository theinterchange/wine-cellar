"use client";

import { useState } from "react";
import CameraCapture from "@/components/camera-capture";
import ScanResults from "@/components/scan-results";

export default function ScanPage() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | {
    id: number;
    brand: string;
    varietal: string | null;
    vintage: number | null;
    region: string | null;
    drinkWindowStart: number;
    drinkWindowEnd: number;
    estimatedRating: number;
    ratingNotes: string;
    imageUrl: string;
  }>(null);
  const [error, setError] = useState("");

  async function handleAnalyze() {
    if (!image) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/wines/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });

      if (!res.ok) throw new Error("Analysis failed");

      const data = await res.json();
      setResult(data);
    } catch {
      setError("Failed to analyze the wine label. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Scan Wine Label</h1>

      {!result ? (
        <>
          <CameraCapture onCapture={setImage} />

          {image && (
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full rounded-lg bg-purple-600 px-4 py-3 text-white font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing label...
                </span>
              ) : (
                "Analyze Label"
              )}
            </button>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}
        </>
      ) : (
        <ScanResults result={result} />
      )}
    </div>
  );
}
