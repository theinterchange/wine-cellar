"use client";

import { useState } from "react";
import CameraCapture from "@/components/camera-capture";
import ScanResults from "@/components/scan-results";

interface ScanResultData {
  id: number;
  brand: string;
  varietal: string | null;
  vintage: number | null;
  region: string | null;
  drinkWindowStart: number;
  drinkWindowEnd: number;
  estimatedRating: number;
  ratingNotes: string;
  designation: string | null;
  foodPairings: string | null;
  marketPrice: string | null;
  imageUrl: string;
}

function isSparse(result: ScanResultData): boolean {
  const fields = [result.varietal, result.vintage, result.region, result.designation];
  const nullCount = fields.filter((f) => f === null || f === undefined).length;
  return nullCount >= 3;
}

export default function ScanPage() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResultData | null>(null);
  const [error, setError] = useState("");

  // Back label flow
  const [showBackLabelPrompt, setShowBackLabelPrompt] = useState(false);
  const [scanningBackLabel, setScanningBackLabel] = useState(false);
  const [backLabelWineId, setBackLabelWineId] = useState<number | null>(null);

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

      // Check if result is sparse → offer back label scan
      if (isSparse(data)) {
        setBackLabelWineId(data.id);
        setShowBackLabelPrompt(true);
        setResult(data);
      } else {
        setResult(data);
      }
    } catch {
      setError("Failed to analyze the wine label. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleScanBackLabel() {
    // Reset camera for back label, keep wine ID
    setImage(null);
    setScanningBackLabel(true);
    setShowBackLabelPrompt(false);
  }

  async function handleAnalyzeBackLabel() {
    if (!image || !backLabelWineId) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/wines/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, mergeWith: backLabelWineId }),
      });

      if (!res.ok) throw new Error("Analysis failed");

      const data = await res.json();
      setResult(data);
      setScanningBackLabel(false);
      setShowBackLabelPrompt(false);
    } catch {
      setError("Failed to analyze the back label. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSkipBackLabel() {
    setShowBackLabelPrompt(false);
  }

  // Show results (with possible back-label prompt banner)
  if (result && !scanningBackLabel) {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {showBackLabelPrompt && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <p className="text-sm text-amber-800 font-medium">
              We couldn&apos;t read much from the front label. Try scanning the back label for more details.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleScanBackLabel}
                className="flex-1 rounded-lg bg-amber-600 px-3 py-2 text-white text-sm font-medium hover:bg-amber-700 transition"
              >
                Scan Back Label
              </button>
              <button
                onClick={handleSkipBackLabel}
                className="flex-1 rounded-lg border border-amber-300 px-3 py-2 text-amber-700 text-sm font-medium hover:bg-amber-100 transition"
              >
                Skip
              </button>
            </div>
          </div>
        )}
        <ScanResults result={result} />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {scanningBackLabel && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-sm text-blue-800 font-medium">
            Now scan the back label to fill in missing details.
          </p>
        </div>
      )}

      <CameraCapture onCapture={setImage} />

      {image && (
        <button
          onClick={scanningBackLabel ? handleAnalyzeBackLabel : handleAnalyze}
          disabled={loading}
          className="w-full rounded-lg bg-purple-600 px-4 py-3 text-white font-medium hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {scanningBackLabel ? "Analyzing back label..." : "Analyzing label..."}
            </span>
          ) : (
            scanningBackLabel ? "Analyze Back Label" : "Analyze Label"
          )}
        </button>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
      )}
    </div>
  );
}
