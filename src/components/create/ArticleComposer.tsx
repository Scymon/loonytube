"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BLOCK_TYPES } from "@/types/article";
import { rid, readingTime } from "./article/helpers";
import { useArticleEditor } from "@/hooks/useArticleEditor";
import AutoText from "./article/AutoText";
import ArticleBlock from "./article/ArticleBlock";

export default function ArticleComposer() {
  const router = useRouter();
  const ed = useArticleEditor();
  const [menuOpen, setMenuOpen]     = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // ── Published ──────────────────────────────────────────────────────────────
  if (ed.publishedId) {
    const url = `${window.location.origin}/article/${ed.publishedId}`;
    return (
      <div className="space-y-4 py-4 text-center">
        <p className="text-lg font-bold text-foam">Article published!</p>
        <p className="text-sm text-mist">Share the link with your audience.</p>
        <div className="flex items-center gap-2 rounded-xl border border-edge bg-surface px-4 py-3">
          <span className="flex-1 truncate text-left text-sm text-foam">{url}</span>
          <button onClick={() => navigator.clipboard.writeText(url)}
            className="shrink-0 rounded-lg bg-teal/20 px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal/30">
            Copy link
          </button>
        </div>
        <button onClick={() => router.push(`/article/${ed.publishedId}`)} className="text-sm text-sky hover:underline">
          Open article →
        </button>
      </div>
    );
  }

  // ── Editor ─────────────────────────────────────────────────────────────────
  const cMenuBar = (
    <div className="flex items-center gap-0.5 rounded-full border border-edge bg-ink/95 px-2 py-1 shadow-xl backdrop-blur-sm">
          {BLOCK_TYPES.map(({ type, icon, label }) => (
            <button key={type} onClick={() => { ed.addBlock(type); setMenuOpen(false); }}
              title={label} disabled={ed.uploading}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-mist/60 transition hover:bg-edge/40 hover:text-foam disabled:opacity-30">
              {icon}
            </button>
          ))}
          <span className="mx-1.5 h-3 w-px bg-edge/40" />
          <button
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="flex h-7 w-7 items-center justify-center rounded-full text-mist/60 transition hover:bg-edge/40 hover:text-foam"
          >
            {fullscreen ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
                <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8V5a2 2 0 0 1 2-2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/>
                <path d="M21 16v3a2 2 0 0 1-2 2h-3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/>
              </svg>
            )}
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen((o) => !o)} title="More"
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-mist/40 transition hover:bg-edge/40 hover:text-foam">
              •••
            </button>
            {menuOpen && (
              <div className="absolute bottom-full right-0 mb-2 min-w-[160px] overflow-hidden rounded-xl border border-edge bg-ink/95 py-1 shadow-xl backdrop-blur-sm"
                onMouseLeave={() => setMenuOpen(false)}>
                <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-mist/40">Editor</p>
                {ed.uploading && (
                  <div className="px-3 py-2 text-xs text-mist">Uploading…</div>
                )}
                <button onClick={() => { ed.setBlocks([{ id: rid(), type: "text", value: "" }]); setMenuOpen(false); }}
                  className="w-full px-3 py-2 text-left text-xs text-mist transition hover:bg-edge/40 hover:text-loonred">
                  Clear body
                </button>
                <button onClick={() => { ed.saveDraft(); setMenuOpen(false); }}
                  className="w-full px-3 py-2 text-left text-xs text-mist transition hover:bg-edge/40 hover:text-foam">
                  Save draft
                </button>
              </div>
            )}
          </div>
    </div>
  );

  return (
    <div className={fullscreen ? "fixed inset-0 z-[200] bg-panel flex flex-col overflow-hidden" : ""}>
      {fullscreen && (
        <div className="flex shrink-0 items-center justify-between border-b border-edge/40 px-5 py-3 md:px-10">
          <button
            onClick={() => setFullscreen(false)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-mist transition hover:bg-edge/60 hover:text-foam"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
              <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
            </svg>
            Exit fullscreen
          </button>
          <button onClick={ed.publish} disabled={ed.busy || ed.uploading}
            className="rounded-[10px] px-5 py-2 text-sm font-bold text-ink disabled:opacity-50"
            style={{ backgroundImage: "var(--lt-grad-primary)" }}>
            {ed.busy ? "Publishing…" : "Publish"}
          </button>
        </div>
      )}
      <div className={fullscreen ? "flex-1 overflow-y-auto px-5 py-6 md:px-16 lg:px-28" : ""}>
      <div className="space-y-5">

      {/* Draft banner */}
      {ed.hasDraft && (
        <div className="flex items-center justify-between rounded-lg border border-edge bg-surface px-4 py-2.5 text-sm">
          <span className="text-mist">You have an unsaved draft.</span>
          <div className="flex gap-3">
            <button onClick={ed.restoreDraft} className="font-semibold text-teal hover:underline">Restore</button>
            <button onClick={ed.clearDraft}   className="text-mist hover:text-foam">Discard</button>
          </div>
        </div>
      )}

      {/* Title */}
      <AutoText
        value={ed.title}
        onChange={(v) => ed.setTitle(v.slice(0, 200))}
        placeholder="Article title…"
        className="w-full border-0 border-b border-edge bg-transparent pb-4 text-3xl font-bold text-foam placeholder-mist/30 outline-none focus:border-teal"
        onEnter={() => ed.blocks.length > 0 ? ed.focusBlock(ed.blocks[0].id, "start") : ed.insertAfter("")}
      />

      {/* Cover */}
      <input ref={ed.coverRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden
        onChange={(e) => ed.pickCover(e.target.files)} />
      {ed.cover ? (
        <div className="group relative overflow-hidden rounded-xl"
          onDragOver={(e) => { e.preventDefault(); ed.setDragOver("cover"); }}
          onDragLeave={() => ed.setDragOver(null)}
          onDrop={ed.handleCoverDrop}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ed.cover} alt="" className="max-h-72 w-full object-cover" />
          <button onClick={() => ed.setCover(null)}
            className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-foam opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-black">
            Remove cover
          </button>
        </div>
      ) : (
        <button onClick={() => ed.coverRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); ed.setDragOver("cover"); }}
          onDragLeave={() => ed.setDragOver(null)}
          onDrop={ed.handleCoverDrop}
          className={["w-full rounded-xl border border-dashed py-4 text-xs font-semibold transition",
            ed.dragOver === "cover"
              ? "border-teal text-teal bg-teal/5"
              : "border-edge/40 text-mist/40 hover:border-teal/50 hover:text-teal/70",
          ].join(" ")}>
          {ed.dragOver === "cover" ? "Drop to set cover" : "+ Add cover image"}
        </button>
      )}

      {/* Hidden image input */}
      <input ref={ed.imageRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden
        onChange={(e) => ed.pickImage(e.target.files)} />

      {/* Blocks */}
      <div
        className="space-y-1"
        onDragOver={(e) => {
          e.preventDefault();
          ed.setDragOver("body");
          // Compute which gap the cursor is over
          const children = Array.from(e.currentTarget.children) as HTMLElement[];
          let idx = children.length; // default: after last
          for (let i = 0; i < children.length; i++) {
            const rect = children[i].getBoundingClientRect();
            if (e.clientY < rect.top + rect.height / 2) { idx = i; break; }
          }
          ed.setDropIdx(idx);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            ed.setDragOver(null); ed.setDropIdx(null);
          }
        }}
        onDrop={(e) => { ed.handleBodyDrop(e, ed.dropIdx ?? ed.blocks.length); ed.setDropIdx(null); }}>
        {ed.blocks.map((b, i) => (
          <div key={b.id}>
            {/* Drop indicator line */}
            {ed.dragOver === "body" && ed.dropIdx === i && (
              <div className="my-1 h-0.5 w-full rounded-full bg-teal/60" />
            )}
            <ArticleBlock
              block={b}
              index={i}
              focused={ed.focusedId === b.id}
              blocksLength={ed.blocks.length}
              firstBlock={i === 0}
              uid={ed.uid}
              supabase={ed.supabase}
              setFocusedId={ed.setFocusedId}
              setText={ed.setText}
              setCaption={ed.setCaption}
              changeType={ed.changeType}
              remove={ed.remove}
              moveUp={ed.moveUp}
              moveDown={ed.moveDown}
              openImagePicker={ed.openImagePicker}
              registerRef={(id, el) => { if (el) ed.blockRefs.current.set(id, el); else ed.blockRefs.current.delete(id); }}
              keyHandler={ed.keyHandler(b.id, i)}
              pasteHandler={ed.pasteHandler(b.id, i)}
              onPickVideo={ed.pickVideo}
            />
          </div>
        ))}
        {/* Drop indicator after last block */}
        {ed.dragOver === "body" && ed.dropIdx === ed.blocks.length && (
          <div className="my-1 h-0.5 w-full rounded-full bg-teal/60" />
        )}
      </div>

      {/* Floating cMenu toolbar — sticky in normal mode */}
      {!fullscreen && (
        <div className="sticky bottom-0 z-10 flex justify-center pt-4 pb-1">
          {cMenuBar}
        </div>
      )}

      {ed.err && <p className="text-sm text-loonred">{ed.err}</p>}

      {/* Footer */}
      {!fullscreen && <div className="flex items-center justify-between border-t border-edge/30 pt-4">
        <div className="flex items-center gap-4 text-xs text-mist/50">
          <span>{ed.words.toLocaleString()} words · {readingTime(ed.words)}</span>
          {ed.draftSaved
            ? <span className="text-teal">Saved</span>
            : <button onClick={ed.saveDraft} className="hover:text-foam transition">Save draft</button>
          }
        </div>
        <button onClick={ed.publish} disabled={ed.busy || ed.uploading}
          className="rounded-[10px] px-6 py-3 text-sm font-bold text-ink disabled:opacity-50"
          style={{ backgroundImage: "var(--lt-grad-primary)" }}>
          {ed.busy ? "Publishing…" : "Publish"}
        </button>
      </div>}
    </div>
      </div>
      {/* Floating cMenu toolbar — pinned at bottom in fullscreen */}
      {fullscreen && (
        <div className="shrink-0 flex justify-center py-3 bg-panel border-t border-edge/20">
          {cMenuBar}
        </div>
      )}
    </div>
  );
}
