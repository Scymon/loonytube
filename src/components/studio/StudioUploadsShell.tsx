"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ContentTable, { type Row } from "@/components/studio/ContentTable";
import VideoComposer from "@/components/create/VideoComposer";
import { ProcessingToast } from "@/components/ProcessingToast";

export default function StudioUploadsShell({ initial }: { initial: Row[] }) {
  const [view, setView] = useState<"list" | "upload">("list");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const router = useRouter();

  function goToList() {
    setView("list");
    // Re-run the server component so the table picks up any newly uploaded video
    router.refresh();
  }

  if (view === "upload") {
    return (
      <div>
        <button
          onClick={goToList}
          className="mb-5 flex items-center gap-1.5 text-sm font-semibold text-mist hover:text-foam"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to uploads
        </button>
        <VideoComposer onComplete={(id) => { setProcessingId(id); goToList(); }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Channel content</h1>
          <p className="mt-1 text-sm text-mist">Edit titles, descriptions, visibility, and release schedule.</p>
        </div>
        <button
          onClick={() => setView("upload")}
          className="shrink-0 rounded-[10px] px-4 py-2.5 text-sm font-bold text-ink"
          style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}
        >
          + Upload video
        </button>
      </div>
      <div className="mt-6">
        <ContentTable initial={initial} />
      </div>
      {processingId && <ProcessingToast videoId={processingId} onDismiss={() => setProcessingId(null)} />}
    </div>
  );
}

