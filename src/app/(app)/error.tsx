"use client";

// Route-level error boundary for all (app) pages. Keeps the nav; offers retry.
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-xs uppercase tracking-wide text-mist">Something went wrong</p>
      <h1 className="mt-2 text-xl font-bold text-foam">This page hit an error</h1>
      <p className="mt-2 max-w-md text-sm text-mist">
        Try again — if it keeps happening, head back home and let us know.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-[10px] px-5 py-2.5 text-sm font-bold text-ink"
          style={{ backgroundImage: "var(--lt-grad-primary)" }}
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-[10px] border border-edge bg-surface px-5 py-2.5 text-sm font-semibold text-foam hover:bg-edge/40"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
