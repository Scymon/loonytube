"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ContentTable, { type Row } from "@/components/studio/ContentTable";
import VideoComposer from "@/components/create/VideoComposer";
import { ProcessingToast } from "@/components/ProcessingToast";
import LiveStreamsTable from "@/components/studio/LiveStreamsTable";

type Tab = "videos" | "live";

export default function StudioUploadsShell({ initial }: { initial: Row[] }) {
  const [view, setView] = useState<"list" | "upload">("list");
  const [tab, setTab] = useState<Tab>("videos");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const router = useRouter();

  function goToList() {
    setView("list");
    router.refresh();
  }

  if (view === "upload") {
    return (
      <div>
        <button onClick={goToList} className="mb-5 flex items-center gap-1.5 text-sm font-semibold text-mist hover:text-foam">
          ← Back to uploads
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
          <p className="mt-1 text-sm text-mist">Manage your videos and live streams.</p>
        </div>
        <button
          onClick={() => setView("upload")}
          className="shrink-0 rounded-[10px] px-4 py-2.5 text-sm font-bold text-ink"
          style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}
        >
          + Upload video
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex border-b border-edge text-sm">
        <button
          onClick={() => setTab("videos")}
          className={`px-4 py-2 font-medium ${tab === "videos" ? "border-b-2 border-loon text-foam" : "text-mist hover:text-foam"}`}
        >
          Videos
        </button>
        <button
          onClick={() => setTab("live")}
          className={`px-4 py-2 font-medium ${tab === "live" ? "border-b-2 border-loon text-foam" : "text-mist hover:text-foam"}`}
        >
          Live Streams
        </button>
      </div>

      <div className="mt-4">
        {tab === "videos" ? (
          <ContentTable initial={initial} />
        ) : (
          <LiveStreamsTable />
        )}
      </div>

      {processingId && <ProcessingToast videoId={processingId} onDismiss={() => setProcessingId(null)} />}
    </div>
  );
}