"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import CreateTabs, { type CreateTab } from "@/components/create/CreateTabs";

export default function CreateModal() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("compose");
  const open = raw != null;
  const [fullscreen, setFullscreen] = useState(false);

  function close() {
    setFullscreen(false);
    const sp = new URLSearchParams(Array.from(params.entries()));
    sp.delete("compose");
    const q = sp.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  useEffect(() => {
    if (!open) { setFullscreen(false); return; }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (fullscreen) setFullscreen(false); else close(); }
      if (e.key === "F11") { e.preventDefault(); setFullscreen((f) => !f); }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fullscreen]);

  if (!open) return null;
  const initial: CreateTab = raw === "post" || raw === "article" ? raw : "video";

  return (
    <div
      className="fixed inset-0 z-[100] bg-ink/70 backdrop-blur-sm"
      onMouseDown={fullscreen ? undefined : close}
    >
      <div
        className={
          fullscreen
            ? "fixed inset-0 z-[101] flex flex-col bg-panel"
            : "relative mx-auto my-4 flex flex-col w-full max-w-3xl rounded-2xl border border-edge bg-panel shadow-2xl overflow-hidden sm:my-8"
        }
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div
          className={[
            "flex shrink-0 items-center justify-between border-b border-edge/40",
            fullscreen ? "px-6 py-3 md:px-10" : "px-5 py-3",
          ].join(" ")}
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-mist/40 select-none">
            Create
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFullscreen((f) => !f)}
              aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen (F11)"}
              className="grid h-9 w-9 place-items-center rounded-full text-mist transition hover:bg-edge/60 hover:text-foam"
            >
              {fullscreen ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3"/>
                  <path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
                  <path d="M3 16h3a2 2 0 0 1 2 2v3"/>
                  <path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8V5a2 2 0 0 1 2-2h3"/>
                  <path d="M16 3h3a2 2 0 0 1 2 2v3"/>
                  <path d="M21 16v3a2 2 0 0 1-2 2h-3"/>
                  <path d="M8 21H5a2 2 0 0 1-2-2v-3"/>
                </svg>
              )}
            </button>
            <button
              onClick={close}
              aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-full text-mist transition hover:bg-edge/60 hover:text-foam"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div
          className={[
            "flex-1 overflow-y-auto",
            fullscreen ? "px-6 py-6 md:px-16 md:py-10 lg:px-32" : "px-5 py-5 sm:px-6",
          ].join(" ")}
        >
          <div className={fullscreen ? "mx-auto max-w-3xl" : ""}>
            <CreateTabs initialTab={initial} />
          </div>
        </div>
      </div>
    </div>
  );
}
