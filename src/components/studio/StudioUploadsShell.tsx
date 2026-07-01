"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ContentTable, { type Row } from "@/components/studio/ContentTable";
import AudioTracksTable from "@/components/studio/AudioTracksTable";
import PhotosTable from "@/components/studio/PhotosTable";
import VideoComposer from "@/components/create/VideoComposer";
import AudioComposer from "@/components/create/AudioComposer";
import ImageComposer from "@/components/create/ImageComposer";
import { ProcessingToast } from "@/components/ProcessingToast";
import LiveStreamsTable from "@/components/studio/LiveStreamsTable";

type Tab = "videos" | "audio" | "images" | "live";
type View = "list" | "upload";

const TAB_CONFIG: { key: Tab; label: string }[] = [
  { key: "videos", label: "Videos" },
  { key: "audio",  label: "Audio" },
  { key: "images", label: "Images" },
  { key: "live",   label: "Live Streams" },
];

const UPLOAD_LABEL: Record<Tab, string | null> = {
  videos: "+ Upload video",
  audio:  "+ Upload audio",
  images: "+ Upload image",
  live:   null,
};

const SUBTITLE: Record<Tab, string> = {
  videos: "Manage your videos.",
  audio:  "Manage your audio tracks.",
  images: "Manage your uploaded images.",
  live:   "Manage your live streams.",
};

export default function StudioUploadsShell({ initial }: { initial: Row[] }) {
  const [view, setView] = useState<View>("list");
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
          ← Back to {tab}
        </button>
        {tab === "videos" && <VideoComposer onComplete={(id) => { setProcessingId(id); goToList(); }} />}
        {tab === "audio"  && <AudioComposer onComplete={(id) => { setProcessingId(id); goToList(); }} />}
        {tab === "images" && <ImageComposer onComplete={goToList} />}
      </div>
    );
  }

  const uploadLabel = UPLOAD_LABEL[tab];

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Channel content</h1>
          <p className="mt-1 text-sm text-mist">{SUBTITLE[tab]}</p>
        </div>
        {uploadLabel && (
          <button
            onClick={() => setView("upload")}
            className="shrink-0 rounded-[10px] px-4 py-2.5 text-sm font-bold text-ink"
            style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}
          >
            {uploadLabel}
          </button>
        )}
      </div>

      <div className="mt-6 flex border-b border-edge text-sm">
        {TAB_CONFIG.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 font-medium transition-colors ${
              tab === key ? "border-b-2 border-loon text-foam" : "text-mist hover:text-foam"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "videos" && <ContentTable initial={initial} />}
        {tab === "audio"  && <AudioTracksTable />}
        {tab === "images" && <PhotosTable />}
        {tab === "live"   && <LiveStreamsTable />}
      </div>

      {processingId && <ProcessingToast videoId={processingId} onDismiss={() => setProcessingId(null)} />}
    </div>
  );
}
