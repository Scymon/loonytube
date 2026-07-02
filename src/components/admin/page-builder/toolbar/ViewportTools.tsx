"use client";

export type CanvasWidth = "desktop" | "tablet" | "mobile";

const WIDTH_OPTS: { id: CanvasWidth; label: string; hint: string }[] = [
  { id: "desktop", label: "Desktop", hint: "Full width" },
  { id: "tablet",  label: "Tablet",  hint: "640px" },
  { id: "mobile",  label: "Mobile",  hint: "384px" },
];

// Center toolbar group: responsive width, grid toggle, zoom control.
export default function ViewportTools({
  canvasWidth, setCanvasWidth, showGrid, onToggleGrid, zoom, onZoom, onResetZoom,
}: {
  canvasWidth: CanvasWidth;
  setCanvasWidth: (w: CanvasWidth) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  zoom: number;
  onZoom: (delta: number) => void;
  onResetZoom: () => void;
}) {
  return (
    <>
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

      <div className="hidden md:flex items-center gap-1.5">
        {/* Grid toggle */}
        <button
          onClick={onToggleGrid}
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
            onClick={() => onZoom(-0.1)}
            title="Zoom out (Cmd+−)"
            className="px-2 py-1 text-base text-mist hover:text-foam hover:bg-white/[0.04] transition-colors leading-none"
          >−</button>
          <button
            onClick={onResetZoom}
            title="Reset zoom (Cmd+0)"
            className="px-2 py-1 text-[11px] font-mono text-mist hover:text-foam hover:bg-white/[0.04] transition-colors min-w-[42px] text-center tabular-nums"
          >{Math.round(zoom * 100)}%</button>
          <button
            onClick={() => onZoom(0.1)}
            title="Zoom in (Cmd+=)"
            className="px-2 py-1 text-base text-mist hover:text-foam hover:bg-white/[0.04] transition-colors leading-none"
          >+</button>
        </div>
      </div>
    </>
  );
}
