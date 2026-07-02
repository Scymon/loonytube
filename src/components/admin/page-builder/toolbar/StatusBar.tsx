"use client";

import type { Block } from "../types";

// Bottom bar: shortcut hints + selection / count / zoom readouts.
export default function StatusBar({
  selectedBlock, blockCount, zoom,
}: {
  selectedBlock: Block | null;
  blockCount: number;
  zoom: number;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between border-t border-edge/30 bg-surface/60 px-4 py-1.5">
      <span className="text-[10px] text-mist/40 flex items-center gap-3">
        <span><kbd className="rounded bg-panel border border-edge/50 px-1 py-0.5 font-mono text-[9px]">⌘Z</kbd> Undo</span>
        <span><kbd className="rounded bg-panel border border-edge/50 px-1 py-0.5 font-mono text-[9px]">⌘D</kbd> Dup</span>
        <span><kbd className="rounded bg-panel border border-edge/50 px-1 py-0.5 font-mono text-[9px]">Del</kbd> Delete</span>
        <span><kbd className="rounded bg-panel border border-edge/50 px-1 py-0.5 font-mono text-[9px]">G</kbd> Grid</span>
        <span className="text-mist/25">│</span>
        <span>Double-click to edit inline</span>
      </span>
      <span className="text-[10px] text-mist/35 flex items-center gap-3 tabular-nums">
        {selectedBlock && (
          <span className="text-teal/70">{selectedBlock.name || selectedBlock.type}</span>
        )}
        <span>{blockCount} blocks</span>
        <span className="font-mono">{Math.round(zoom * 100)}%</span>
      </span>
    </div>
  );
}
