"use client";

import { useEffect, useRef, useState } from "react";
import type { Block, BlockType } from "./types";
import { BLOCK_META, BLOCK_ORDER } from "./types";
import BlockIcon from "./BlockIcon";
import BlockRenderer from "./blocks/BlockRenderer";

type CanvasWidth = "desktop" | "tablet" | "mobile";

type Props = {
  blocks: Block[];
  selectedId: string | null;
  preview: boolean;
  canvasWidth: CanvasWidth;
  onSelect: (id: string) => void;
  onEdit: (blockId: string, field: string, value: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: "up" | "down") => void;
  onReorder: (newOrder: Block[]) => void;
  onDuplicate: (id: string) => void;
  onAdd: (type: BlockType, afterId: string | null) => void;
  onDeselect: () => void;
  zoom: number;
  onZoom: (delta: number) => void;
  showGrid: boolean;
};

const WIDTH_CLASS: Record<CanvasWidth, string> = {
  desktop: "max-w-5xl",
  tablet:  "max-w-xl",
  mobile:  "max-w-sm",
};

/** Mini block-type picker that appears between blocks */
function AddMenu({
  onPick,
  onClose,
}: {
  onPick: (type: BlockType) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="mx-4 my-1 rounded-2xl border border-edge/70 bg-surface/95 backdrop-blur-sm
        shadow-xl shadow-black/40 p-3 z-40 relative"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-mist">Insert block</p>
        <button
          onClick={onClose}
          className="text-xs text-mist/50 hover:text-foam transition-colors px-1"
        >
          esc
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {BLOCK_ORDER.map((type) => {
          const m = BLOCK_META[type];
          return (
            <button
              key={type}
              onClick={() => { onPick(type); }}
              className="flex flex-col items-center gap-1 rounded-xl border border-edge/50 bg-panel/80
                px-2 py-2.5 text-xs hover:border-teal/40 hover:bg-teal/5 hover:text-teal
                text-mist transition-all"
            >
              <span className="flex items-center justify-center text-mist group-hover:text-teal transition-colors">
                <BlockIcon type={type} size={18} />
              </span>
              <span className="font-medium">{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function BlockCanvas({
  blocks, selectedId, preview, canvasWidth,
  onSelect, onEdit, onDelete, onMove, onReorder, onDuplicate, onAdd, onDeselect,
  zoom, onZoom, showGrid,
}: Props) {
  const mainRef = useRef<HTMLElement>(null);
  const dragId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [insertAtIdx, setInsertAtIdx] = useState<number | null>(null);

  // Ctrl/Cmd + scroll → zoom
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    function handle(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        onZoom(e.deltaY > 0 ? -0.05 : 0.05);
      }
    }
    el.addEventListener("wheel", handle, { passive: false });
    return () => el.removeEventListener("wheel", handle);
  }, [onZoom]);

  function startInline(id: string) {
    const block = blocks.find((b) => b.id === id);
    if (!block || !["hero", "text", "cta"].includes(block.type)) return;
    setEditingId(id);
    onSelect(id);
  }

  function stopInline() { setEditingId(null); }

  function handleDragStart(e: React.DragEvent, id: string) {
    dragId.current = id;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverId !== id) setDragOverId(id);
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    const fromId = dragId.current;
    if (!fromId || fromId === targetId) { cleanup(); return; }
    const from = blocks.findIndex((b) => b.id === fromId);
    const to   = blocks.findIndex((b) => b.id === targetId);
    if (from === -1 || to === -1) { cleanup(); return; }
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
    cleanup();
  }

  function cleanup() { dragId.current = null; setDragOverId(null); }

  const INLINE_TYPES = new Set(["hero", "text", "cta"]);

  const renderableBlocks = blocks.filter(b => b.type !== "group" && !b.hidden);
  if (renderableBlocks.length === 0 && !preview) {
    return (
      <main
        ref={mainRef}
        className="flex flex-1 flex-col items-center justify-center bg-[#0b0d11]"
        style={showGrid ? {
          backgroundImage: "radial-gradient(circle, rgba(99,179,237,0.18) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        } : undefined}
        onClick={onDeselect}
      >
        <div className="text-center text-mist space-y-3">
          <p className="text-5xl opacity-20">+</p>
          <p className="text-sm">Click a block type in the sidebar to start building.</p>
          <p className="text-xs text-mist/50">Or drag blocks from the left panel onto the canvas.</p>
        </div>
      </main>
    );
  }

  return (
    <main
      ref={mainRef}
      className="relative flex-1 overflow-y-auto bg-[#0b0d11]"
      style={showGrid ? {
        backgroundImage: "radial-gradient(circle, rgba(99,179,237,0.18) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      } : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) { onDeselect(); setEditingId(null); setInsertAtIdx(null); }
      }}
    >
      {/* Page card — zoom applied here */}
      <div style={{ zoom }}>
      <div
        className={`mx-auto w-full transition-[max-width] duration-300 ring-1 ring-white/[0.07] shadow-[0_40px_100px_rgba(0,0,0,0.8)] bg-ink min-h-[100dvh] ${WIDTH_CLASS[canvasWidth]}`}
      >
        {/* First-block add button (top) */}
        {!preview && (
          <div className="relative h-4 flex items-center justify-center">
            {insertAtIdx === -1 ? (
              <AddMenu
                onPick={(type) => { onAdd(type, null); setInsertAtIdx(null); }}
                onClose={() => setInsertAtIdx(null)}
              />
            ) : (
              <div className="group/add w-full h-4 flex items-center justify-center z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); setInsertAtIdx(-1); }}
                  className="h-5 w-5 rounded-full bg-surface border border-edge flex items-center justify-center
                    text-xs text-mist hover:text-teal hover:border-teal/50 transition-all shadow-sm z-20
                    opacity-0 group-hover/add:opacity-100"
                >+</button>
              </div>
            )}
          </div>
        )}

        {blocks.map((block, idx) => {
          if (block.hidden || block.type === 'group') return null;
          const isSelected = selectedId === block.id;
          const isEditing  = editingId === block.id;
          const isDragOver = dragOverId === block.id;

          return (
            <div key={block.id}>
              {/* ── Block wrapper ── */}
              <div
                className={[
                  "relative group/block",
                  !preview && "cursor-pointer",
                  isDragOver && "outline outline-2 outline-sky/60",
                  isSelected && !preview && "outline outline-2 outline-teal/60 outline-offset-[-2px]",
                ].filter(Boolean).join(" ")}
                draggable={!preview && !isEditing}
                onDragStart={(e) => handleDragStart(e, block.id)}
                onDragOver={(e) => handleDragOver(e, block.id)}
                onDrop={(e) => handleDrop(e, block.id)}
                onDragEnd={cleanup}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!preview) {
                    setInsertAtIdx(null);
                    if (!isEditing) { onSelect(block.id); stopInline(); }
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (!preview && INLINE_TYPES.has(block.type)) startInline(block.id);
                }}
              >
                {/* ── Floating contextual toolbar ── */}
                {!preview && isSelected && (
                  <div
                    className="absolute -top-9 left-1/2 -translate-x-1/2 z-30
                      flex items-center rounded-xl bg-surface border border-edge/80
                      shadow-xl shadow-black/50 overflow-hidden select-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Drag handle */}
                    <div
                      className="flex items-center gap-1 px-2.5 py-1.5 border-r border-edge cursor-grab active:cursor-grabbing"
                      title="Drag to reorder"
                    >
                      <svg width="10" height="14" viewBox="0 0 10 14" className="text-mist/50 fill-current">
                        <circle cx="3" cy="2.5" r="1.3"/><circle cx="7" cy="2.5" r="1.3"/>
                        <circle cx="3" cy="7"   r="1.3"/><circle cx="7" cy="7"   r="1.3"/>
                        <circle cx="3" cy="11.5" r="1.3"/><circle cx="7" cy="11.5" r="1.3"/>
                      </svg>
                    </div>
                    {/* Type label */}
                    <span className="px-2.5 text-[10px] font-semibold text-mist/60 border-r border-edge">
                      {BLOCK_META[block.type].label}
                    </span>
                    {/* Inline edit hint */}
                    {INLINE_TYPES.has(block.type) && !isEditing && (
                      <button
                        onClick={(e) => { e.stopPropagation(); startInline(block.id); }}
                        className="px-2.5 py-1.5 text-xs text-mist hover:text-foam hover:bg-edge/40 transition-colors border-r border-edge"
                        title="Edit inline (double-click)"
                      >
                        Edit
                      </button>
                    )}
                    {isEditing && (
                      <button
                        onClick={(e) => { e.stopPropagation(); stopInline(); }}
                        className="px-2.5 py-1.5 text-xs text-teal hover:text-foam hover:bg-teal/10 transition-colors border-r border-edge"
                      >
                        Done
                      </button>
                    )}
                    {/* Duplicate */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onDuplicate(block.id); }}
                      className="px-2.5 py-1.5 text-xs text-mist hover:text-foam hover:bg-edge/40 transition-colors"
                      title="Duplicate (Cmd+D)"
                    >
                      &#x2398;
                    </button>
                    {/* Up */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onMove(block.id, "up"); }}
                      disabled={idx === 0}
                      className="px-2 py-1.5 text-sm text-mist hover:text-foam hover:bg-edge/40 disabled:opacity-20 transition-colors"
                      title="Move up"
                    >&#x2191;</button>
                    {/* Down */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onMove(block.id, "down"); }}
                      disabled={idx === blocks.length - 1}
                      className="px-2 py-1.5 text-sm text-mist hover:text-foam hover:bg-edge/40 disabled:opacity-20 transition-colors"
                      title="Move down"
                    >&#x2193;</button>
                    {/* Delete */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Delete this block?")) { onDelete(block.id); stopInline(); }
                      }}
                      className="px-2.5 py-1.5 text-sm text-mist/50 hover:text-loonred hover:bg-loonred/10 transition-colors"
                      title="Delete"
                    >&#x00d7;</button>
                  </div>
                )}

                {/* ── Block content ── */}
                <BlockRenderer
                  block={block}
                  editing={isEditing}
                  onEdit={(field, value) => { onEdit(block.id, field, value); }}
                />

                {/* Hover ring hint (non-selected) */}
                {!preview && !isSelected && (
                  <div className="pointer-events-none absolute inset-0
                    ring-1 ring-inset ring-transparent group-hover/block:ring-white/10 transition-all" />
                )}
              </div>

              {/* ── Between-block add button ── */}
              {!preview && (
                insertAtIdx === idx ? (
                  <AddMenu
                    onPick={(type) => {
                      onAdd(type, block.id);
                      setInsertAtIdx(null);
                    }}
                    onClose={() => setInsertAtIdx(null)}
                  />
                ) : (
                  <div className="group/add relative h-5 flex items-center justify-center z-10">
                    <div className="absolute inset-x-0 h-px bg-transparent group-hover/add:bg-edge/30 transition-colors" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setInsertAtIdx(idx); }}
                      className="relative h-5 w-5 rounded-full bg-surface border border-edge flex items-center justify-center
                        text-xs text-mist hover:text-teal hover:border-teal/50 transition-all shadow-sm
                        opacity-0 group-hover/add:opacity-100"
                    >+</button>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
      </div>{/* /zoom wrapper */}
    </main>
  );
}
