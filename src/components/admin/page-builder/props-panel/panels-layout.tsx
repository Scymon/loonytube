"use client";

import type { FeatureItem } from "../types";
import { Section, Row, Inp, TA, SegBtn, ColorPicker, Slider, BgImagePicker, type PanelProps } from "./fields";

export function FeaturesPanel({ p, up }: PanelProps) {
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

export function ColumnsPanel({ p, up }: PanelProps) {
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

export function SpacerPanel({ p, up }: PanelProps) {
  return (
    <Section title="Height">
      <Slider value={(p.height as number) || 48} onChange={(v) => up({ height: v })} min={8} max={240} step={8} />
    </Section>
  );
}

export function DividerPanel({ p, up }: PanelProps) {
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
