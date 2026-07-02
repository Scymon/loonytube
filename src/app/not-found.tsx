import Link from "next/link";

// Root 404 page.
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-xs uppercase tracking-wide text-mist">404</p>
      <h1 className="mt-2 text-xl font-bold text-foam">This page doesn&apos;t exist</h1>
      <p className="mt-2 max-w-md text-sm text-mist">
        The link may be broken, or the page may have been removed.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-[10px] px-5 py-2.5 text-sm font-bold text-ink"
        style={{ backgroundImage: "var(--lt-grad-primary)" }}
      >
        Back to home
      </Link>
    </div>
  );
}
