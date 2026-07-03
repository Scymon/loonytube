// Loonatic design tokens — single source of truth for the themable palette.
// Client-safe (no server imports). The Styleguide tab edits these; the root
// layout emits overrides as CSS variables; tailwind.config.ts consumes them
// as rgb(var(--lt-*) / <alpha-value>) so opacity utilities keep working.
//
// Defaults follow the Loonatic Style Guide (darker set, 2026-07): teal-forward
// night-water ladder, ice/cyan accents, signal-red danger, 2px sharp corners.

export type ThemeOverrides = {
  colors?: Record<string, string>;          // token key -> #hex
  gradPrimary?: [string, string];           // two hex stops
  font?: keyof typeof FONT_PRESETS;
  radius?: [number, number, number];        // sm/md/lg px
  durations?: [number, number, number];     // fast/medium/slow ms
};

export type TokenDef = { key: string; var: string; label: string; default: string; group: string; desc?: string };

// Groups mirror the Loonatic style guide Part 1 (Color System)
export const TOKENS: TokenDef[] = [
  // Background ladder (darkest -> lifted) — Abyss/Deep/Pinenight/Cabin/Bog
  { key: "abyss",     var: "--lt-abyss",     label: "Abyss",      default: "#01090B", group: "Background ladder", desc: "Darkest — hero vignette" },
  { key: "ink",       var: "--lt-ink",       label: "Ink (Deep)", default: "#031317", group: "Background ladder", desc: "Deep page base" },
  { key: "panel",     var: "--lt-panel",     label: "Panel (Pinenight)", default: "#0A1D21", group: "Background ladder", desc: "Content panels" },
  { key: "surface",   var: "--lt-surface",   label: "Surface (Cabin)",   default: "#102326", group: "Background ladder", desc: "Cards, inputs" },
  { key: "edge",      var: "--lt-edge",      label: "Edge (Bog)",  default: "#1B3A3D", group: "Background ladder", desc: "Hairline borders" },
  { key: "hair",      var: "--lt-hair",      label: "Hair",       default: "#254A4E", group: "Background ladder", desc: "Lifted hairline (derived from Bog)" },
  // Brand accents — Ice/Aurora/Cyan family
  { key: "sky",       var: "--lt-sky",       label: "Sky (Ice)",  default: "#63E6F2", group: "Brand accents", desc: "Primary CTA, highlights" },
  { key: "skyLight",  var: "--lt-sky-light", label: "Sky light (Aurora)", default: "#B7FFF7", group: "Brand accents", desc: "Hover, rare highlights" },
  { key: "skyDeep",   var: "--lt-sky-deep",  label: "Sky deep (Cyan)",    default: "#00AFC1", group: "Brand accents" },
  { key: "teal",      var: "--lt-teal",      label: "Teal (Cyan)", default: "#00AFC1", group: "Brand accents", desc: "Secondary action, accents" },
  { key: "tealSoft",  var: "--lt-teal-soft", label: "Teal soft",  default: "#2FBDCB", group: "Brand accents", desc: "Derived — soft accent text" },
  { key: "loon",      var: "--lt-loon",      label: "Loon cyan",  default: "#00AFC1", group: "Brand accents", desc: "Legacy cyan" },
  { key: "link",      var: "--lt-link",      label: "Link (Ice)", default: "#63E6F2", group: "Brand accents", desc: "Inline links" },
  { key: "follow",    var: "--lt-follow",    label: "Follow",     default: "#00AFC1", group: "Brand accents", desc: "Follow outline" },
  // Text
  { key: "foam",      var: "--lt-foam",      label: "Foam",       default: "#E1F2EF", group: "Text", desc: "Bright text" },
  { key: "mist",      var: "--lt-mist",      label: "Mist (Morning Fog)", default: "#5E7375", group: "Text", desc: "Muted text" },
  // Semantic — status & feedback
  { key: "loonred",   var: "--lt-loonred",   label: "Danger (Signal)", default: "#D83A4E", group: "Semantic", desc: "Errors, destructive actions" },
  { key: "warning",   var: "--lt-warning",   label: "Warning (Amber)", default: "#D8B25A", group: "Semantic", desc: "Degraded, caution badges" },
];

// Primary CTA — "Raised button, Ice Cyan" recipe from the guide
export const GRAD_PRIMARY_DEFAULT: [string, string] = ["#7DF6FF", "#008B94"];

// Radius scale — guide Part 1: 2px sharp signature / 4px subtle / 8px soft
export const RADIUS_DEFAULT: [number, number, number] = [2, 4, 8];
export const RADIUS_LABELS = ["Sharp (buttons, cards, inputs)", "Subtle (tooltips, chips)", "Soft (sections, modals)"];

// Motion — guide Part 5 timing tokens
export const DURATION_DEFAULT: [number, number, number] = [70, 120, 200];
export const DURATION_LABELS = ["Fast (press, toggle)", "Medium (hover, focus)", "Slow (panels, overlays)"];
export const EASINGS = {
  snapOut:  "cubic-bezier(0.22,1,0.36,1)",
  snapPress:"cubic-bezier(0.4,0,0.6,1)",
  smooth:   "cubic-bezier(0.07,0.07,0,1)",
} as const;

export const FONT_PRESETS = {
  loonatic:  { label: "Loonatic (Space Grotesk)", stack: `"Space Grotesk", ui-sans-serif, system-ui, sans-serif`,
               google: "family=Space+Grotesk:wght@300;400;500;600" },
  system:    { label: "System",           stack: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` },
  humanist:  { label: "Humanist",         stack: `Seravek, "Gill Sans Nova", Ubuntu, Calibri, "DejaVu Sans", source-sans-pro, sans-serif` },
  geometric: { label: "Geometric",        stack: `Avenir, Montserrat, Corbel, "URW Gothic", source-sans-pro, sans-serif` },
  serif:     { label: "Serif",            stack: `Charter, "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif` },
} as const;
export const FONT_DEFAULT: keyof typeof FONT_PRESETS = "loonatic";

export const HEX_RE = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

/** #rrggbb -> "r g b" triplet for rgb(var(--x) / <alpha-value>) */
export function hexToTriplet(hex: string): string | null {
  if (!HEX_RE.test(hex)) return null;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

const clampN = (v: unknown, lo: number, hi: number, fb: number): number => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fb;
  return Math.min(hi, Math.max(lo, Math.round(n)));
};

/** Google Fonts stylesheet URL for the chosen preset, or null. */
export function fontGoogleHref(font: ThemeOverrides["font"]): string | null {
  const preset = font ? FONT_PRESETS[font] : undefined;
  const g = preset && "google" in preset ? (preset as { google: string }).google : null;
  return g ? `https://fonts.googleapis.com/css2?${g}&display=swap` : null;
}

/** Build the :root override block from stored theme JSON. Invalid values are skipped. */
export function themeToCss(theme: ThemeOverrides | null | undefined): string {
  if (!theme) return "";
  const lines: string[] = [];
  const byKey = new Map(TOKENS.map((t) => [t.key, t]));
  for (const [key, hex] of Object.entries(theme.colors ?? {})) {
    const def = byKey.get(key);
    if (!def || typeof hex !== "string") continue;
    const triplet = hexToTriplet(hex);
    if (triplet && hex.toLowerCase() !== def.default.toLowerCase()) lines.push(`${def.var}: ${triplet};`);
  }
  const g = theme.gradPrimary;
  if (Array.isArray(g) && g.length === 2 && HEX_RE.test(g[0]) && HEX_RE.test(g[1])) {
    if (g[0].toLowerCase() !== GRAD_PRIMARY_DEFAULT[0].toLowerCase() || g[1].toLowerCase() !== GRAD_PRIMARY_DEFAULT[1].toLowerCase()) {
      lines.push(`--lt-grad-primary: linear-gradient(180deg, ${g[0]}, ${g[1]});`);
    }
  }
  if (Array.isArray(theme.radius)) {
    const names = ["--lt-radius-sm", "--lt-radius-md", "--lt-radius-lg"];
    theme.radius.forEach((v, i) => {
      const n = clampN(v, 0, 32, RADIUS_DEFAULT[i]);
      if (i < 3 && n !== RADIUS_DEFAULT[i]) lines.push(`${names[i]}: ${n}px;`);
    });
  }
  if (Array.isArray(theme.durations)) {
    const names = ["--lt-dur-fast", "--lt-dur-med", "--lt-dur-slow"];
    theme.durations.forEach((v, i) => {
      const n = clampN(v, 0, 1000, DURATION_DEFAULT[i]);
      if (i < 3 && n !== DURATION_DEFAULT[i]) lines.push(`${names[i]}: ${n}ms;`);
    });
  }
  if (theme.font && theme.font !== FONT_DEFAULT && FONT_PRESETS[theme.font]) {
    lines.push(`--font-sans: ${FONT_PRESETS[theme.font].stack};`);
  }
  return lines.length ? `:root {\n  ${lines.join("\n  ")}\n}` : "";
}
