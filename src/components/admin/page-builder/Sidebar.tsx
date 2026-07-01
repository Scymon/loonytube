"use client";
import { useState } from "react";
import type { Block, BlockType } from "./types";
import { BLOCK_META, BLOCK_ORDER } from "./types";
import BlockIcon from "./BlockIcon";
import LayersPanel from "./LayersPanel";

type Props = {
  blocks: Block[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: BlockType) => void;
  onToggleHidden: (id: string) => void;
  onReorder: (newOrder: Block[]) => void;
  onAddGroup: () => void;
};

export default function Sidebar({ blocks, selectedId, onSelect, onAdd, onToggleHidden, onReorder, onAddGroup }: Props) {
  const [tab, setTab] = useState<"layers" | "blocks">("layers");

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-edge bg-surface overflow-hidden">
      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-edge">
        {(["layers", "blocks"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "relative flex-1 py-2 text-[11px] font-semibold tracking-wide transition-colors",
              tab === t ? "text-foam" : "text-mist/40 hover:text-mist/70",
            ].join(" ")}
          >
            {tab === t && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-teal" />
            )}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "layers" ? (
          <LayersPanel
            blocks={blocks}
            selectedId={selectedId}
            onSelect={onSelect}
            onToggleHidden={onToggleHidden}
            onReorder={onReorder}
            onAddGroup={onAddGroup}
          />
        ) : (
          <BlocksPalette onAdd={onAdd} />
        )}
      </div>

      {/* Footer hint */}
      <div className="shrink-0 border-t border-edge px-2 py-2 flex items-center gap-2">
        {tab === "layers" ? (
          <>
            <button
              onClick={onAddGroup}
              className="flex items-center gap-1.5 rounded-lg border border-edge/50 px-2 py-1.5
                text-[10px] font-semibold text-mist/60 hover:text-foam hover:border-edge
                transition-colors bg-panel/40"
              title="Add a new layer group"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              New Group
            </button>
            <span className="ml-auto text-[9px] text-mist/25 tabular-nums">
              {blocks.filter(b => b.type !== "group").length} blocks
            </span>
          </>
        ) : (
          <p className="text-[9px] text-mist/30 leading-tight">Click to add after selection</p>
        )}
      </div>
    </aside>
  );
}

function BlocksPalette({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const [search, setSearch] = useState("");
  const q = search.toLowerCase();
  const filtered = BLOCK_ORDER.filter(type =>
    !q ||
    BLOCK_META[type].label.toLowerCase().includes(q) ||
    BLOCK_META[type].desc.toLowerCase().includes(q)
  );

  return (
    <div className="p-2">
      {/* Search */}
      <div className="relative mb-2">
        <svg
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mist/35"
          width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search blocks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg bg-panel border border-edge/60 pl-7 pr-2 py-1.5
            text-[11px] text-foam placeholder:text-mist/35 outline-none
            focus:border-teal/40 focus:ring-1 focus:ring-teal/20 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-mist/40 hover:text-foam"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="px-2 py-6 text-center text-[11px] text-mist/40">No blocks match &quot;{search}&quot;</p>
      ) : (
        <div className="space-y-0.5">
          {filtered.map((type) => {
            const meta = BLOCK_META[type];
            return (
              <button
                key={type}
                onClick={() => onAdd(type)}
                className="group/btn flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2
                  hover:bg-white/[0.05] transition-colors text-left"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg
                  bg-panel border border-edge/60 text-mist/60 transition-colors
                  group-hover/btn:border-teal/30 group-hover/btn:bg-teal/5 group-hover/btn:text-teal">
                  <BlockIcon type={type} size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-mist group-hover/btn:text-foam transition-colors truncate">
                    {meta.label}
                  </p>
                  <p className="text-[9px] text-mist/40 truncate leading-tight">{meta.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
