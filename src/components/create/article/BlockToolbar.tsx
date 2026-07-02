"use client";

import { useState } from "react";
import { BLOCK_TYPES, type BlockType } from "@/types/article";

// Floating per-block toolbar: move, retype, delete.
export default function BlockToolbar({
  canUp, canDown, currentType, onUp, onDown, onChangeType, onDelete, onAddImage,
}: {
  canUp: boolean;
  canDown: boolean;
  currentType: BlockType;
  onUp: () => void;
  onDown: () => void;
  onChangeType: (t: BlockType) => void;
  onDelete: () => void;
  onAddImage: () => void;
}) {
  const [typeOpen, setTypeOpen] = useState(false);
  const cfg = BLOCK_TYPES.find((b) => b.type === currentType);

  return (
    <div className="relative flex items-center gap-0.5 rounded-full border border-edge bg-ink/90 px-1.5 py-1 shadow-lg backdrop-blur-sm"
      onMouseDown={(e) => e.preventDefault()} // don't steal focus
    >
      {/* Move up */}
      <ToolBtn onClick={onUp} disabled={!canUp} title="Move up">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 2l4 5H2z"/>
        </svg>
      </ToolBtn>
      {/* Move down */}
      <ToolBtn onClick={onDown} disabled={!canDown} title="Move down">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 10L2 5h8z"/>
        </svg>
      </ToolBtn>

      <span className="mx-1 h-3 w-px bg-edge/60" />

      {/* Type switcher */}
      <div className="relative">
        <ToolBtn onClick={() => setTypeOpen((o) => !o)} title="Change block type">
          <span className="text-[10px] font-bold">{cfg?.icon}</span>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className="ml-0.5 opacity-60">
            <path d="M4 6L1 3h6z"/>
          </svg>
        </ToolBtn>
        {typeOpen && (
          <div className="absolute bottom-full right-0 mb-1.5 flex gap-1 rounded-xl border border-edge bg-ink/95 p-1.5 shadow-xl backdrop-blur-sm">
            {BLOCK_TYPES.map((b) => (
              <button
                key={b.type}
                title={b.label}
                onClick={() => {
                  if (b.type === "image") { onAddImage(); }
                  else { onChangeType(b.type); }
                  setTypeOpen(false);
                }}
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold transition",
                  b.type === currentType
                    ? "bg-teal/20 text-teal"
                    : "text-mist hover:bg-edge/40 hover:text-foam",
                ].join(" ")}
              >
                {b.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="mx-1 h-3 w-px bg-edge/60" />

      {/* Delete */}
      <ToolBtn onClick={onDelete} title="Delete block" danger>
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 2l7 7M9 2L2 9"/>
        </svg>
      </ToolBtn>
    </div>
  );
}

function ToolBtn({
  onClick, disabled, title, danger, children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        "flex h-6 w-6 items-center justify-center rounded-full transition",
        disabled
          ? "text-mist/30 cursor-not-allowed"
          : danger
          ? "text-mist hover:bg-loonred/20 hover:text-loonred"
          : "text-mist hover:bg-edge/60 hover:text-foam",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// Kept from the original composer (currently unused by the editor UI, preserved
// for parity — the cMenu bar superseded it).
export function AddBar({ onAdd, uploading }: { onAdd: (t: BlockType) => void; uploading: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-mist/40">Add</span>
      {BLOCK_TYPES.map(({ type, icon, label }) => (
        <button
          key={type}
          onClick={() => onAdd(type)}
          title={label}
          disabled={uploading}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-mist/50 transition hover:bg-edge/40 hover:text-foam disabled:opacity-30"
        >
          {icon}
        </button>
      ))}
      {uploading && <span className="ml-1 text-xs text-mist">Uploading…</span>}
    </div>
  );
}
