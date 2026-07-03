// Loonatic design tokens — single source of truth for the themable palette.
// Client-safe (no server imports). The Styleguide tab edits these; the root
// layout emits overrides as CSS variables; tailwind.config.ts consumes them
// as rgb(var(--lt-*) / <alpha-value>) so opacity utilities keep working.

export type ThemeOverrides = {
  colors?: Record<string, string>;          // token key -> #hex
  gradPrimary?: [string, string];           // two hex stops
  font?: keyof typeof FONT_PRESETS;
};

export type TokenDef = { key: string; var: string; label: string; default: string; group: string; desc?: string };

// Groups mirror the Loonatic style guide Part 1 (Color System)
export const TOKENS: TokenDef[] = [
  // Background ladder (darkest -> lifted)
  { key: "abyss",     var: "--lt-abyss",     label: "Abyss",      default: "#070b11", group: "Background ladder", desc: "Darkest — hero vignette" },
  { key: "ink",       var: "--lt-ink",       label: "Ink",        default: "#0a0e14", group: "Background ladder", desc: "Deep page base" },
  { key: "panel",     var: "--lt-panel",     label: "Panel",      default: "#111217", group: "Background ladder", desc: "Content panels" },
  { key: "surface",   var: "--lt-surface",   label: "Surface",    default: "#181b22", group: "Background ladder", desc: "Cards, inputs" },
  { key: "edge",      var: "--lt-edge",      label: "Edge",       default: "#242833", group: "Background ladder", desc: "Hairline borders" },
  { key: "hair",      var: "--lt-hair",      label: "Hair",       default: "#2d3340", group: "Background ladder", desc: "Lifted hairline" },
  // Brand accents
  { key: "sky",       var: "--lt-sky",       label: "Sky",        default: "#62b8e6", group: "Brand accents", desc: "Primary CTA" },
  { key: "skyLight",  var: "--lt-sky-light", label: "Sky light",  default: "#7dd0f2", group: "Brand accents" },
  { key: "skyDeep",   var: "--lt-sky-deep",  label: "Sky deep",   default: "#4fa6e4", group: "Brand accents" },
  { key: "teal",      var: "--lt-teal",      label: "Teal",       default: "#2dd4b4", group: "Brand accents", desc: "Accent" },
  { key: "tealSoft",  var: "--lt-teal-soft", label: "Teal soft",  default: "#55c9b6", group: "Brand accents" },
  { key: "loon",      var: "--lt-loon",      label: "Loon cyan",  default: "#22d3ee", group: "Brand accents", desc: "Legacy cyan" },
  { key: "link",      var: "--lt-link",      label: "Link",       default: "#3fa2f0", group: "Brand accents", desc: "Inline links" },
  { key: "follow",    var: "--lt-follow",    label: "Follow",     default: "#3b82f6", group: "Brand accents", desc: "Follow outline" },
  // Text
  { key: "foam",      var: "--lt-foam",      label: "Foam",       default: "#eef5fb", group: "Text", desc: "Bright text" },
  { key: "mist",      var: "--lt-mist",      label: "Mist",       default: "#8a98a8", group: "Text", desc: "Muted text" },
  // Semantic
  { key: "loonred",   var: "--lt-loonred",   label: "Loon red",   default: "#ef4444", group: "Semantic", desc: "Danger / signal" },
];

export const GRAD_PRIMARY_DEFAULT: [string, string] = ["#3ad6bd", "#3e9fe6"];

export const FONT_PRESETS = {
  system:    { label: "System (default)", stack: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` },
  humanist:  { label: "Humanist",         stack: `Seravek, "Gill Sans Nova", Ubuntu, Calibri, "DejaVu Sans", source-sans-pro, sans-serif` },
  geometric: { label: "Geometric",        stack: `Avenir, Montserrat, Corbel, "URW Gothic", source-sans-pro, sans-serif` },
  serif:     { label: "Serif",            stack: `Charter, "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif` },
} as const;

export const HEX_RE = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

/** #rrggbb -> "r g b" triplet for rgb(var(--x) / <alpha-value>) */
export function hexToTriplet(hex: string): string | null {
  if (!HEX_RE.test(hex)) return null;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
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
    if (g[0].toLowerCase() !== GRAD_PRIMARY_DEFAULT[0] || g[1].toLowerCase() !== GRAD_PRIMARY_DEFAULT[1]) {
      lines.push(`--lt-grad-primary: linear-gradient(180deg, ${g[0]}, ${g[1]});`);
    }
  }
  if (theme.font && theme.font !== "system" && FONT_PRESETS[theme.font]) {
    lines.push(`--font-sans: ${FONT_PRESETS[theme.font].stack};`);
  }
  return lines.length ? `:root {\n  ${lines.join("\n  ")}\n}` : "";
}
