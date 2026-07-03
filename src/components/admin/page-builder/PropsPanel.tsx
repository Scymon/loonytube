"use client";

import type { Block } from "./types";
import type { NodeStyle } from "./style";
import StylePanel from "./props-panel/StylePanel";
import { HeroPanel, TextPanel, CtaPanel } from "./props-panel/panels-content";
import { ImagePanel, VideoPanel } from "./props-panel/panels-media";
import { FeaturesPanel, ColumnsPanel, SpacerPanel, DividerPanel } from "./props-panel/panels-layout";

// Preserved exports so PageBuilder's `import PropsPanel, { PageInfoPanel }` keeps working.
export { default as PageInfoPanel, type PageInfoPanelProps } from "./props-panel/PageInfoPanel";

type Props = {
  block: Block;
  onChange: (id: string, p: Record<string, unknown>) => void;
  onStyleChange: (id: string, patch: Partial<NodeStyle> | null) => void;
};

export default function PropsPanel({ block, onChange, onStyleChange }: Props) {
  function up(newProps: Record<string, unknown>) { onChange(block.id, newProps); }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-edge bg-surface">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-edge px-4 py-3">
        <div className="h-2 w-2 rounded-full bg-teal shrink-0" />
        <p className="text-xs font-semibold text-foam capitalize">{block.type}</p>
        {block.name && (
          <span className="text-[10px] text-mist/60 truncate">{block.name}</span>
        )}
        <span className="ml-auto text-[10px] text-mist/40 font-mono shrink-0">{block.id.slice(0, 8)}</span>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {block.type === "hero"     && <HeroPanel     p={block.props} up={up} />}
        {block.type === "text"     && <TextPanel     p={block.props} up={up} />}
        {block.type === "image"    && <ImagePanel    p={block.props} up={up} />}
        {block.type === "video"    && <VideoPanel    p={block.props} up={up} />}
        {block.type === "cta"      && <CtaPanel      p={block.props} up={up} />}
        {block.type === "features" && <FeaturesPanel p={block.props} up={up} />}
        {block.type === "columns"  && <ColumnsPanel  p={block.props} up={up} />}
        {block.type === "spacer"   && <SpacerPanel   p={block.props} up={up} />}
        {block.type === "divider"  && <DividerPanel  p={block.props} up={up} />}

        {/* Builder 2.0 — design properties, available on every block */}
        <StylePanel style={block.style} onStyle={(patch) => onStyleChange(block.id, patch)} />
      </div>
    </aside>
  );
}
