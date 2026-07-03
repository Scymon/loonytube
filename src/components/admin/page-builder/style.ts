// Builder 2.0 Phase A — typed per-block design properties that map 1:1 to CSS.
// Every field is validated/clamped in styleToCss(): free-form CSS strings are
// deliberately impossible (style JSON is stored in the DB and rendered on the
// public /p/[slug] route, so this is a security boundary, not just hygiene).

import type { CSSProperties } from "react";

export interface NodeStyle {
  // Spacing (px)
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  marginTop?: number;
  marginBottom?: number;
  // Size (px)
  maxWidth?: number;   // 0 / undefined = full width
  minHeight?: number;
  // Surface
  bgColor?: string;    // #rgb / #rrggbb / #rrggbbaa
  radius?: number;     // px
  borderWidth?: number;
  borderColor?: string;
  shadow?: "none" | "sm" | "md" | "lg";
  // Typography
  textColor?: string;
  fontSize?: number;   // px
  fontWeight?: 400 | 500 | 600 | 700 | 800;
  lineHeight?: number; // percent (100–250) -> unitless /100
  textAlign?: "left" | "center" | "right";
  // Misc
  opacity?: number;    // 10–100 (%)
}

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const SHADOWS: Record<string, string> = {
  sm: "0 1px 3px rgba(0,0,0,0.35)",
  md: "0 6px 18px rgba(0,0,0,0.4)",
  lg: "0 18px 48px rgba(0,0,0,0.5)",
};

const clamp = (v: unknown, lo: number, hi: number): number | null => {
  const n = typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null;
};
const color = (v: unknown): string | null =>
  typeof v === "string" && HEX_RE.test(v) ? v : null;

/** Map a NodeStyle to React CSSProperties. Unknown/invalid values are dropped. */
export function styleToCss(s: NodeStyle): CSSProperties {
  const css: CSSProperties = {};
  const px = (key: keyof CSSProperties, v: unknown, lo: number, hi: number) => {
    const n = clamp(v, lo, hi);
    if (n !== null && n !== 0) (css as Record<string, string>)[key as string] = `${n}px`;
  };

  px("paddingTop", s.paddingTop, 0, 320);
  px("paddingRight", s.paddingRight, 0, 320);
  px("paddingBottom", s.paddingBottom, 0, 320);
  px("paddingLeft", s.paddingLeft, 0, 320);
  px("marginTop", s.marginTop, 0, 320);
  px("marginBottom", s.marginBottom, 0, 320);
  px("minHeight", s.minHeight, 0, 1200);
  px("borderRadius", s.radius, 0, 64);
  px("fontSize", s.fontSize, 10, 96);

  const mw = clamp(s.maxWidth, 0, 1920);
  if (mw) { css.maxWidth = `${mw}px`; css.marginLeft = "auto"; css.marginRight = "auto"; }

  const bg = color(s.bgColor);
  if (bg) css.backgroundColor = bg;
  const tc = color(s.textColor);
  if (tc) css.color = tc;

  const bw = clamp(s.borderWidth, 0, 12);
  if (bw) {
    const bc = color(s.borderColor) ?? "rgba(255,255,255,0.12)";
    css.border = `${bw}px solid ${bc}`;
  }

  if (s.shadow && s.shadow !== "none" && SHADOWS[s.shadow]) css.boxShadow = SHADOWS[s.shadow];

  if (s.fontWeight && [400, 500, 600, 700, 800].includes(s.fontWeight)) css.fontWeight = s.fontWeight;
  const lh = clamp(s.lineHeight, 100, 250);
  if (lh && lh !== 100) css.lineHeight = lh / 100;
  if (s.textAlign === "left" || s.textAlign === "center" || s.textAlign === "right") css.textAlign = s.textAlign;

  const op = clamp(s.opacity, 10, 100);
  if (op !== null && op < 100) css.opacity = op / 100;

  return css;
}

/** Drop zeroed/empty keys; return undefined when nothing is left. */
export function pruneStyle(s: NodeStyle | undefined): NodeStyle | undefined {
  if (!s) return undefined;
  const out: NodeStyle = {};
  for (const [k, v] of Object.entries(s)) {
    if (v === undefined || v === null || v === "" || v === 0 || v === "none") continue;
    (out as Record<string, unknown>)[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

export function hasStyle(s: NodeStyle | undefined): boolean {
  return !!s && Object.keys(styleToCss(s)).length > 0;
}
