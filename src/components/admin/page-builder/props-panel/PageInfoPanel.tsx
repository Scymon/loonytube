"use client";

export type PageInfoPanelProps = {
  title: string;
  setTitle: (v: string) => void;
  slug: string;
  isPublished: boolean;
  setIsPublished: (v: boolean) => void;
  onSaveMeta: (
    field: "title" | "is_published" | "description" | "og_image_url",
    value: string | boolean
  ) => void;
  blockCount: number;
  hasDraft: boolean;
  publishing: boolean;
  onPublish: () => void;
  onDiscard: () => void;
  revisions: { id: string; saved_at: string }[];
  onRestore: (revisionId: string) => void;
  description: string;
  setDescription: (v: string) => void;
  ogImage: string;
  setOgImage: (v: string) => void;
};

// Right-hand panel shown when no block is selected: page meta + visibility.
export default function PageInfoPanel({
  title, setTitle, slug, isPublished, setIsPublished, onSaveMeta, blockCount,
  hasDraft, publishing, onPublish, onDiscard, revisions, onRestore,
  description, setDescription, ogImage, setOgImage,
}: PageInfoPanelProps) {
  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-edge bg-surface">
      <div className="flex items-center gap-2 border-b border-edge px-4 py-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-mist/50 shrink-0">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
        <p className="text-xs font-semibold text-foam">Page</p>
        <span className="ml-auto text-[10px] text-mist/40 tabular-nums">
          {blockCount} block{blockCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Page info */}
        <div className="border-b border-edge/50 pb-5 space-y-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-mist/50">Page info</p>

          <div className="space-y-1.5">
            <label className="block text-[10px] text-mist/70">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => onSaveMeta("title", title)}
              className="lt-input w-full text-xs"
              placeholder="Page title"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] text-mist/70">URL</label>
            <div className="flex items-center gap-1 rounded-lg border border-edge/50 bg-panel/50 px-3 py-1.5">
              <span className="text-[10px] text-mist/40 shrink-0">/p/</span>
              <span className="text-xs text-mist font-mono truncate">{slug}</span>
              <a
                href={`/p/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto shrink-0 text-[11px] text-sky/70 hover:text-sky transition-colors"
              >
                ↗
              </a>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] text-mist/70">SEO description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => onSaveMeta("description", description)}
              rows={3}
              maxLength={300}
              className="lt-input w-full text-xs leading-relaxed"
              placeholder="Shown in search results and link previews"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] text-mist/70">Social image URL</label>
            <input
              value={ogImage}
              onChange={(e) => setOgImage(e.target.value)}
              onBlur={() => onSaveMeta("og_image_url", ogImage)}
              className="lt-input w-full text-xs"
              placeholder="https://… (og:image)"
            />
          </div>
        </div>

        {/* Visibility */}
        <div className="border-b border-edge/50 pb-5 space-y-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-mist/50">Visibility</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-mist">Published</span>
            <button
              role="switch"
              aria-checked={isPublished}
              onClick={() => {
                const next = !isPublished;
                setIsPublished(next);
                onSaveMeta("is_published", next);
              }}
              className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 transition-colors ${
                isPublished ? "bg-teal border-teal" : "bg-panel border-edge"
              }`}
            >
              <span className={`inline-block h-3 w-3 mt-0.5 rounded-full bg-white shadow transition-transform ${
                isPublished ? "translate-x-4" : "translate-x-0.5"
              }`} />
            </button>
          </div>
          <p className={`text-[10px] transition-colors ${isPublished ? "text-teal" : "text-mist/30"}`}>
            {isPublished ? `Live at /p/${slug}` : "Not published"}
          </p>
        </div>

        {/* Draft / publish */}
        <div className="border-b border-edge/50 pb-5 space-y-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-mist/50">Changes</p>
          {hasDraft ? (
            <>
              <p className="flex items-center gap-1.5 text-[11px] text-yellow-500">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                Unpublished changes
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onPublish}
                  disabled={publishing}
                  className="flex-1 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-ink transition hover:brightness-110 disabled:opacity-50"
                >
                  {publishing ? "Publishing…" : "Publish changes"}
                </button>
                <button
                  onClick={onDiscard}
                  disabled={publishing}
                  className="rounded-lg border border-edge px-3 py-1.5 text-xs text-mist transition hover:border-loonred/50 hover:text-loonred disabled:opacity-50"
                >
                  Discard
                </button>
              </div>
              <p className="text-[10px] text-mist/40 leading-snug">
                Edits autosave as a draft. The live page updates only when you publish.
              </p>
            </>
          ) : (
            <p className="flex items-center gap-1.5 text-[11px] text-mist/50">
              <span className="h-1.5 w-1.5 rounded-full bg-teal/60" />
              Everything is published
            </p>
          )}
        </div>

        {/* Revisions */}
        <div className="border-b border-edge/50 pb-5 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-mist/50">Revisions</p>
          {revisions.length === 0 ? (
            <p className="text-[10px] text-mist/40">Publishing snapshots a revision here.</p>
          ) : (
            <ul className="space-y-1">
              {revisions.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-mist tabular-nums">
                    {new Date(r.saved_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                  <button
                    onClick={() => onRestore(r.id)}
                    className="text-[11px] text-sky/70 transition-colors hover:text-sky"
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-mist/50">Content</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-edge/50 bg-panel/40 p-3 text-center">
              <p className="text-2xl font-bold text-foam tabular-nums">{blockCount}</p>
              <p className="text-[10px] text-mist/50 mt-0.5">Blocks</p>
            </div>
            <div className="rounded-xl border border-edge/50 bg-panel/40 p-3 flex items-center justify-center">
              <p className="text-[10px] text-mist/40 text-center leading-snug">
                Select a block<br/>to edit its props
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
