"use client";

// Right toolbar group: live link, visibility toggle, preview switch.
export default function PublishTools({
  slug, isPublished, onTogglePublished, preview, onTogglePreview,
}: {
  slug: string;
  isPublished: boolean;
  onTogglePublished: () => void;
  preview: boolean;
  onTogglePreview: () => void;
}) {
  return (
    <>
      <a
        href={`/p/${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden sm:inline text-xs text-mist hover:text-sky transition-colors"
      >
        /p/{slug}&nbsp;↗
      </a>

      <label className="flex cursor-pointer items-center gap-2 select-none">
        <span className="text-xs text-mist">Published</span>
        <span
          role="checkbox"
          aria-checked={isPublished}
          onClick={onTogglePublished}
          className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 transition-colors ${
            isPublished ? "bg-teal border-teal" : "bg-panel border-edge"
          }`}
        >
          <span className={`inline-block h-3 w-3 mt-0.5 rounded-full bg-white shadow transition-transform ${
            isPublished ? "translate-x-4" : "translate-x-0.5"
          }`} />
        </span>
      </label>

      <button
        onClick={onTogglePreview}
        title="Preview (Cmd+P)"
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
          preview
            ? "bg-teal text-ink hover:brightness-110"
            : "border border-edge text-mist hover:border-foam hover:text-foam"
        }`}
      >
        {preview ? "← Edit" : "Preview"}
      </button>
    </>
  );
}
