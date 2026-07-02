"use client";

import { Section, Row, Inp, TA, SegBtn, ColorPicker, Slider, BgImagePicker, type PanelProps } from "./fields";

export function HeroPanel({ p, up }: PanelProps) {
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

export function TextPanel({ p, up }: PanelProps) {
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

export function CtaPanel({ p, up }: PanelProps) {
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
