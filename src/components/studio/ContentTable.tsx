"use client";

import { useEffect, useRef, useState } from "react";
import { ThumbnailPicker } from "@/components/ThumbnailPicker";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { nfmt, ago } from "@/lib/format";

export type Row = {
  id: string; title: string; description: string | null; thumbnail: string | null;
  status: string; visibility: string; views: number; comments: number; likes: number;
  created_at: string; scheduled_at: string | null; duration: number | null;
};

const VIS = ["public", "unlisted", "private"] as const;

const toLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const toIso   = (local: string)       => (local ? new Date(local).toISOString() : null);

// Cloudflare thumbnail URL. time must be in seconds (e.g. "5s") — percentage
// format "Np" is not supported by CF and returns the same default frame.
const cfThumb = (uid: string, secs: number) =>
  `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg?time=${Math.max(0, Math.round(secs))}s&height=720`;

// Convert a 0–100 percentage to a seconds-based time for cfThumb.
// Falls back to a fixed offset if duration is unknown.
const pctToSecs = (pct: number, duration: number | null): number => {
  if (duration && duration > 0) return duration * (pct / 100);
  // No duration yet: use fixed offsets anchored around 30 s / 60 s / 120 s
  // so at least different frames are requested.
  return pct * 1.2;
};

const PCTS = [5, 50, 95] as const;

function VisBadge({ v }: { v: string }) {
  const dot = v === "public" ? "bg-teal" : v === "unlisted" ? "bg-sky" : "bg-mist";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm capitalize text-foam">
      <span className={`h-2 w-2 rounded-full ${dot}`} />{v}
    </span>
  );
}

export default function ContentTable({ initial }: { initial: Row[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>(initial);
  const [edit, setEdit] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [thumbBusy, setThumbBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // thumbPane: which selector (0/1/2) has the checkmark. null = custom/none.
  // showScrubber: pane 4 toggle — opens the scrubber controls.
  const [thumbPane, setThumbPane] = useState<0 | 1 | 2 | null>(null);
  const [showScrubber, setShowScrubber] = useState(false);
  const [scrubPct, setScrubPct] = useState(50);

  // ── Preload CF thumbnails the moment the scrubber opens ─────────────────
  // Images at 10% intervals will be browser-cached so scrubbing feels instant.
  useEffect(() => {
    if (!showScrubber || !edit || edit.status !== "ready") return;
    const id = edit.id;
    for (let pct = 0; pct <= 100; pct += 10) {
      const img = new window.Image();
      img.src = cfThumb(id, pctToSecs(pct, edit.duration));
    }
  }, [showScrubber, edit?.id, edit?.status]);

  function openEdit(row: Row) {
    setErr(null);
    setThumbPane(null);
    setShowScrubber(false);
    setScrubPct(50);
    setEdit(row);
    if (row.status === "ready" && !row.thumbnail) {
      doSelectAuto(row, 0);
    }
  }

  async function uploadRemoteThumb(videoId: string, url: string): Promise<string | null> {
    setThumbBusy(true); setErr(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setThumbBusy(false); return null; }
    let blob: Blob;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      blob = await res.blob();
    } catch (e) {
      setThumbBusy(false);
      setErr(`Could not fetch frame: ${(e as Error).message}`);
      return null;
    }
    const path = `${user.id}/thumb-${videoId}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("media").upload(path, blob, {
      contentType: "image/jpeg", upsert: true, cacheControl: "3600",
    });
    if (error) { setThumbBusy(false); setErr(`Upload failed: ${error.message}`); return null; }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    setThumbBusy(false);
    return data.publicUrl;
  }

  async function uploadFileThumb(videoId: string, file: File) {
    setThumbBusy(true); setErr(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setThumbBusy(false); setErr("Sign in to upload."); return; }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${user.id}/thumb-${videoId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true, cacheControl: "3600" });
    if (error) { setThumbBusy(false); setErr(`Upload failed: ${error.message}`); return; }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    setEdit((e) => (e ? { ...e, thumbnail: data.publicUrl } : e));
    setThumbPane(null);
    setShowScrubber(false);
    setThumbBusy(false);
  }

  async function doSelectAuto(row: Row, i: 0 | 1 | 2) {
    setThumbPane(i);
    setShowScrubber(false);
    const url = await uploadRemoteThumb(row.id, cfThumb(row.id, pctToSecs(PCTS[i], row.duration)));
    if (url) setEdit((e) => (e ? { ...e, thumbnail: url } : e));
  }

  async function selectAuto(i: 0 | 1 | 2) {
    if (!edit || thumbBusy) return;
    await doSelectAuto(edit, i);
  }

  async function confirmScrub() {
    if (!edit) return;
    const url = await uploadRemoteThumb(edit.id, cfThumb(edit.id, pctToSecs(scrubPct, edit.duration)));
    if (url) {
      setEdit((e) => (e ? { ...e, thumbnail: url } : e));
      setThumbPane(null);
    }
  }

  async function save() {
    if (!edit) return;
    setBusy(true); setErr(null);
    const orig = rows.find((r) => r.id === edit.id);
    if (orig && orig.visibility !== edit.visibility) {
      const res = await fetch("/api/video/visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: edit.id, visibility: edit.visibility }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setBusy(false); setErr(j.error || "Could not update visibility"); return;
      }
    }
    const patch = {
      title: edit.title.trim(),
      description: edit.description,
      scheduled_at: edit.scheduled_at,
      thumbnail: edit.thumbnail,
    };
    const { error } = await supabase.from("videos").update(patch).eq("id", edit.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setRows((rs) => rs.map((r) => (r.id === edit.id ? { ...r, ...patch, visibility: edit.visibility } : r)));
    setEdit(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this video permanently?")) return;
    const { error } = await supabase.from("videos").delete().eq("id", id);
    if (!error) setRows((rs) => rs.filter((r) => r.id !== id));
  }

  async function handleDownload(id: string) {
    setDownloadingId(id);
    try {
      const r = await fetch(`/api/videos/${id}/download`, { method: "POST" });
      let body = await r.json();

      // CF generates MP4s async — if not ready in the server fast-path, poll GET
      if (r.status === 202) {
        const POLL_MS  = 3_000;
        const deadline = Date.now() + 120_000;
        while (!body.url && Date.now() < deadline) {
          await new Promise(res => setTimeout(res, POLL_MS));
          const poll = await fetch(`/api/videos/${id}/download`);
          body = await poll.json();
        }
      }

      if (!body.url) {
        alert("Download is being prepared — please try again in a moment.");
        return;
      }
      const a = document.createElement("a");
      a.href = body.url as string;
      a.download = "";
      a.target = "_blank";
      a.rel = "noopener";
      a.click();
    } finally {
      setDownloadingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-edge bg-surface px-4 py-10 text-center text-sm text-mist">
        No uploads yet. <Link href="/create" className="text-teal hover:underline">Upload a video</Link>.
      </p>
    );
  }

  const isReady = edit?.status === "ready";

  return (
    <>
      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-edge">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-edge bg-surface text-left text-xs uppercase tracking-wide text-mist">
            <tr>
              <th className="px-4 py-3 font-semibold">Video</th>
              <th className="px-3 py-3 font-semibold">Visibility</th>
              <th className="px-3 py-3 font-semibold">Date</th>
              <th className="px-3 py-3 text-right font-semibold">Views</th>
              <th className="px-3 py-3 text-right font-semibold">Comments</th>
              <th className="px-3 py-3 text-right font-semibold">Likes</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-edge/30">
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded border border-edge bg-black">
                      {r.thumbnail
                        ? <img src={r.thumbnail} alt="" className="h-full w-full object-cover" />
                        : <div className="h-full w-full" style={{ backgroundImage: "linear-gradient(160deg,#13202c,#0a0f15)" }} />}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-1 font-semibold text-foam">{r.title}</p>
                      <p className="line-clamp-1 text-xs text-mist">{r.description || "No description"}</p>
                      {r.status !== "ready" && (
                        <span className="mt-1 inline-block rounded bg-edge px-1.5 py-0.5 text-[10px] uppercase text-mist">{r.status}</span>
                      )}
                      {r.scheduled_at && new Date(r.scheduled_at) > new Date() && (
                        <span className="mt-1 ml-1 inline-block rounded bg-sky/15 px-1.5 py-0.5 text-[10px] uppercase text-sky">scheduled</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3"><VisBadge v={r.visibility} /></td>
                <td className="px-3 py-3 text-mist">{ago(r.created_at)}</td>
                <td className="px-3 py-3 text-right text-foam">{nfmt(r.views)}</td>
                <td className="px-3 py-3 text-right text-foam">{nfmt(r.comments)}</td>
                <td className="px-3 py-3 text-right text-foam">{nfmt(r.likes)}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                    <button onClick={() => openEdit(r)} className="font-semibold text-teal hover:underline">Edit</button>
                    <Link href={`/watch/${r.id}`} className="text-mist hover:text-foam">View</Link>
                    {r.status === "ready" && (
                      <button
                        onClick={() => handleDownload(r.id)}
                        disabled={downloadingId === r.id}
                        className="text-mist hover:text-sky disabled:opacity-50"
                        title="Download video"
                      >
                        {downloadingId === r.id ? "…" : "Download"}
                      </button>
                    )}
                    <button onClick={() => remove(r.id)} className="text-mist hover:text-loonred">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Edit modal ────────────────────────────────────────────────────── */}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setEdit(null)}>
          <div className="w-full max-w-lg overflow-y-auto rounded-2xl border border-edge bg-panel p-6 max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foam">Edit video</h3>

            <label className="lt-label mt-4">Title</label>
            <input className="lt-input" value={edit.title}
              onChange={(e) => setEdit({ ...edit, title: e.target.value })} />

            <label className="lt-label mt-3">Description</label>
            <textarea className="lt-input min-h-[80px]" value={edit.description ?? ""}
              onChange={(e) => setEdit({ ...edit, description: e.target.value })} />

            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <label className="lt-label">Visibility</label>
                <select className="lt-input" value={edit.visibility}
                  onChange={(e) => setEdit({ ...edit, visibility: e.target.value })}>
                  {VIS.map((v) => <option key={v} value={v}>{v[0].toUpperCase() + v.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="lt-label">Schedule release</label>
                <input type="datetime-local" className="lt-input" value={toLocal(edit.scheduled_at)}
                  onChange={(e) => setEdit({ ...edit, scheduled_at: toIso(e.target.value) })} />
              </div>
            </div>

            {/* ── Thumbnail ─────────────────────────────────────────────── */}
            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <label className="lt-label">Thumbnail</label>
                {(thumbPane !== null || edit.thumbnail) && (
                  <button type="button"
                    onClick={() => {
                      setThumbPane(null);
                      setShowScrubber(false);
                      setEdit({ ...edit, thumbnail: null });
                    }}
                    className="text-xs text-mist hover:text-foam">Clear</button>
                )}
              </div>

              {(() => {
                const previewSrc = showScrubber
                  ? cfThumb(edit.id, pctToSecs(scrubPct, edit.duration))
                  : thumbPane !== null
                    ? cfThumb(edit.id, pctToSecs(PCTS[thumbPane], edit.duration))
                    : (edit.thumbnail ?? (isReady ? cfThumb(edit.id, pctToSecs(50, edit.duration)) : null));
                const suggestions: [string | null, string | null, string | null] = isReady
                  ? PCTS.map((p) => cfThumb(edit.id, pctToSecs(p, edit.duration))) as [string, string, string]
                  : ["", "", ""];
                return (
                  <ThumbnailPicker
                    suggestions={suggestions}
                    selectedPane={thumbPane}
                    onSelectPane={selectAuto}
                    showScrubber={showScrubber}
                    onToggleScrubber={() => isReady && setShowScrubber((v) => !v)}
                    scrubberEnabled={isReady}
                    previewContent={(isReady || edit.thumbnail) && previewSrc ? (
                      // key forces img remount on src change — prevents stale CF frame display
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={previewSrc} src={previewSrc} alt="" className="h-full w-full object-cover" />
                    ) : null}
                    scrubberContent={isReady ? (
                      <>
                        <input type="range" min={0} max={100} step={1} value={scrubPct}
                          onChange={(e) => setScrubPct(Number(e.target.value))}
                          className="w-full accent-sky" />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-mist">0%</span>
                          <button type="button" onClick={confirmScrub} disabled={thumbBusy}
                            className="rounded-lg bg-sky/20 px-3 py-1.5 text-xs font-semibold text-sky hover:bg-sky/30 disabled:opacity-50">
                            {thumbBusy ? "Uploading…" : "Use this frame"}
                          </button>
                          <span className="text-xs text-mist">{scrubPct}%</span>
                        </div>
                      </>
                    ) : null}
                    busy={thumbBusy}
                    onFileSelect={(f) => uploadFileThumb(edit.id, f)}
                    emptyHint={!isReady ? "Frame suggestions available once the video finishes processing." : undefined}
                  />
                );
              })()}
            </div>

            {err && <p className="mt-3 text-sm text-loonred">{err}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setEdit(null)}
                className="text-sm font-semibold text-mist hover:text-foam">Cancel</button>
              <button onClick={save} disabled={busy || thumbBusy}
                className="rounded-[10px] px-5 py-2.5 text-sm font-bold text-ink disabled:opacity-50"
                style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>
                {busy ? "Saving…" : thumbBusy ? "Uploading thumbnail…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
