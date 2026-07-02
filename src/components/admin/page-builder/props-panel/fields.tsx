"use client";

import type { ReactNode } from "react";

// Shared shape for every per-block-type panel.
export type PanelProps = { p: Record<string, unknown>; up: (k: Record<string, unknown>) => void };

/* ── Layout primitives ──────────────────────────────────────────────────── */

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-edge/50 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0 space-y-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-mist/50">{title}</p>
      {children}
    </div>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <label className="w-20 shrink-0 pt-1.5 text-[10px] text-mist/70 leading-none">{label}</label>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function Inp({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      className="lt-input w-full text-xs"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

export function TA({ value, onChange, rows = 4 }: {
  value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <textarea
      className="lt-input w-full text-xs font-mono leading-relaxed"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
    />
  );
}

export function SegBtn({ options, value, onChange }: {
  options: { label: string; value: string; title?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-lg bg-panel border border-edge p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          title={o.title ?? o.label}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            value === o.value
              ? "bg-surface text-foam shadow-sm"
              : "text-mist hover:text-foam"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ value, onChange, label }: {
  value: boolean; onChange: (v: boolean) => void; label?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      {label && <span className="text-[10px] text-mist/70">{label}</span>}
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors ${
          value ? "bg-teal border-teal" : "bg-panel border-edge"
        }`}
      >
        <span className={`inline-block h-3 w-3 mt-0.5 rounded-full bg-white shadow transition-transform ${
          value ? "translate-x-4" : "translate-x-0.5"
        }`} />
      </button>
    </div>
  );
}

const COLOR_PRESETS = [
  "#0a1a2c","#0d2b3e","#0f172a","#111827",
  "#18181b","#1a1a2e","#7c3aed","#2563eb",
  "#0891b2","#059669","#d97706","#dc2626",
  "#ec4899","#f97316","#ffffff","#f8fafc",
];

export function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const canEyedrop = typeof window !== "undefined" && "EyeDropper" in window;

  async function openEyeDropper() {
    if (!canEyedrop) return;
    try {
      // @ts-expect-error EyeDropper not yet in TS lib
      const result = await (new window.EyeDropper()).open();
      onChange(result.sRGBHex);
    } catch { /* user cancelled */ }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {/* Native colour swatch / picker */}
        <label className="relative h-7 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-edge shadow-inner">
          <input
            type="color"
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -inset-1 h-[130%] w-[130%] cursor-pointer opacity-0"
          />
          <div className="absolute inset-0 rounded-md" style={{ background: value || "transparent" }} />
        </label>
        <Inp value={value} onChange={onChange} placeholder="#000000" />
        {/* EyeDropper (Chrome 95+) */}
        {canEyedrop && (
          <button
            type="button"
            onClick={openEyeDropper}
            title="Pick color from screen"
            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md border border-edge
              text-mist/60 hover:text-foam hover:border-foam/40 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m2 22 1-1h3l9-9"/>
              <path d="M3 21v-3l9-9"/>
              <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8-3 3"/>
            </svg>
          </button>
        )}
      </div>
      {/* Preset swatches */}
      <div className="grid grid-cols-8 gap-1">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            title={c}
            className={`h-4 w-full rounded cursor-pointer transition-transform hover:scale-110 ${
              value?.toLowerCase() === c.toLowerCase()
                ? "ring-2 ring-teal ring-offset-1 ring-offset-surface"
                : ""
            }`}
            style={{
              background: c,
              border: c === "#ffffff" || c === "#f8fafc" ? "1px solid rgba(255,255,255,0.15)" : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function Slider({ value, onChange, min, max, step = 1, unit = "px" }: {
  value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; unit?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-teal h-1"
      />
      <span className="w-14 text-right text-xs text-mist tabular-nums">{value}{unit}</span>
    </div>
  );
}

/* ── Background Image Picker ────────────────────────────────────────────── */

export function BgImagePicker({ p, up }: PanelProps) {
  const bgImage   = (p.bgImage   as string) || "";
  const bgSize    = (p.bgSize    as string) || "cover";
  const bgPos     = (p.bgPos     as string) || "center";
  const bgOverlay = (p.bgOverlay as number) ?? 50;

  return (
    <div className="space-y-3">
      <Row label="Image URL">
        <Inp value={bgImage} onChange={(v) => up({ bgImage: v })} placeholder="https://example.com/img.jpg" />
      </Row>
      {bgImage && (
        <>
          <div
            className="w-full rounded-xl border border-edge/50 overflow-hidden"
            style={{
              aspectRatio: "16/9",
              backgroundImage: `url(${bgImage})`,
              backgroundSize: bgSize,
              backgroundPosition: bgPos,
            }}
          />
          <Row label="Size">
            <SegBtn
              value={bgSize}
              onChange={(v) => up({ bgSize: v })}
              options={[
                { label: "Cover",   value: "cover" },
                { label: "Contain", value: "contain" },
                { label: "Auto",    value: "auto" },
              ]}
            />
          </Row>
          <Row label="Position">
            <SegBtn
              value={bgPos}
              onChange={(v) => up({ bgPos: v })}
              options={[
                { label: "Top",    value: "top" },
                { label: "Center", value: "center" },
                { label: "Bottom", value: "bottom" },
              ]}
            />
          </Row>
          <Row label="Overlay">
            <Slider value={bgOverlay} onChange={(v) => up({ bgOverlay: v })} min={0} max={100} step={5} unit="%" />
          </Row>
        </>
      )}
    </div>
  );
}
