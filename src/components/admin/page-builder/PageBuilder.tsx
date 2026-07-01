"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import type { Block, BlockType } from "./types";
import { usePageBuilder } from "./usePageBuilder";
import Sidebar from "./Sidebar";
import BlockCanvas    from "./BlockCanvas";
import PropsPanel, { PageInfoPanel } from "./PropsPanel";

type CanvasWidth = "desktop" | "tablet" | "mobile";

type Props = {
  pageId: string;
  initialTitle: string;
  initialSlug: string;
  initialPublished: boolean;
  initialBlocks: Block[];
  onClose: (updated: { title: string; is_published: boolean; updated_at: string }) => void;
};

const WIDTH_OPTS: { id: CanvasWidth; label: string; icon: string; hint: string }[] = [
  { id: "desktop", label: "Desktop", icon: "&#x1f5a5;", hint: "Full width" },
  { id: "tablet",  label: "Tablet",  icon: "&#x1f4f1;", hint: "640px" },
  { id: "mobile",  label: "Mobile",  icon: "&#x1f4f2;", hint: "384px" },
];

export default function PageBuilder({
  pageId, initialTitle, initialSlug, initialPublished, initialBlocks, onClose,
}: Props) {
  const supabase = createClient();
  const [title, setTitle]             = useState(initialTitle);
  const [isPublished, setIsPublished] = useState(initialPublished);
  const [canvasWidth, setCanvasWidth] = useState<CanvasWidth>("desktop");
  const [zoom,       setZoom]       = useState(1);
  const [showGrid,   setShowGrid]   = useState(false);

  function adjustZoom(delta: number) {
    setZoom(z => Math.max(0.25, Math.min(2, Math.round((z + delta) * 20) / 20)));
  }

  const {
    blocks, selectedId, selectedBlock, preview, saveStatus,
    canUndo, canRedo,
    setSelectedId, addBlock, addBlockAtIndex, updateBlock,
    duplicateBlock, deleteBlock, moveBlock, reorderBlocks,
    undo, redo, togglePreview, toggleHidden,
  } = usePageBuilder(pageId, initialBlocks);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tgt = e.target as HTMLElement;
      // Don't intercept when user is typing in an input/textarea
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tgt.tagName) || tgt.isContentEditable) {
        // Allow Escape even inside inputs
        if (e.key === "Escape") { setSelectedId(null); return; }
        return;
      }
      const cmd = e.metaKey || e.ctrlKey;
      switch (true) {
        case e.key === "Escape":
          e.preventDefault();
          setSelectedId(null);
          break;
        case (e.key === "Delete" || e.key === "Backspace") && !!selectedId:
          e.preventDefault();
          deleteBlock(selectedId!);
          break;
        case cmd && !e.shiftKey && e.key === "z":
          e.preventDefault();
          undo();
          break;
        case cmd && e.shiftKey && e.key === "z":
          e.preventDefault();
          redo();
          break;
        case cmd && e.key === "d" && !!selectedId:
          e.preventDefault();
          duplicateBlock(selectedId!);
          break;
        case cmd && e.key === "p":
          e.preventDefault();
          togglePreview();
          break;
        case cmd && (e.key === "=" || e.key === "+"):
          e.preventDefault();
          setZoom(z => Math.max(0.25, Math.min(2, Math.round((z + 0.1) * 20) / 20)));
          break;
        case cmd && e.key === "-":
          e.preventDefault();
          setZoom(z => Math.max(0.25, Math.min(2, Math.round((z - 0.1) * 20) / 20)));
          break;
        case cmd && e.key === "0":
          e.preventDefault();
          setZoom(1);
          break;
        case e.key === "g" && !cmd && !e.shiftKey:
          setShowGrid(g => !g);
          break;
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ── Meta save ─────────────────────────────────────────────────────────────
  async function saveMeta(field: "title" | "is_published", value: string | boolean) {
    await supabase.from("pages").update({ [field]: value }).eq("id", pageId);
  }

  async function handleClose() {
    const { data } = await supabase
      .from("pages")
      .select("updated_at")
      .eq("id", pageId)
      .maybeSingle();
    onClose({
      title,
      is_published: isPublished,
      updated_at: data?.updated_at ?? new Date().toISOString(),
    });
  }

  const handleAddBlock = useCallback(
    (type: BlockType, afterId?: string | null) => addBlock(type, afterId ?? selectedId),
    [addBlock, selectedId]
  );

  const saveLabel =
    saveStatus === "saving" ? "Saving…" :
    saveStatus === "saved"  ? "Saved" :
    saveStatus === "error"  ? "Error" : "";

  const [portalMounted, setPortalMounted] = useState(false);
  useEffect(() => { setPortalMounted(true); }, []);

  const builderEl = (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-ink">

      {/* ── Top bar ── */}
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-edge bg-surface px-4" >

        {/* Left: back + title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 text-sm text-mist hover:text-foam transition-colors shrink-0"
            title="Back to pages list"
          >
            &#x2190; Pages
          </button>
          <span className="text-mist/30 select-none">&#x2502;</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => saveMeta("title", title)}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foam outline-none
              placeholder:text-mist hover:text-white focus:text-white"
            placeholder="Page title"
          />
        </div>

        {/* Center: responsive width toggles */}
        {!preview && (
          <div className="hidden sm:flex items-center gap-0.5 rounded-lg bg-panel border border-edge p-0.5">
            {WIDTH_OPTS.map((w) => (
              <button
                key={w.id}
                onClick={() => setCanvasWidth(w.id)}
                title={w.hint}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  canvasWidth === w.id
                    ? "bg-surface text-foam shadow-sm"
                    : "text-mist hover:text-foam"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        )}

        {/* Center-right: zoom + grid */}
        {!preview && (
          <div className="hidden md:flex items-center gap-1.5">
            {/* Grid toggle */}
            <button
              onClick={() => setShowGrid(g => !g)}
              title="Toggle grid (G)"
              className={`flex items-center justify-center h-7 w-7 rounded-lg border transition-colors ${
                showGrid
                  ? "border-teal/50 text-teal bg-teal/10"
                  : "border-edge text-mist/50 hover:text-foam hover:border-foam/30"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="2" cy="2" r="1.2"/><circle cx="8" cy="2" r="1.2"/><circle cx="14" cy="2" r="1.2"/>
                <circle cx="2" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="14" cy="8" r="1.2"/>
                <circle cx="2" cy="14" r="1.2"/><circle cx="8" cy="14" r="1.2"/><circle cx="14" cy="14" r="1.2"/>
              </svg>
            </button>
            {/* Zoom control */}
            <div className="flex items-center rounded-lg bg-panel border border-edge overflow-hidden">
              <button
                onClick={() => adjustZoom(-0.1)}
                title="Zoom out (Cmd+−)"
                className="px-2 py-1 text-base text-mist hover:text-foam hover:bg-white/[0.04] transition-colors leading-none"
              >−</button>
              <button
                onClick={() => setZoom(1)}
                title="Reset zoom (Cmd+0)"
                className="px-2 py-1 text-[11px] font-mono text-mist hover:text-foam hover:bg-white/[0.04] transition-colors min-w-[42px] text-center tabular-nums"
              >{Math.round(zoom * 100)}%</button>
              <button
                onClick={() => adjustZoom(0.1)}
                title="Zoom in (Cmd+=)"
                className="px-2 py-1 text-base text-mist hover:text-foam hover:bg-white/[0.04] transition-colors leading-none"
              >+</button>
            </div>
          </div>
        )}

        {/* Right: undo/redo + status + publish + preview */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Undo/Redo */}
          {!preview && (
            <div className="flex items-center gap-0.5 rounded-lg bg-panel border border-edge p-0.5">
              <button
                onClick={undo}
                disabled={!canUndo}
                title="Undo (Cmd+Z)"
                className="px-2 py-1 rounded-md text-sm text-mist hover:text-foam disabled:opacity-25 transition-colors"
              >
                &#x21ba;
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                title="Redo (Cmd+Shift+Z)"
                className="px-2 py-1 rounded-md text-sm text-mist hover:text-foam disabled:opacity-25 transition-colors"
              >
                &#x21bb;
              </button>
            </div>
          )}

          {/* Save status */}
          {saveLabel && (
            <span className={`text-xs font-medium transition-colors ${
              saveStatus === "error" ? "text-loonred" :
              saveStatus === "saved" ? "text-teal" : "text-mist"
            }`}>
              {saveLabel}
            </span>
          )}

          {/* Live link */}
          <a
            href={`/p/${initialSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline text-xs text-mist hover:text-sky transition-colors"
          >
            /p/{initialSlug}&nbsp;&#x2197;
          </a>

          {/* Published toggle */}
          <label className="flex cursor-pointer items-center gap-2 select-none">
            <span className="text-xs text-mist">Published</span>
            <span
              role="checkbox"
              aria-checked={isPublished}
              onClick={() => {
                const next = !isPublished;
                setIsPublished(next);
                saveMeta("is_published", next);
              }}
              className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 transition-colors ${
                isPublished ? "bg-teal border-teal" : "bg-panel border-edge"
              }`}
            >
              <span className={`inline-block h-3 w-3 mt-0.5 rounded-full bg-white shadow transition-transform ${
                isPublished ? "translate-x-4" : "translate-x-0.5"
              }`} />
            </span>
          </label>

          {/* Preview toggle */}
          <button
            onClick={togglePreview}
            title="Preview (Cmd+P)"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              preview
                ? "bg-teal text-ink hover:brightness-110"
                : "border border-edge text-mist hover:border-foam hover:text-foam"
            }`}
          >
            {preview ? "&#x2190; Edit" : "Preview"}
          </button>
        </div>
      </header>


      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {!preview && (
          <Sidebar
            blocks={blocks}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdd={(type) => handleAddBlock(type, selectedId)}
            onToggleHidden={toggleHidden}
            onReorder={reorderBlocks}
            onAddGroup={() => addBlock("group", selectedId)}
          />
        )}

        <BlockCanvas
          blocks={blocks}
          selectedId={selectedId}
          preview={preview}
          canvasWidth={canvasWidth}
          onSelect={setSelectedId}
          onEdit={(blockId, field, value) => updateBlock(blockId, { [field]: value })}
          onDelete={deleteBlock}
          onMove={moveBlock}
          onReorder={reorderBlocks}
          onDuplicate={duplicateBlock}
          onAdd={(type, afterId) => addBlock(type, afterId)}
          onDeselect={() => setSelectedId(null)}
          zoom={zoom}
          onZoom={adjustZoom}
          showGrid={showGrid}
        />

        {!preview && selectedBlock && (
          <PropsPanel block={selectedBlock} onChange={updateBlock} />
        )}
        {!preview && !selectedBlock && (
          <PageInfoPanel
            title={title}
            setTitle={setTitle}
            slug={initialSlug}
            isPublished={isPublished}
            setIsPublished={setIsPublished}
            onSaveMeta={saveMeta}
            blockCount={blocks.filter(b => b.type !== "group").length}
          />
        )}
      </div>

      {/* ── Status bar / keyboard hint (bottom) ── */}
      {!preview && (
        <div className="flex shrink-0 items-center justify-between border-t border-edge/30 bg-surface/60 px-4 py-1.5">
          <span className="text-[10px] text-mist/40 flex items-center gap-3">
            <span><kbd className="rounded bg-panel border border-edge/50 px-1 py-0.5 font-mono text-[9px]">&#x2318;Z</kbd> Undo</span>
            <span><kbd className="rounded bg-panel border border-edge/50 px-1 py-0.5 font-mono text-[9px]">&#x2318;D</kbd> Dup</span>
            <span><kbd className="rounded bg-panel border border-edge/50 px-1 py-0.5 font-mono text-[9px]">Del</kbd> Delete</span>
            <span><kbd className="rounded bg-panel border border-edge/50 px-1 py-0.5 font-mono text-[9px]">G</kbd> Grid</span>
            <span className="text-mist/25">&#x2502;</span>
            <span>Double-click to edit inline</span>
          </span>
          <span className="text-[10px] text-mist/35 flex items-center gap-3 tabular-nums">
            {selectedBlock && (
              <span className="text-teal/70">{selectedBlock.name || selectedBlock.type}</span>
            )}
            <span>{blocks.filter(b => b.type !== "group").length} blocks</span>
            <span className="font-mono">{Math.round(zoom * 100)}%</span>
          </span>
        </div>
      )}
    </div>
  );

  if (!portalMounted) return null;
  return createPortal(builderEl, document.body);
}