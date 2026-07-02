"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Block, BlockType, VideoRow } from "@/types/article";
import { blockClass } from "./helpers";
import AutoText from "./AutoText";
import BlockToolbar from "./BlockToolbar";

// ── Video picker (inline, for video blocks) ──────────────────────────────────
function VideoPickerBlock({
  supabase, uid, onPick,
}: {
  supabase: ReturnType<typeof createClient>;
  uid: string;
  onPick: (v: VideoRow) => void;
}) {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase
      .from("videos")
      .select("id, title, thumbnail")
      .eq("owner", uid)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(48)
      .then(({ data }) => { setVideos((data as VideoRow[]) ?? []); setLoading(false); });
  }, [supabase, uid]);

  const filtered = q
    ? videos.filter((v) => v.title.toLowerCase().includes(q.toLowerCase()))
    : videos;

  return (
    <div className="rounded-xl border border-edge bg-surface p-3 space-y-3">
      <p className="text-xs font-semibold text-mist">Pick a video from your library</p>
      <input value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Search videos…"
        className="w-full rounded-lg border border-edge bg-transparent px-3 py-2 text-sm text-foam placeholder-mist/40 outline-none focus:border-teal" />
      {loading ? (
        <p className="text-xs text-mist py-4 text-center">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-mist py-4 text-center">No ready videos found.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
          {filtered.map((v) => (
            <button key={v.id} onClick={() => onPick(v)}
              className="group relative overflow-hidden rounded-lg border border-edge transition hover:border-teal">
              {v.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.thumbnail} alt={v.title} loading="lazy" decoding="async" className="w-full aspect-video object-cover" />
              ) : (
                <div className="w-full aspect-video bg-edge/40 flex items-center justify-center">
                  <span className="text-mist text-lg">▶</span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1.5 py-1 text-[10px] text-white truncate">
                {v.title}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── One editor block: content + floating toolbar when focused ────────────────
export default function ArticleBlock({
  block: b, index: i, focused, blocksLength, firstBlock, uid, supabase,
  setFocusedId, setText, setCaption, changeType, remove, moveUp, moveDown,
  openImagePicker, registerRef, keyHandler, pasteHandler, onPickVideo,
}: {
  block: Block;
  index: number;
  focused: boolean;
  blocksLength: number;
  firstBlock: boolean;
  uid: string | null;
  supabase: ReturnType<typeof createClient>;
  setFocusedId: React.Dispatch<React.SetStateAction<string | null>>;
  setText: (id: string, v: string) => void;
  setCaption: (id: string, v: string) => void;
  changeType: (id: string, t: BlockType) => void;
  remove: (id: string) => void;
  moveUp: (i: number) => void;
  moveDown: (i: number) => void;
  openImagePicker: (blockId: string) => void;
  registerRef: (id: string, el: HTMLTextAreaElement | null) => void;
  keyHandler: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  pasteHandler: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onPickVideo: (blockId: string, v: VideoRow) => void;
}) {
  return (
    <div className="group relative">
      {/* Floating toolbar — shown when focused */}
      {focused && (
        <div className="absolute -top-8 right-0 z-20">
          <BlockToolbar
            canUp={i > 0}
            canDown={i < blocksLength - 1}
            currentType={b.type}
            onUp={() => moveUp(i)}
            onDown={() => moveDown(i)}
            onChangeType={(t) => changeType(b.id, t)}
            onDelete={() => { remove(b.id); setFocusedId(null); }}
            onAddImage={() => openImagePicker(b.id)}
          />
        </div>
      )}

      {/* Block content */}
      {b.type === "divider" ? (
        <div className="py-3 cursor-pointer group/div" onClick={() => setFocusedId(focused ? null : b.id)}>
          <hr className={["border-edge/60 transition", focused ? "border-teal/40" : ""].join(" ")} />
        </div>
      ) : b.type === "image" ? (
        <div className="space-y-1" onClick={() => setFocusedId(b.id)}>
          <div className={["overflow-hidden rounded-xl transition", focused ? "ring-1 ring-teal/30" : ""].join(" ")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.url} alt={b.caption || ""} className="max-h-[480px] w-full object-cover" />
          </div>
          <input
            value={b.caption ?? ""}
            onChange={(e) => setCaption(b.id, e.target.value)}
            onFocus={() => setFocusedId(b.id)}
            placeholder="Caption…"
            className="w-full bg-transparent text-center text-xs text-mist/50 placeholder-mist/25 outline-none focus:text-mist" />
        </div>
      ) : b.type === "video" ? (
        b.videoId ? (
          <div className="relative overflow-hidden rounded-xl border border-edge cursor-pointer"
            onClick={() => setFocusedId(b.id)}>
            {b.videoThumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.videoThumb} alt={b.videoTitle || ""} className="w-full max-h-[420px] object-cover" />
            ) : (
              <div className="w-full aspect-video bg-edge/30 flex items-center justify-center">
                <span className="text-5xl text-mist/40">▶</span>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-14 w-14 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="white"><path d="M6 4l12 6-12 6z"/></svg>
              </div>
            </div>
            {b.videoTitle && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
                <p className="text-sm font-semibold text-white truncate">{b.videoTitle}</p>
              </div>
            )}
          </div>
        ) : uid ? (
          <VideoPickerBlock
            supabase={supabase}
            uid={uid}
            onPick={(v) => onPickVideo(b.id, v)}
          />
        ) : null
      ) : b.type === "quote" ? (
        <div className={["border-l-2 pl-4 transition", focused ? "border-teal" : "border-edge/40"].join(" ")}>
          <AutoText
            value={b.value ?? ""}
            onChange={(v) => setText(b.id, v)}
            placeholder="Pull quote…"
            className={blockClass(b.type)}
            onFocus={() => setFocusedId(b.id)}
            onBlur={() => setTimeout(() => setFocusedId((id) => id === b.id ? null : id), 150)}
            refCallback={(el) => registerRef(b.id, el)}
            onKeyDown={keyHandler}
            onPaste={pasteHandler}
          />
        </div>
      ) : (
        <AutoText
          value={b.value ?? ""}
          onChange={(v) => setText(b.id, v)}
          placeholder={
            b.type === "h2"   ? "Heading…" :
            b.type === "h3"   ? "Subheading…" :
            b.type === "code" ? "// Code…" :
            firstBlock ? "Write something…" : ""
          }
          className={blockClass(b.type)}
          onFocus={() => setFocusedId(b.id)}
          onBlur={() => setTimeout(() => setFocusedId((id) => id === b.id ? null : id), 150)}
          refCallback={(el) => registerRef(b.id, el)}
          onKeyDown={keyHandler}
          onPaste={pasteHandler}
        />
      )}
    </div>
  );
}
