"use client";

import { BLOCK_META, BLOCK_ORDER, type BlockType } from "./types";

type Props = {
  selectedId: string | null;
  onAdd: (type: BlockType) => void;
};

export default function BlockPalette({ selectedId, onAdd }: Props) {
  return (
    <aside className="flex w-48 shrink-0 flex-col border-r border-edge bg-surface overflow-y-auto">
      <div className="px-3 pt-4 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-mist">Blocks</p>
      </div>
      <ul className="flex-1 px-2 pb-4 space-y-0.5">
        {BLOCK_ORDER.map((type) => {
          const meta = BLOCK_META[type];
          return (
            <li key={type}>
              <button
                onClick={() => onAdd(type)}
                title={meta.desc}
                className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-edge/60 active:bg-edge"
              >
                <span className="text-base leading-none" role="img" aria-hidden>{meta.icon}</span>
                <div className="min-w-0">
                  <p className="font-medium text-foam group-hover:text-white">{meta.label}</p>
                  <p className="truncate text-[10px] text-mist">{meta.desc}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
