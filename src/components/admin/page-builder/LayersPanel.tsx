"use client";
import { useState } from "react";
import type { Block } from "./types";
import { BLOCK_META } from "./types";
import BlockIcon from "./BlockIcon";

/* ─── Name helpers ───────────────────────────────────────────────────────────*/
function autoName(block: Block): string {
  if (block.name) return block.name;
  const p = block.props;
  switch (block.type) {
    case "group":    return (p.name as string) || "Group";
    case "hero":     return (p.heading as string)?.slice(0, 30) || "Hero";
    case "text": {
      const raw = (p.content as string) || "";
      return raw.split("\n")[0].replace(/^#+\s*/, "").slice(0, 30) || "Text";
    }
    case "cta":      return (p.heading as string)?.slice(0, 30) || "Call to Action";
    case "image":    return (p.alt as string) || (p.caption as string) || "Image";
    case "video":    return (p.title as string) || "Video";
    case "features": return (p.heading as string) || "Features";
    case "columns":  return "Columns";
    case "divider":  return "Divider";
    case "spacer":   return "Spacer";
    default:         return block.type;
  }
}

/* ─── Tree builder ───────────────────────────────────────────────────────────*/
type GroupItem = { kind: "group"; block: Block; members: Block[]; flatIdx: number };
type BlockItem = { kind: "block"; block: Block; flatIdx: number };
type TreeItem  = GroupItem | BlockItem;

function buildTree(blocks: Block[]): TreeItem[] {
  const items: TreeItem[] = [];
  const byId = new Map<string, GroupItem>();
  blocks.forEach((block, flatIdx) => {
    if (block.type === "group") {
      const item: GroupItem = { kind: "group", block, members: [], flatIdx };
      items.push(item);
      byId.set(block.id, item);
    } else if (block.groupId && byId.has(block.groupId)) {
      byId.get(block.groupId)!.members.push(block);
    } else {
      items.push({ kind: "block", block, flatIdx });
    }
  });
  return items;
}

/* ─── Micro SVG icons ────────────────────────────────────────────────────────*/
function Eye() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function EyeOff() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}
function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
function Grip() {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" className="fill-current">
      <circle cx="2" cy="1.5" r="1.2"/><circle cx="6" cy="1.5" r="1.2"/>
      <circle cx="2" cy="6"   r="1.2"/><circle cx="6" cy="6"   r="1.2"/>
      <circle cx="2" cy="10.5" r="1.2"/><circle cx="6" cy="10.5" r="1.2"/>
    </svg>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────*/
type Props = {
  blocks: Block[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onReorder: (newOrder: Block[]) => void;
  onAddGroup: () => void;
};

export default function LayersPanel({
  blocks, selectedId, onSelect, onToggleHidden, onReorder, onAddGroup,
}: Props) {
  const [collapsed,   setCollapsed]   = useState<Set<string>>(new Set());
  const [editId,      setEditId]      = useState<string | null>(null);
  const [editName,    setEditName]    = useState("");
  const [dragId,      setDragId]      = useState<string | null>(null);
  const [overGroupId, setOverGroupId] = useState<string | null>(null);
  const [overBlockId, setOverBlockId] = useState<string | null>(null);

  const tree = buildTree(blocks);

  /* ── Collapse / expand ── */
  function toggleCollapse(id: string) {
    setCollapsed(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  /* ── Rename ── */
  function startEdit(block: Block) {
    setEditId(block.id);
    if (block.type === "group") {
      setEditName((block.props.name as string) || "Group");
    } else {
      setEditName(block.name || autoName(block));
    }
  }
  function commitEdit() {
    if (!editId) return;
    const target = blocks.find(b => b.id === editId);
    const next = blocks.map(b => {
      if (b.id !== editId) return b;
      if (b.type === "group") return { ...b, props: { ...b.props, name: editName } };
      return { ...b, name: editName };
    });
    onReorder(next);
    setEditId(null);
    void target; // suppress unused var
  }

  /* ── Delete group ── */
  function deleteGroup(groupId: string) {
    const next = blocks
      .filter(b => b.id !== groupId)
      .map(b => b.groupId === groupId ? { ...b, groupId: undefined } : b);
    onReorder(next);
  }

  /* ── Remove block from group ── */
  function removeFromGroup(blockId: string) {
    onReorder(blocks.map(b => b.id === blockId ? { ...b, groupId: undefined } : b));
  }

  /* ── DnD ── */
  function startDrag(e: React.DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function onOverGroup(e: React.DragEvent, groupId: string) {
    e.preventDefault(); e.stopPropagation();
    setOverGroupId(groupId); setOverBlockId(null);
  }

  function onOverBlock(e: React.DragEvent, blockId: string) {
    e.preventDefault(); e.stopPropagation();
    setOverBlockId(blockId); setOverGroupId(null);
  }

  function dropOnGroup(e: React.DragEvent, groupId: string) {
    e.preventDefault(); e.stopPropagation();
    if (!dragId || dragId === groupId) { resetDrag(); return; }
    // Move dragged block just after the group header, assign groupId
    const moved = blocks.find(b => b.id === dragId);
    if (!moved) { resetDrag(); return; }
    const rest = blocks.filter(b => b.id !== dragId);
    const gi   = rest.findIndex(b => b.id === groupId);
    rest.splice(gi + 1, 0, { ...moved, groupId });
    onReorder(rest);
    resetDrag();
  }

  function dropOnBlock(e: React.DragEvent, targetId: string) {
    e.preventDefault(); e.stopPropagation();
    if (!dragId || dragId === targetId) { resetDrag(); return; }
    const source = blocks.find(b => b.id === dragId);
    if (!source) { resetDrag(); return; }

    if (source.type === "group") {
      // Move group header + all its members as a unit
      const members = blocks.filter(b => b.groupId === dragId);
      const rest    = blocks.filter(b => b.id !== dragId && b.groupId !== dragId);
      const ti      = rest.findIndex(b => b.id === targetId);
      if (ti >= 0) rest.splice(ti, 0, source, ...members);
      onReorder(rest);
    } else {
      // Standard reorder (preserve groupId)
      const fi = blocks.findIndex(b => b.id === dragId);
      const ti = blocks.findIndex(b => b.id === targetId);
      const next = [...blocks];
      const [m] = next.splice(fi, 1);
      next.splice(ti, 0, m);
      onReorder(next);
    }
    resetDrag();
  }

  function resetDrag() {
    setDragId(null); setOverGroupId(null); setOverBlockId(null);
  }

  /* ── Block row ── */
  function BlockRow({
    block, indented = false,
  }: { block: Block; indented?: boolean }) {
    const isSelected = selectedId === block.id;
    const meta       = BLOCK_META[block.type];

    return (
      <li
        draggable
        onDragStart={(e) => startDrag(e, block.id)}
        onDragOver={(e)  => onOverBlock(e, block.id)}
        onDrop={(e)      => dropOnBlock(e, block.id)}
        onDragEnd={resetDrag}
        onClick={() => onSelect(block.id)}
        style={{ paddingLeft: indented ? 22 : undefined }}
        className={[
          "group/row relative flex items-center gap-1.5 mx-1.5 px-2 py-[5px] rounded-lg",
          "cursor-pointer transition-all duration-100 select-none",
          isSelected         ? "bg-teal/15 ring-1 ring-teal/25" : "hover:bg-white/[0.04]",
          dragId === block.id && "opacity-25",
          overBlockId === block.id && dragId !== block.id && "ring-1 ring-teal/40 ring-inset",
        ].filter(Boolean).join(" ")}
      >
        {/* Grip */}
        <span className="shrink-0 text-mist opacity-0 group-hover/row:opacity-25 cursor-grab">
          <Grip />
        </span>

        {/* Type icon */}
        <span className={[
          "flex h-5 w-5 shrink-0 items-center justify-center rounded",
          isSelected ? "bg-teal/20 text-teal" : "bg-white/[0.06] text-mist/60",
        ].join(" ")}>
          <BlockIcon type={block.type} size={12} />
        </span>

        {/* Name — double-click to rename */}
        {editId === block.id ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") setEditId(null);
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 bg-transparent text-[11px] font-medium text-foam
              outline-none border-b border-teal/50 pb-px"
          />
        ) : (
          <span
            onDoubleClick={(e) => { e.stopPropagation(); startEdit(block); }}
            title="Double-click to rename"
            className={[
              "flex-1 min-w-0 truncate text-[11px] font-medium leading-tight",
              isSelected ? "text-foam" : "text-mist/80 group-hover/row:text-foam",
              block.hidden ? "line-through opacity-50" : "",
            ].filter(Boolean).join(" ")}
          >
            {autoName(block)}
          </span>
        )}

        {/* Remove-from-group button (only for grouped blocks) */}
        {indented && (
          <button
            onClick={(e) => { e.stopPropagation(); removeFromGroup(block.id); }}
            title="Remove from group"
            className="shrink-0 rounded p-0.5 text-transparent group-hover/row:text-mist/30
              hover:!text-mist transition-colors"
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        )}

        {/* Eye toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleHidden(block.id); }}
          title={block.hidden ? "Show" : "Hide"}
          className={[
            "shrink-0 rounded p-0.5 transition-all",
            block.hidden
              ? "text-mist/50"
              : "text-transparent group-hover/row:text-mist/35 hover:!text-foam",
          ].join(" ")}
        >
          {block.hidden ? <EyeOff /> : <Eye />}
        </button>
      </li>
    );
  }

  /* ── Empty state ── */
  const nonGroupBlocks = blocks.filter(b => b.type !== "group");
  if (nonGroupBlocks.length === 0 && blocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 px-5 text-center">
        <p className="text-[11px] text-mist/40 leading-relaxed">
          No blocks yet.<br/>
          Switch to <span className="text-teal/70">Blocks</span> to add one.
        </p>
      </div>
    );
  }

  /* ── Render ── */
  return (
    <ul
      className="py-2"
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) resetDrag();
      }}
    >
      {tree.map((item) => {
        if (item.kind === "group") {
          const { block, members } = item;
          const isOpen    = !collapsed.has(block.id);
          const isEditing = editId === block.id;
          const isOver    = overGroupId === block.id && dragId !== block.id;

          return (
            <li key={block.id} className="mx-1.5 mb-0.5">
              {/* Group header */}
              <div
                draggable
                onDragStart={(e) => startDrag(e, block.id)}
                onDragOver={(e)  => onOverGroup(e, block.id)}
                onDrop={(e)      => dropOnGroup(e, block.id)}
                onDragEnd={resetDrag}
                className={[
                  "group/grp flex items-center gap-1.5 rounded-lg px-1.5 py-1 cursor-pointer",
                  "border transition-all duration-100 select-none",
                  isOver
                    ? "border-teal/50 bg-teal/10 shadow-[0_0_0_1px_theme(colors.teal/0.3)_inset]"
                    : "border-edge/40 bg-white/[0.03] hover:bg-white/[0.05] hover:border-edge/60",
                  dragId === block.id && "opacity-25",
                ].filter(Boolean).join(" ")}
              >
                {/* Grip */}
                <span className="shrink-0 text-mist opacity-0 group-hover/grp:opacity-25 cursor-grab">
                  <Grip />
                </span>

                {/* Collapse arrow */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCollapse(block.id); }}
                  className="shrink-0 text-mist/50 hover:text-foam transition-colors"
                >
                  <Chevron open={isOpen} />
                </button>

                {/* Folder icon */}
                <span className={[
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded",
                  isOver ? "text-teal" : "text-mist/60",
                ].join(" ")}>
                  <BlockIcon type="group" size={12} />
                </span>

                {/* Name / rename input */}
                {isEditing ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditId(null); }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 bg-transparent text-[11px] font-semibold text-foam
                      outline-none border-b border-teal/50 pb-px"
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => { e.stopPropagation(); startEdit(block); }}
                    title="Double-click to rename"
                    className="flex-1 min-w-0 truncate text-[11px] font-semibold text-mist/90
                      group-hover/grp:text-foam transition-colors"
                  >
                    {autoName(block)}
                  </span>
                )}

                {/* Member count badge */}
                <span className="shrink-0 text-[9px] font-bold text-mist/40 px-1.5 py-0.5
                  rounded-full bg-white/[0.05] tabular-nums">
                  {members.length}
                </span>

                {/* Delete group */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (members.length > 0 && !window.confirm("Ungroup all blocks?")) return;
                    deleteGroup(block.id);
                  }}
                  title="Delete group"
                  className="shrink-0 text-transparent group-hover/grp:text-mist/30
                    hover:!text-loonred transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* Group children */}
              {isOpen && members.length > 0 && (
                <ul className="mt-0.5 space-y-0.5 border-l border-edge/30 ml-3.5 pl-0">
                  {members.map((m) => (
                    <BlockRow key={m.id} block={m} indented />
                  ))}
                </ul>
              )}

              {/* Empty-group drop target */}
              {isOpen && members.length === 0 && (
                <div
                  onDragOver={(e) => onOverGroup(e, block.id)}
                  onDrop={(e)     => dropOnGroup(e, block.id)}
                  className="ml-3.5 mt-0.5 flex items-center justify-center rounded-lg border
                    border-dashed border-edge/30 py-2 text-[10px] text-mist/30
                    transition-colors hover:border-teal/30 hover:text-teal/50"
                >
                  Drop blocks here
                </div>
              )}
            </li>
          );
        }

        /* Regular ungrouped block */
        return <BlockRow key={item.block.id} block={item.block} />;
      })}
    </ul>
  );
}
