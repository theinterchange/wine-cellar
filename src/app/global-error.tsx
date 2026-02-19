"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-stone-50">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-stone-900">Something went wrong</h2>
            <p className="mb-6 text-sm text-stone-500">
              An unexpected error occurred. Please try again.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={reset}
                style={{
                  backgroundColor: "#991b1b",
                  color: "white",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Try Again
              </button>
              <a
                href="/inventory"
                style={{
                  backgroundColor: "#f5f5f4",
                  color: "#44403c",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: 500,
                  textDecoration: "none",
                  display: "block",
                }}
              >
                Go Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
