"use client";

import { Section, Row, Inp, SegBtn, Toggle, type PanelProps } from "./fields";

export function ImagePanel({ p, up }: PanelProps) {
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

export function VideoPanel({ p, up }: PanelProps) {
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
