"use client";

import { useRef } from "react";

const FILM_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M7 6V4M12 6V4M17 6V4M7 18v2M12 18v2M17 18v2" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
);

interface ThumbnailPickerProps {
  // 3 suggestion sources — null = spinner, "" = empty box, URL = image
  suggestions: [string | null, string | null, string | null];
  selectedPane: 0 | 1 | 2 | null;
  onSelectPane: (i: 0 | 1 | 2) => void;
  // Pane 4: film-icon scrubber toggle
  showScrubber: boolean;
  onToggleScrubber: () => void;
  scrubberEnabled: boolean;
  // Content rendered inside the 16:9 preview container.
  // Pass null to hide the container (e.g. before a file is selected).
  previewContent: React.ReactNode | null;
  // Content rendered inside the scrubber panel (shown when showScrubber=true).
  scrubberContent: React.ReactNode | null;
  busy?: boolean;
  onFileSelect: (file: File) => void;
  // Hint text shown below panes when suggestions are not yet available
  emptyHint?: string;
}

export function ThumbnailPicker({
  suggestions, selectedPane, onSelectPane,
  showScrubber, onToggleScrubber, scrubberEnabled,
  previewContent, scrubberContent,
  busy, onFileSelect, emptyHint,
}: ThumbnailPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      {/* ── Suggestion panes + film icon ──────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {([0, 1, 2] as const).map((i) => {
          const src = suggestions[i];
          const sel = selectedPane === i && !showScrubber;
          return (
            <button
              key={i}
              type="button"
              onClick={() => !busy && !!src && onSelectPane(i)}
              disabled={busy || !src}
              className={`group relative aspect-video overflow-hidden rounded-lg border-2 bg-surface transition ${
                sel ? "border-sky" : "border-edge hover:border-hair"
              } disabled:cursor-default`}
            >
              {src === null ? (
                /* loading */
                <div className="grid h-full w-full place-items-center">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-edge border-t-mist" />
                </div>
              ) : src === "" ? (
                /* empty / not-applicable */
                <div className="h-full w-full" />
              ) : (
                /* image */
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  {sel && (
                    <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky">
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white"
                        strokeWidth="2.2" strokeLinecap="round">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}

        {/* Pane 4: film icon — toggle only, never a selected state */}
        <button
          type="button"
          onClick={onToggleScrubber}
          disabled={!scrubberEnabled}
          title="Pick a custom frame"
          className={`group relative aspect-video overflow-hidden rounded-lg border-2 bg-surface transition ${
            showScrubber ? "border-sky" : "border-edge hover:border-hair"
          } disabled:cursor-default disabled:opacity-40`}
        >
          <div className="grid h-full w-full place-items-center text-mist group-hover:text-foam">
            {FILM_ICON}
          </div>
        </button>
      </div>

      {/* ── Hint below panes ──────────────────────────────────────────── */}
      {emptyHint && !suggestions.some(Boolean) && (
        <p className="mt-1.5 text-xs text-mist">{emptyHint}</p>
      )}

      {/* ── Large 16:9 preview ────────────────────────────────────────── */}
      {previewContent !== null && (
        <div
          className="relative mt-3 w-full overflow-hidden rounded-xl border border-edge bg-black"
          style={{ aspectRatio: "16/9" }}
        >
          {previewContent}
        </div>
      )}

      {/* ── Scrubber controls ─────────────────────────────────────────── */}
      {showScrubber && scrubberContent && (
        <div className="mt-2 space-y-2 rounded-xl border border-sky/30 bg-surface p-3">
          {scrubberContent}
        </div>
      )}

      {/* ── Custom image upload ───────────────────────────────────────── */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="mt-2 text-xs text-mist hover:text-foam disabled:opacity-50"
      >
        + Upload custom image
      </button>
    </div>
  );
}
