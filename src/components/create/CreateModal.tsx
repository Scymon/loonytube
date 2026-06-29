"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import CreateTabs, { type CreateTab } from "@/components/create/CreateTabs";

export default function CreateModal() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("compose");
  const open = raw != null;

  function close() {
    const sp = new URLSearchParams(Array.from(params.entries()));
    sp.delete("compose");
    const q = sp.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  const initial: CreateTab = raw === "post" || raw === "article" ? raw : "video";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-ink/70 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={close}
    >
      <div
        className="relative my-4 w-full max-w-3xl rounded-2xl border border-edge bg-panel p-6 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full text-mist hover:bg-edge/60 hover:text-foam"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18"/>
          </svg>
        </button>
        <CreateTabs initialTab={initial} />
      </div>
    </div>
  );
}
