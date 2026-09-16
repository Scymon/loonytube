"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Where the player reports its current position to, so the share sheet can offer
// a "start at" link without lifting player state into the whole watch tree.
let livePosition = 0;
export function reportPlaybackPosition(seconds: number) {
  livePosition = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}
export function readPlaybackPosition() {
  return livePosition;
}

const hhmmss = (total: number) => {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
};

type Target = {
  label: string;
  href: (url: string, title: string) => string;
  path: string;
};

const TARGETS: Target[] = [
  {
    label: "X",
    path: "M18.9 2H22l-7.2 8.2L23.3 22h-6.6l-5.2-6.8L5.6 22H2.5l7.7-8.8L1.9 2h6.8l4.7 6.2zm-1.1 18h1.7L7.4 3.7H5.5z",
    href: (u, t) => `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
  },
  {
    label: "Facebook",
    path: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z",
    href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${u}`,
  },
  {
    label: "Reddit",
    path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm5.2 9.3a1.5 1.5 0 0 1-.7 2.5c0 2.1-2.4 3.7-5.4 3.7s-5.4-1.6-5.4-3.7a1.5 1.5 0 1 1 1.8-2.3 6.9 6.9 0 0 1 3.4-1l.7-3.2 2.6.6a1.2 1.2 0 1 1 .3 1l-1.8-.4-.5 2a6.9 6.9 0 0 1 3.3 1 1.5 1.5 0 0 1 1.7.8z",
    href: (u, t) => `https://www.reddit.com/submit?url=${u}&title=${t}`,
  },
  {
    label: "WhatsApp",
    path: "M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.6 14c-.2.7-1.3 1.3-1.9 1.3-.5 0-1.1.2-3.6-.8-3-1.3-4.9-4.4-5-4.6-.2-.2-1.2-1.6-1.2-3s.8-2.1 1-2.4c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .7.5l.9 2.2c.1.2.1.4 0 .6l-.4.5c-.2.2-.3.4-.1.7.2.3.8 1.4 1.8 2.2 1.2 1.1 2.2 1.4 2.5 1.6.3.1.5.1.7-.1l.8-1c.2-.2.4-.2.6-.1l2 1c.3.1.5.2.5.4z",
    href: (u, t) => `https://wa.me/?text=${t}%20${u}`,
  },
  {
    label: "Email",
    path: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v.5l8 5 8-5V6H4zm16 12V9l-8 5-8-5v9h16z",
    href: (u, t) => `mailto:?subject=${t}&body=${u}`,
  },
];

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // http:// origins and older Safari have no async clipboard.
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mist">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 truncate rounded-lg border border-edge bg-base px-3 py-2 text-sm text-foam focus:border-teal focus:outline-none"
        />
        <button
          type="button"
          onClick={copy}
          aria-live="polite"
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            copied ? "bg-teal/20 text-teal" : "bg-teal text-ink hover:brightness-110"
          }`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export default function ShareModal({
  url,
  title,
  embedId,
  allowTimestamp = false,
  onClose,
}: {
  url: string;
  title: string;
  embedId?: string | null;
  allowTimestamp?: boolean;
  onClose: () => void;
}) {
  // Captured once on open so the number does not drift while the sheet is up.
  const [atSeconds] = useState(() => (allowTimestamp ? Math.floor(readPlaybackPosition()) : 0));
  const [useStamp, setUseStamp] = useState(false);
  const [nativeShare, setNativeShare] = useState(false);

  useEffect(() => {
    setNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const shareUrl = useMemo(() => {
    if (!useStamp || atSeconds <= 0) return url;
    return `${url}${url.includes("?") ? "&" : "?"}t=${atSeconds}`;
  }, [url, useStamp, atSeconds]);

  const embedCode = embedId
    ? `<iframe src="https://iframe.cloudflarestream.com/${embedId}${
        useStamp && atSeconds > 0 ? `?startTime=${atSeconds}s` : ""
      }" style="border:none;width:100%;aspect-ratio:16/9" allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture" allowfullscreen title="${title.replace(/"/g, "&quot;")}"></iframe>`
    : null;

  const encUrl = encodeURIComponent(shareUrl);
  const encTitle = encodeURIComponent(title);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share"
        className="relative z-10 w-full max-w-md rounded-2xl border border-edge bg-panel p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="min-w-0">
            <h2 className="font-bold text-foam">Share</h2>
            <p className="mt-0.5 line-clamp-1 text-sm text-mist">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="ml-3 shrink-0 text-mist hover:text-foam"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 grid grid-cols-5 gap-2">
          {TARGETS.map((t) => (
            <a
              key={t.label}
              href={t.href(encUrl, encTitle)}
              target="_blank"
              rel="noopener noreferrer"
              title={`Share on ${t.label}`}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-edge px-2 py-3 text-mist transition hover:border-foam/40 hover:text-foam"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d={t.path} />
              </svg>
              <span className="text-[10px] font-medium">{t.label}</span>
            </a>
          ))}
        </div>

        {allowTimestamp && atSeconds > 0 && (
          <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-mist">
            <input
              type="checkbox"
              checked={useStamp}
              onChange={(e) => setUseStamp(e.target.checked)}
              className="h-4 w-4 accent-teal"
            />
            Start at <span className="font-semibold text-foam">{hhmmss(atSeconds)}</span>
          </label>
        )}

        <div className="space-y-3">
          <CopyRow label="Link" value={shareUrl} />
          {embedCode && <CopyRow label="Embed code" value={embedCode} />}
        </div>

        {nativeShare && (
          <button
            type="button"
            onClick={() => {
              navigator.share({ title, url: shareUrl }).catch(() => {});
            }}
            className="mt-4 w-full rounded-lg border border-edge py-2 text-sm text-mist transition hover:border-foam/40 hover:text-foam"
          >
            More sharing options…
          </button>
        )}
      </div>
    </div>
  );
}
