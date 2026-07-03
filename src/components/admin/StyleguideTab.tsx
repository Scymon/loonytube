"use client";

// Styleguide tab (superadmin) — live-editable Loonatic design tokens.
// Layout modeled on the Loonatic style guide: token groups on the left,
// live component preview on the right. Draft edits preview instantly via
// scoped CSS variables; Save persists to site_config.theme and the root
// layout re-emits validated overrides site-wide.

import { useMemo, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  TOKENS, FONT_PRESETS, GRAD_PRIMARY_DEFAULT, HEX_RE, hexToTriplet,
  type ThemeOverrides, type TokenDef,
} from "@/lib/theme-tokens";

type Props = { initialTheme: ThemeOverrides | null };

const GROUPS = ["Background ladder", "Brand accents", "Text", "Semantic"];

function ColorRow({ def, value, onChange }: { def: TokenDef; value: string; onChange: (v: string) => void }) {
  const valid = HEX_RE.test(value);
  const changed = value.toLowerCase() !== def.default.toLowerCase();
  return (
    <div className="flex items-center gap-2 py-1">
      <label className="relative h-7 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-edge">
        <span className="absolute inset-0" style={{ background: valid ? value : "#000" }} />
        <input type="color" value={valid ? (value.length === 4 ? value : value) : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute -inset-1 h-[130%] w-[130%] cursor-pointer opacity-0" />
      </label>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foam leading-tight">{def.label}
          {changed && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-teal align-middle" title="Modified" />}
        </p>
        {def.desc && <p className="text-[10px] text-mist/60 leading-tight truncate">{def.desc}</p>}
      </div>
      <input value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false}
        className={`w-[86px] shrink-0 rounded-md border bg-ink px-2 py-1 font-mono text-[11px] ${valid ? "border-edge text-foam" : "border-loonred text-loonred"}`} />
      {changed && (
        <button type="button" onClick={() => onChange(def.default)} title="Reset to default"
          className="shrink-0 text-mist/50 hover:text-foam text-xs px-1">↺</button>
      )}
    </div>
  );
}

export default function StyleguideTab({ initialTheme }: Props) {
  const supabase = createClient();
  const [colors, setColors] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const t of TOKENS) base[t.key] = initialTheme?.colors?.[t.key] ?? t.default;
    return base;
  });
  const [grad, setGrad] = useState<[string, string]>(initialTheme?.gradPrimary ?? GRAD_PRIMARY_DEFAULT);
  const [font, setFont] = useState<ThemeOverrides["font"]>(initialTheme?.font ?? "system");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Scoped preview vars — the preview pane re-skins live before saving
  const previewVars = useMemo(() => {
    const style: Record<string, string> = {};
    for (const t of TOKENS) {
      const triplet = hexToTriplet(colors[t.key]);
      if (triplet) style[t.var] = triplet;
    }
    if (HEX_RE.test(grad[0]) && HEX_RE.test(grad[1])) {
      style["--lt-grad-primary"] = `linear-gradient(180deg, ${grad[0]}, ${grad[1]})`;
    }
    if (font && FONT_PRESETS[font]) style["--font-sans"] = FONT_PRESETS[font].stack;
    return style as CSSProperties;
  }, [colors, grad, font]);

  function buildTheme(): ThemeOverrides | null {
    const out: ThemeOverrides = {};
    const changed: Record<string, string> = {};
    for (const t of TOKENS) {
      const v = colors[t.key];
      if (HEX_RE.test(v) && v.toLowerCase() !== t.default.toLowerCase()) changed[t.key] = v;
    }
    if (Object.keys(changed).length) out.colors = changed;
    if (HEX_RE.test(grad[0]) && HEX_RE.test(grad[1]) &&
        (grad[0].toLowerCase() !== GRAD_PRIMARY_DEFAULT[0] || grad[1].toLowerCase() !== GRAD_PRIMARY_DEFAULT[1])) {
      out.gradPrimary = grad;
    }
    if (font && font !== "system") out.font = font;
    return Object.keys(out).length ? out : null;
  }

  async function save() {
    setSaving(true); setMsg(null);
    const theme = buildTheme();
    const { error } = await supabase.from("site_config").update({ theme }).eq("id", 1);
    if (error) { setMsg("Couldn't save theme."); setSaving(false); return; }
    await fetch("/api/pages/revalidate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: true }),
    }).catch(() => {});
    setMsg(theme ? "Theme saved — reload to see it site-wide." : "Reset to stock Loonatic theme.");
    setSaving(false);
  }

  function resetAll() {
    const base: Record<string, string> = {};
    for (const t of TOKENS) base[t.key] = t.default;
    setColors(base); setGrad(GRAD_PRIMARY_DEFAULT); setFont("system");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
      {/* ── Token editor ── */}
      <div className="space-y-5">
        {GROUPS.map((g) => (
          <section key={g} className="rounded-2xl border border-edge bg-surface p-4">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mist">{g}</h3>
            {TOKENS.filter((t) => t.group === g).map((t) => (
              <ColorRow key={t.key} def={t} value={colors[t.key]}
                onChange={(v) => setColors((c) => ({ ...c, [t.key]: v }))} />
            ))}
          </section>
        ))}

        <section className="rounded-2xl border border-edge bg-surface p-4">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mist">Primary gradient</h3>
          <ColorRow def={{ key: "g0", var: "", label: "Start", default: GRAD_PRIMARY_DEFAULT[0], group: "" }}
            value={grad[0]} onChange={(v) => setGrad(([, b]) => [v, b])} />
          <ColorRow def={{ key: "g1", var: "", label: "End", default: GRAD_PRIMARY_DEFAULT[1], group: "" }}
            value={grad[1]} onChange={(v) => setGrad(([a]) => [a, v])} />
        </section>

        <section className="rounded-2xl border border-edge bg-surface p-4">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mist">Typography</h3>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(FONT_PRESETS) as (keyof typeof FONT_PRESETS)[]).map((k) => (
              <button key={k} type="button" onClick={() => setFont(k)}
                style={{ fontFamily: FONT_PRESETS[k].stack }}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${font === k ? "border-teal text-foam bg-teal/10" : "border-edge text-mist hover:border-hair"}`}>
                {FONT_PRESETS[k].label}
                <span className="block text-[10px] opacity-60">Aa Bb Cc 123</span>
              </button>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-2">
          <button type="button" onClick={save} disabled={saving}
            className="rounded-full px-5 py-2 text-sm font-bold text-ink disabled:opacity-50"
            style={{ backgroundImage: "var(--lt-grad-primary)" }}>
            {saving ? "Saving…" : "Save theme"}
          </button>
          <button type="button" onClick={resetAll}
            className="rounded-full border border-edge px-4 py-2 text-sm text-mist hover:text-foam hover:border-hair transition-colors">
            Reset all to defaults
          </button>
        </div>
        {msg && <p className="text-sm text-teal">{msg}</p>}
      </div>

      {/* ── Live preview (scoped vars — edits apply here instantly) ── */}
      <div style={previewVars} className="rounded-2xl border border-edge bg-ink p-6 space-y-6 self-start font-sans" id="sg-preview">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-mist mb-3">Preview — type ladder</p>
          <h1 className="text-3xl font-extrabold text-foam">Northwoods at night</h1>
          <h2 className="text-xl font-bold text-foam mt-1">The lake keeps its own light</h2>
          <p className="mt-2 text-sm text-mist">Muted body copy uses Mist. <a className="text-link hover:underline" href="#" onClick={(e) => e.preventDefault()}>Inline links use Link.</a></p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-mist mb-3">Buttons</p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="rounded-full px-5 py-2 text-sm font-bold text-ink" style={{ backgroundImage: "var(--lt-grad-primary)" }}>Primary CTA</button>
            <button type="button" className="rounded-full border border-follow px-5 py-2 text-sm font-bold text-follow">Follow</button>
            <button type="button" className="rounded-full border border-edge bg-surface px-5 py-2 text-sm text-foam">Secondary</button>
            <button type="button" className="rounded-full bg-loonred/15 border border-loonred/40 px-5 py-2 text-sm font-bold text-loonred">Danger</button>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-mist mb-3">Surfaces</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-edge bg-panel p-4">
              <p className="text-sm font-semibold text-foam">Panel card</p>
              <p className="mt-1 text-xs text-mist">Hairline border on Panel.</p>
              <input placeholder="Input on Surface" className="mt-3 w-full rounded-lg border border-edge bg-surface px-3 py-1.5 text-sm text-foam placeholder:text-mist/50" readOnly />
            </div>
            <div className="rounded-xl border border-hair bg-surface p-4">
              <p className="text-sm font-semibold text-teal">Accent card</p>
              <p className="mt-1 text-xs text-mist">Teal accent, lifted hairline.</p>
              <span className="mt-3 inline-block rounded bg-teal/15 px-2 py-0.5 text-[11px] font-semibold text-teal">badge</span>
              <span className="mt-3 ml-2 inline-block rounded bg-sky/15 px-2 py-0.5 text-[11px] font-semibold text-sky">sky</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-mist mb-3">Background ladder</p>
          <div className="flex overflow-hidden rounded-lg border border-edge">
            {["bg-abyss", "bg-ink", "bg-panel", "bg-surface", "bg-edge", "bg-hair"].map((c) => (
              <div key={c} className={`h-10 flex-1 ${c}`} title={c} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
