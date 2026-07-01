"use client";

import type { ReactNode } from "react";
import type { Block, FeatureItem } from "./types";

export type PageInfoPanelProps = {
  title: string;
  setTitle: (v: string) => void;
  slug: string;
  isPublished: boolean;
  setIsPublished: (v: boolean) => void;
  onSaveMeta: (field: "title" | "is_published", value: string | boolean) => void;
  blockCount: number;
};

type Props = { block: Block; onChange: (id: string, p: Record<string, unknown>) => void };

/* ── Layout primitives ──────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-edge/50 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0 space-y-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-mist/50">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <label className="w-20 shrink-0 pt-1.5 text-[10px] text-mist/70 leading-none">{label}</label>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function Inp({ value, onChange, placeholder, type = "text" }: {
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

function TA({ value, onChange, rows = 4 }: {
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

function SegBtn({ options, value, onChange }: {
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

function Toggle({ value, onChange, label }: {
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

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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

function Slider({ value, onChange, min, max, step = 1, unit = "px" }: {
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

function BgImagePicker({ p, up }: { p: Record<string, unknown>; up: (k: Record<string, unknown>) => void }) {
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

/* ── Per-type panels ────────────────────────────────────────────────────── */

function HeroPanel({ p, up }: { p: Record<string, unknown>; up: (k: Record<string, unknown>) => void }) {
  return (
    <>
      <Section title="Content">
        <Row label="Heading">
          <Inp value={(p.heading as string) || ""} onChange={(v) => up({ heading: v })} />
        </Row>
        <Row label="Subheading">
          <Inp value={(p.subheading as string) || ""} onChange={(v) => up({ subheading: v })} />
        </Row>
        <Row label="CTA label">
          <Inp value={(p.ctaText as string) || ""} onChange={(v) => up({ ctaText: v })} placeholder="Leave blank to hide" />
        </Row>
        <Row label="CTA URL">
          <Inp value={(p.ctaUrl as string) || ""} onChange={(v) => up({ ctaUrl: v })} placeholder="/" />
        </Row>
      </Section>
      <Section title="Layout">
        <Row label="Align">
          <SegBtn
            value={(p.align as string) || "center"}
            onChange={(v) => up({ align: v })}
            options={[{ label: "Left", value: "left" }, { label: "Center", value: "center" }]}
          />
        </Row>
        <Row label="Min height">
          <Slider value={(p.minHeight as number) ?? 400} onChange={(v) => up({ minHeight: v })} min={200} max={900} step={20} />
        </Row>
        <Row label="Padding Y">
          <Slider value={(p.paddingY as number) ?? 96} onChange={(v) => up({ paddingY: v })} min={24} max={200} step={8} />
        </Row>
      </Section>
      <Section title="Appearance">
        <Row label="Bg color">
          <ColorPicker value={(p.bgColor as string) || "#0a1a2c"} onChange={(v) => up({ bgColor: v })} />
        </Row>
        <Row label="Text color">
          <ColorPicker value={(p.textColor as string) || "#ffffff"} onChange={(v) => up({ textColor: v })} />
        </Row>
      </Section>
      <Section title="Background image">
        <BgImagePicker p={p} up={up} />
      </Section>
    </>
  );
}

function TextPanel({ p, up }: { p: Record<string, unknown>; up: (k: Record<string, unknown>) => void }) {
  return (
    <>
      <Section title="Content">
        <TA value={(p.content as string) || ""} onChange={(v) => up({ content: v })} rows={7} />
        <p className="text-[10px] text-mist/50">Markdown: **bold** *italic* `code` [link](url) # H1</p>
      </Section>
      <Section title="Typography">
        <Row label="Align">
          <SegBtn
            value={(p.align as string) || "left"}
            onChange={(v) => up({ align: v })}
            options={[
              { label: "L", value: "left",   title: "Left" },
              { label: "C", value: "center", title: "Center" },
              { label: "R", value: "right",  title: "Right" },
            ]}
          />
        </Row>
        <Row label="Size">
          <SegBtn
            value={(p.size as string) || "base"}
            onChange={(v) => up({ size: v })}
            options={[
              { label: "S", value: "sm",   title: "Small" },
              { label: "M", value: "base", title: "Normal" },
              { label: "L", value: "lg",   title: "Large" },
            ]}
          />
        </Row>
        <Row label="Color">
          <ColorPicker value={(p.textColor as string) || ""} onChange={(v) => up({ textColor: v })} />
        </Row>
      </Section>
      <Section title="Spacing">
        <Row label="Bg color">
          <ColorPicker value={(p.bgColor as string) || ""} onChange={(v) => up({ bgColor: v })} />
        </Row>
        <Row label="Pad top">
          <Slider value={(p.padTop as number) ?? 24} onChange={(v) => up({ padTop: v })} min={0} max={120} step={4} />
        </Row>
        <Row label="Pad bottom">
          <Slider value={(p.padBottom as number) ?? 24} onChange={(v) => up({ padBottom: v })} min={0} max={120} step={4} />
        </Row>
      </Section>
    </>
  );
}

function ImagePanel({ p, up }: { p: Record<string, unknown>; up: (k: Record<string, unknown>) => void }) {
  return (
    <>
      <Section title="Source">
        <Inp value={(p.url as string) || ""} onChange={(v) => up({ url: v })} placeholder="https://…" />
        {!!(p.url as string) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.url as string} alt="" className="mt-2 w-full rounded-xl border border-edge/50 object-cover aspect-video" />
        )}
      </Section>
      <Section title="Details">
        <Row label="Alt text"><Inp value={(p.alt as string) || ""} onChange={(v) => up({ alt: v })} /></Row>
        <Row label="Caption"><Inp value={(p.caption as string) || ""} onChange={(v) => up({ caption: v })} /></Row>
      </Section>
      <Section title="Display">
        <Row label="Width">
          <SegBtn
            value={(p.size as string) || "full"}
            onChange={(v) => up({ size: v })}
            options={[
              { label: "Full",   value: "full" },
              { label: "Large",  value: "large" },
              { label: "Medium", value: "medium" },
            ]}
          />
        </Row>
        <Row label="Aspect">
          <SegBtn
            value={(p.aspectRatio as string) || ""}
            onChange={(v) => up({ aspectRatio: v })}
            options={[
              { label: "Auto", value: "" },
              { label: "16:9", value: "16/9" },
              { label: "4:3",  value: "4/3" },
              { label: "1:1",  value: "1/1" },
            ]}
          />
        </Row>
        <Row label="Fit">
          <SegBtn
            value={(p.objectFit as string) || "cover"}
            onChange={(v) => up({ objectFit: v })}
            options={[
              { label: "Cover",   value: "cover" },
              { label: "Contain", value: "contain" },
            ]}
          />
        </Row>
        <Row label="Corners">
          <SegBtn
            value={(p.borderRadius as string) || "xl"}
            onChange={(v) => up({ borderRadius: v })}
            options={[
              { label: "None", value: "none" },
              { label: "Sm",   value: "sm" },
              { label: "Xl",   value: "xl" },
              { label: "Full", value: "full" },
            ]}
          />
        </Row>
      </Section>
    </>
  );
}

function VideoPanel({ p, up }: { p: Record<string, unknown>; up: (k: Record<string, unknown>) => void }) {
  return (
    <>
      <Section title="Cloudflare Stream">
        <Inp value={(p.videoId as string) || ""} onChange={(v) => up({ videoId: v })} placeholder="Video UID…" />
        <p className="text-[10px] text-mist/50 mt-1">Find the UID in your Cloudflare Stream dashboard.</p>
      </Section>
      <Section title="Caption">
        <Inp value={(p.title as string) || ""} onChange={(v) => up({ title: v })} placeholder="Optional caption" />
      </Section>
      <Section title="Playback">
        <Toggle value={!!(p.autoplay)} onChange={(v) => up({ autoplay: v })} label="Autoplay" />
        <Toggle value={!!(p.loop)} onChange={(v) => up({ loop: v })} label="Loop" />
        <Toggle value={(p.muted as boolean) !== false} onChange={(v) => up({ muted: v })} label="Muted" />
      </Section>
    </>
  );
}

function CtaPanel({ p, up }: { p: Record<string, unknown>; up: (k: Record<string, unknown>) => void }) {
  return (
    <>
      <Section title="Content">
        <Row label="Heading"><Inp value={(p.heading as string) || ""} onChange={(v) => up({ heading: v })} /></Row>
        <Row label="Body"><TA value={(p.body as string) || ""} onChange={(v) => up({ body: v })} rows={3} /></Row>
        <Row label="Button"><Inp value={(p.buttonText as string) || ""} onChange={(v) => up({ buttonText: v })} /></Row>
        <Row label="URL"><Inp value={(p.buttonUrl as string) || ""} onChange={(v) => up({ buttonUrl: v })} placeholder="/" /></Row>
      </Section>
      <Section title="Layout">
        <Row label="Align">
          <SegBtn
            value={(p.align as string) || "center"}
            onChange={(v) => up({ align: v })}
            options={[{ label: "Left", value: "left" }, { label: "Center", value: "center" }]}
          />
        </Row>
        <Row label="Btn style">
          <SegBtn
            value={(p.buttonStyle as string) || "ghost"}
            onChange={(v) => up({ buttonStyle: v })}
            options={[
              { label: "Ghost",   value: "ghost" },
              { label: "Solid",   value: "solid" },
              { label: "Outline", value: "outline" },
            ]}
          />
        </Row>
      </Section>
      <Section title="Appearance">
        <Row label="Bg color">
          <ColorPicker value={(p.bgColor as string) || "#0d2b3e"} onChange={(v) => up({ bgColor: v })} />
        </Row>
        <Row label="Btn color">
          <ColorPicker value={(p.buttonColor as string) || ""} onChange={(v) => up({ buttonColor: v })} />
        </Row>
      </Section>
      <Section title="Background image">
        <BgImagePicker p={p} up={up} />
      </Section>
    </>
  );
}

function FeaturesPanel({ p, up }: { p: Record<string, unknown>; up: (k: Record<string, unknown>) => void }) {
  const items = (p.items as FeatureItem[]) || [];

  function setItems(next: FeatureItem[]) { up({ items: next }); }
  function updateItem(i: number, patch: Partial<FeatureItem>) {
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  return (
    <>
      <Section title="Layout">
        <Row label="Heading">
          <Inp value={(p.heading as string) || ""} onChange={(v) => up({ heading: v })} />
        </Row>
        <Row label="Columns">
          <SegBtn
            value={String(p.columns || 3)}
            onChange={(v) => up({ columns: Number(v) })}
            options={[
              { label: "2", value: "2" },
              { label: "3", value: "3" },
              { label: "4", value: "4" },
            ]}
          />
        </Row>
      </Section>
      <Section title="Appearance">
        <Row label="Bg color">
          <ColorPicker value={(p.bgColor as string) || ""} onChange={(v) => up({ bgColor: v })} />
        </Row>
        <Row label="Text color">
          <ColorPicker value={(p.textColor as string) || ""} onChange={(v) => up({ textColor: v })} />
        </Row>
      </Section>
      <Section title="Background image">
        <BgImagePicker p={p} up={up} />
      </Section>
      <Section title="Items">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-edge/60 bg-panel/60 p-2.5 space-y-1.5">
            <div className="flex gap-1.5">
              <input
                className="lt-input w-10 text-center text-base"
                value={item.emoji || ""}
                onChange={(e) => updateItem(i, { emoji: e.target.value })}
                placeholder="?"
              />
              <input
                className="lt-input flex-1 text-xs"
                value={item.title}
                onChange={(e) => updateItem(i, { title: e.target.value })}
                placeholder="Title"
              />
            </div>
            <input
              className="lt-input w-full text-xs"
              value={item.desc || ""}
              onChange={(e) => updateItem(i, { desc: e.target.value })}
              placeholder="Description"
            />
            <button
              onClick={() => setItems(items.filter((_, idx) => idx !== i))}
              className="text-[10px] text-mist/50 hover:text-loonred transition-colors"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          onClick={() => setItems([...items, { emoji: "", title: "New feature", desc: "" }])}
          className="w-full rounded-xl border border-dashed border-edge/50 py-2 text-xs text-mist hover:border-teal/40 hover:text-teal transition-colors"
        >
          + Add item
        </button>
      </Section>
    </>
  );
}

function ColumnsPanel({ p, up }: { p: Record<string, unknown>; up: (k: Record<string, unknown>) => void }) {
  return (
    <>
      <Section title="Layout">
        <Row label="Ratio">
          <SegBtn
            value={(p.ratio as string) || "50/50"}
            onChange={(v) => up({ ratio: v })}
            options={[
              { label: "50/50", value: "50/50" },
              { label: "33/67", value: "33/67" },
              { label: "67/33", value: "67/33" },
            ]}
          />
        </Row>
        <Row label="Align">
          <SegBtn
            value={(p.valign as string) || "top"}
            onChange={(v) => up({ valign: v })}
            options={[
              { label: "Top",    value: "top" },
              { label: "Middle", value: "center" },
              { label: "Bottom", value: "bottom" },
            ]}
          />
        </Row>
        <Row label="Gap">
          <Slider value={(p.gap as number) ?? 8} onChange={(v) => up({ gap: v })} min={0} max={16} step={1} unit="u" />
        </Row>
      </Section>
      <Section title="Left column">
        <TA value={(p.left as string) || ""} onChange={(v) => up({ left: v })} rows={5} />
      </Section>
      <Section title="Right column">
        <TA value={(p.right as string) || ""} onChange={(v) => up({ right: v })} rows={5} />
      </Section>
    </>
  );
}

function SpacerPanel({ p, up }: { p: Record<string, unknown>; up: (k: Record<string, unknown>) => void }) {
  return (
    <Section title="Height">
      <Slider value={(p.height as number) || 48} onChange={(v) => up({ height: v })} min={8} max={240} step={8} />
    </Section>
  );
}

function DividerPanel({ p, up }: { p: Record<string, unknown>; up: (k: Record<string, unknown>) => void }) {
  return (
    <>
      <Section title="Style">
        <Row label="Line style">
          <SegBtn
            value={(p.dividerStyle as string) || "solid"}
            onChange={(v) => up({ dividerStyle: v })}
            options={[
              { label: "Solid",  value: "solid" },
              { label: "Dashed", value: "dashed" },
              { label: "Dotted", value: "dotted" },
            ]}
          />
        </Row>
        <Row label="Thickness">
          <Slider value={(p.thickness as number) ?? 1} onChange={(v) => up({ thickness: v })} min={1} max={8} step={1} />
        </Row>
        <Row label="Padding">
          <Slider value={(p.padY as number) ?? 8} onChange={(v) => up({ padY: v })} min={0} max={80} step={4} />
        </Row>
      </Section>
      <Section title="Color">
        <ColorPicker value={(p.color as string) || ""} onChange={(v) => up({ color: v })} />
      </Section>
    </>
  );
}

/* ── Page Info Panel ────────────────────────────────────────────────────── */

export function PageInfoPanel({
  title, setTitle, slug, isPublished, setIsPublished, onSaveMeta, blockCount,
}: PageInfoPanelProps) {
  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-edge bg-surface">
      <div className="flex items-center gap-2 border-b border-edge px-4 py-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-mist/50 shrink-0">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
        <p className="text-xs font-semibold text-foam">Page</p>
        <span className="ml-auto text-[10px] text-mist/40 tabular-nums">
          {blockCount} block{blockCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Page info */}
        <div className="border-b border-edge/50 pb-5 space-y-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-mist/50">Page info</p>

          <div className="space-y-1.5">
            <label className="block text-[10px] text-mist/70">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => onSaveMeta("title", title)}
              className="lt-input w-full text-xs"
              placeholder="Page title"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] text-mist/70">URL</label>
            <div className="flex items-center gap-1 rounded-lg border border-edge/50 bg-panel/50 px-3 py-1.5">
              <span className="text-[10px] text-mist/40 shrink-0">/p/</span>
              <span className="text-xs text-mist font-mono truncate">{slug}</span>
              <a
                href={`/p/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto shrink-0 text-[11px] text-sky/70 hover:text-sky transition-colors"
              >
                ↗
              </a>
            </div>
          </div>
        </div>

        {/* Visibility */}
        <div className="border-b border-edge/50 pb-5 space-y-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-mist/50">Visibility</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-mist">Published</span>
            <button
              role="switch"
              aria-checked={isPublished}
              onClick={() => {
                const next = !isPublished;
                setIsPublished(next);
                onSaveMeta("is_published", next);
              }}
              className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 transition-colors ${
                isPublished ? "bg-teal border-teal" : "bg-panel border-edge"
              }`}
            >
              <span className={`inline-block h-3 w-3 mt-0.5 rounded-full bg-white shadow transition-transform ${
                isPublished ? "translate-x-4" : "translate-x-0.5"
              }`} />
            </button>
          </div>
          <p className={`text-[10px] transition-colors ${isPublished ? "text-teal" : "text-mist/30"}`}>
            {isPublished ? `Live at /p/${slug}` : "Not published"}
          </p>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-mist/50">Content</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-edge/50 bg-panel/40 p-3 text-center">
              <p className="text-2xl font-bold text-foam tabular-nums">{blockCount}</p>
              <p className="text-[10px] text-mist/50 mt-0.5">Blocks</p>
            </div>
            <div className="rounded-xl border border-edge/50 bg-panel/40 p-3 flex items-center justify-center">
              <p className="text-[10px] text-mist/40 text-center leading-snug">
                Select a block<br/>to edit its props
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────── */

export default function PropsPanel({ block, onChange }: Props) {
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
      </div>
    </aside>
  );
}
