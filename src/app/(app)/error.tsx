"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-stone-900">Something went wrong</h2>
        <p className="mb-6 text-sm text-stone-500">
          An unexpected error occurred. You can try again or head back to your inventory.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="rounded-xl bg-red-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-900 transition-colors"
          >
            Try Again
          </button>
          <a
            href="/inventory"
            className="rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-200 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
