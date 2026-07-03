"use client";

// Builder 2.0 Phase A — design properties panel, shown for every block type.
// Each control maps 1:1 to a validated CSS property (see ../style.ts).

import type { NodeStyle } from "../style";
import { Section, Row, SegBtn, ColorPicker, Slider } from "./fields";

type Props = {
  style: NodeStyle | undefined;
  onStyle: (patch: Partial<NodeStyle> | null) => void;
};

export default function StylePanel({ style, onStyle }: Props) {
  const s = style ?? {};
  const set = (patch: Partial<NodeStyle>) => onStyle(patch);

  return (
    <div className="mt-4 border-t border-edge pt-4">
      <Section title="Spacing">
        <Row label="Pad top"><Slider value={s.paddingTop ?? 0} onChange={(v) => set({ paddingTop: v })} min={0} max={320} step={4} /></Row>
        <Row label="Pad bottom"><Slider value={s.paddingBottom ?? 0} onChange={(v) => set({ paddingBottom: v })} min={0} max={320} step={4} /></Row>
        <Row label="Pad left"><Slider value={s.paddingLeft ?? 0} onChange={(v) => set({ paddingLeft: v })} min={0} max={320} step={4} /></Row>
        <Row label="Pad right"><Slider value={s.paddingRight ?? 0} onChange={(v) => set({ paddingRight: v })} min={0} max={320} step={4} /></Row>
        <Row label="Margin top"><Slider value={s.marginTop ?? 0} onChange={(v) => set({ marginTop: v })} min={0} max={320} step={4} /></Row>
        <Row label="Margin bottom"><Slider value={s.marginBottom ?? 0} onChange={(v) => set({ marginBottom: v })} min={0} max={320} step={4} /></Row>
      </Section>

      <Section title="Size">
        <Row label="Max width"><Slider value={s.maxWidth ?? 0} onChange={(v) => set({ maxWidth: v })} min={0} max={1920} step={40} /></Row>
        <Row label="Min height"><Slider value={s.minHeight ?? 0} onChange={(v) => set({ minHeight: v })} min={0} max={1200} step={20} /></Row>
      </Section>

      <Section title="Surface">
        <Row label="Background"><ColorPicker value={(s.bgColor as string) ?? ""} onChange={(v) => set({ bgColor: v })} /></Row>
        <Row label="Radius"><Slider value={s.radius ?? 0} onChange={(v) => set({ radius: v })} min={0} max={64} step={2} /></Row>
        <Row label="Border"><Slider value={s.borderWidth ?? 0} onChange={(v) => set({ borderWidth: v })} min={0} max={12} step={1} /></Row>
        {(s.borderWidth ?? 0) > 0 && (
          <Row label="Border color"><ColorPicker value={(s.borderColor as string) ?? ""} onChange={(v) => set({ borderColor: v })} /></Row>
        )}
        <Row label="Shadow">
          <SegBtn
            value={s.shadow ?? "none"}
            onChange={(v) => set({ shadow: v as NodeStyle["shadow"] })}
            options={[
              { label: "None", value: "none" },
              { label: "S", value: "sm" },
              { label: "M", value: "md" },
              { label: "L", value: "lg" },
            ]}
          />
        </Row>
      </Section>

      <Section title="Text">
        <Row label="Color"><ColorPicker value={(s.textColor as string) ?? ""} onChange={(v) => set({ textColor: v })} /></Row>
        <Row label="Size"><Slider value={s.fontSize ?? 0} onChange={(v) => set({ fontSize: v })} min={0} max={96} step={1} /></Row>
        <Row label="Weight">
          <SegBtn
            value={String(s.fontWeight ?? "")}
            onChange={(v) => set({ fontWeight: Number(v) as NodeStyle["fontWeight"] })}
            options={[
              { label: "400", value: "400" },
              { label: "500", value: "500" },
              { label: "600", value: "600" },
              { label: "700", value: "700" },
            ]}
          />
        </Row>
        <Row label="Align">
          <SegBtn
            value={s.textAlign ?? ""}
            onChange={(v) => set({ textAlign: v as NodeStyle["textAlign"] })}
            options={[
              { label: "Left", value: "left" },
              { label: "Center", value: "center" },
              { label: "Right", value: "right" },
            ]}
          />
        </Row>
        <Row label="Line height"><Slider value={s.lineHeight ?? 100} onChange={(v) => set({ lineHeight: v })} min={100} max={250} step={5} unit="%" /></Row>
      </Section>

      <Section title="Effects">
        <Row label="Opacity"><Slider value={s.opacity ?? 100} onChange={(v) => set({ opacity: v })} min={10} max={100} step={5} unit="%" /></Row>
      </Section>

      <button
        type="button"
        onClick={() => onStyle(null)}
        className="mt-2 w-full rounded-md border border-edge px-3 py-1.5 text-xs text-mist hover:text-foam hover:border-hair transition-colors"
      >
        Reset all styles
      </button>
    </div>
  );
}
