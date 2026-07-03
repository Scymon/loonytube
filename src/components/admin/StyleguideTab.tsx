"use client";

// Styleguide tab (superadmin) — live-editable Loonatic design tokens.
// Sections mirror the Loonatic Style Guide parts 1–9: color system, semantic
// states, typography, radius, motion, gradient (editable) and buttons, forms,
// elevation, modal, table, empty states, signals (live preview galleries).
// Draft edits preview instantly via scoped CSS variables; Save persists to
// site_config.theme and the root layout re-emits validated overrides site-wide.

import { useMemo, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";
import { Slider } from "./page-builder/props-panel/fields";
import {
  TOKENS, gradPrimaryCss, FONT_PRESETS, FONT_DEFAULT, GRAD_PRIMARY_DEFAULT,
  RADIUS_DEFAULT, RADIUS_LABELS, DURATION_DEFAULT, DURATION_LABELS,
  HEX_RE, hexToTriplet, type ThemeOverrides, type TokenDef,
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
        <input type="color" value={valid ? value : "#000000"}
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

function PreviewLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-wider text-mist mb-3">{children}</p>;
}

export default function StyleguideTab({ initialTheme }: Props) {
  const supabase = createClient();
  const [colors, setColors] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const t of TOKENS) base[t.key] = initialTheme?.colors?.[t.key] ?? t.default;
    return base;
  });
  const [grad, setGrad] = useState<[string, string]>(initialTheme?.gradPrimary ?? GRAD_PRIMARY_DEFAULT);
  const [font, setFont] = useState<ThemeOverrides["font"]>(initialTheme?.font ?? FONT_DEFAULT);
  const [radius, setRadius] = useState<[number, number, number]>(initialTheme?.radius ?? RADIUS_DEFAULT);
  const [durs, setDurs] = useState<[number, number, number]>(initialTheme?.durations ?? DURATION_DEFAULT);
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
      style["--lt-grad-primary"] = gradPrimaryCss(grad[0], grad[1]);
    }
    if (font && FONT_PRESETS[font]) {
      const p = FONT_PRESETS[font];
      style["--font-sans"] = p.stack;
      style["--font-display"] = ("display" in p && p.display) ? p.display : p.stack;
    }
    style["--lt-radius-sm"] = `${radius[0]}px`;
    style["--lt-radius-md"] = `${radius[1]}px`;
    style["--lt-radius-lg"] = `${radius[2]}px`;
    style["--lt-dur-fast"] = `${durs[0]}ms`;
    style["--lt-dur-med"] = `${durs[1]}ms`;
    style["--lt-dur-slow"] = `${durs[2]}ms`;
    return style as CSSProperties;
  }, [colors, grad, font, radius, durs]);

  function buildTheme(): ThemeOverrides | null {
    const out: ThemeOverrides = {};
    const changed: Record<string, string> = {};
    for (const t of TOKENS) {
      const v = colors[t.key];
      if (HEX_RE.test(v) && v.toLowerCase() !== t.default.toLowerCase()) changed[t.key] = v;
    }
    if (Object.keys(changed).length) out.colors = changed;
    if (HEX_RE.test(grad[0]) && HEX_RE.test(grad[1]) &&
        (grad[0].toLowerCase() !== GRAD_PRIMARY_DEFAULT[0].toLowerCase() || grad[1].toLowerCase() !== GRAD_PRIMARY_DEFAULT[1].toLowerCase())) {
      out.gradPrimary = grad;
    }
    if (font && font !== FONT_DEFAULT) out.font = font;
    if (radius.some((v, i) => v !== RADIUS_DEFAULT[i])) out.radius = radius;
    if (durs.some((v, i) => v !== DURATION_DEFAULT[i])) out.durations = durs;
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
    setColors(base); setGrad(GRAD_PRIMARY_DEFAULT); setFont(FONT_DEFAULT);
    setRadius(RADIUS_DEFAULT); setDurs(DURATION_DEFAULT);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
      {/* ══ Token editor ══ */}
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
          <ColorRow def={{ key: "g0", var: "", label: "Start (Ice)", default: GRAD_PRIMARY_DEFAULT[0], group: "" }}
            value={grad[0]} onChange={(v) => setGrad(([, b]) => [v, b])} />
          <ColorRow def={{ key: "g1", var: "", label: "End (Deep cyan)", default: GRAD_PRIMARY_DEFAULT[1], group: "" }}
            value={grad[1]} onChange={(v) => setGrad(([a]) => [a, v])} />
        </section>

        <section className="rounded-2xl border border-edge bg-surface p-4">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mist">Corner radius</h3>
          {radius.map((v, i) => (
            <div key={i} className="py-1">
              <p className="text-[10px] text-mist/70 mb-1">{RADIUS_LABELS[i]}</p>
              <Slider value={v} min={0} max={32} step={1}
                onChange={(n) => setRadius((r) => r.map((x, j) => (j === i ? n : x)) as [number, number, number])} />
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-edge bg-surface p-4">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mist">Motion</h3>
          {durs.map((v, i) => (
            <div key={i} className="py-1">
              <p className="text-[10px] text-mist/70 mb-1">{DURATION_LABELS[i]}</p>
              <Slider value={v} min={0} max={600} step={10} unit="ms"
                onChange={(n) => setDurs((d) => d.map((x, j) => (j === i ? n : x)) as [number, number, number])} />
            </div>
          ))}
          <p className="mt-2 text-[10px] text-mist/50">Easing curves (snap-out, snap-press, smooth) are fixed tokens — preview them on the buttons opposite.</p>
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
          <button type="button" onClick={save} disabled={saving} className="lt-cta lt-btn-md">
            {saving ? "Saving…" : "Save theme"}
          </button>
          <button type="button" onClick={resetAll}
            className="rounded border border-edge px-4 py-2 text-sm text-mist hover:text-foam hover:border-hair transition-colors">
            Reset all to defaults
          </button>
        </div>
        {msg && <p className="text-sm text-teal">{msg}</p>}
      </div>

      {/* ══ Live preview (scoped vars — edits apply here instantly) ══ */}
      <div style={previewVars} className="rounded-2xl border border-edge bg-ink p-6 space-y-8 self-start font-sans" id="sg-preview">
        <div>
          <PreviewLabel>01 · Type ladder — Orbitron display · Grotesk body · Mono labels</PreviewLabel>
          <p className="lt-eyebrow text-teal">Open for migration</p>
          <h1 className="mt-1 text-4xl font-black text-foam">Trailhead</h1>
          <p className="lt-text-gradient font-display text-2xl font-bold mt-1">The lake keeps its own light</p>
          <h3 className="text-lg font-bold text-foam mt-2">Field checklist</h3>
          <p className="mt-2 max-w-md text-sm font-light leading-relaxed text-foam/80">Northwoods systems for teams that ship. Deep-water structure, cold clarity, durable routes.</p>
          <p className="mt-1 text-sm text-mist">Muted body copy uses Mist. <a className="text-link hover:text-sky-light hover:underline" href="#" onClick={(e) => e.preventDefault()}>Inline links are Ice, Aurora on hover.</a></p>
          <p className="mt-2 font-mono text-xl font-bold text-sky">4.2% <span className="text-[10px] font-normal text-mist">trail signal</span></p>
        </div>

        <div>
          <PreviewLabel>02 · Button system — raised dark-lodge, all variants × sizes</PreviewLabel>
          {(["lt-btn-sm", "lt-btn-md", "lt-btn-lg"] as const).map((size) => (
            <div key={size} className="mb-3 flex flex-wrap items-center gap-3.5">
              <button type="button" className={`lt-btn lt-btn-neutral ${size}`}>Button</button>
              <span className="lt-wrap">
                <span className="lt-glow lt-glow-cyan" />
                <button type="button" className={`lt-btn lt-btn-listen ${size}`}>Listen</button>
              </span>
              <span className="lt-wrap">
                <span className="lt-glow lt-glow-red" />
                <button type="button" className={`lt-btn lt-btn-signal ${size}`}>Signal</button>
              </span>
              <button type="button" className={`lt-btn lt-btn-launch ${size}`}>{size === "lt-btn-sm" ? "Launch" : "Launch Now"}</button>
              <span className="lt-wrap">
                <span className="lt-glow lt-glow-red" />
                <button type="button" className={`lt-btn lt-btn-campfire ${size}`}>Campfire</button>
              </span>
              <button type="button" className={`lt-btn lt-btn-ghost ${size}`}>Ghost</button>
            </div>
          ))}
          <p className="mt-1 text-[10px] text-mist/50">Hover lifts (+bottom shadow grows) · press drops to 1px. Glow variants use the .lt-wrap/.lt-glow sibling pattern.</p>
        </div>

        <div>
          <PreviewLabel>02b · Gradient recipes</PreviewLabel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {([
              ["Raised button", "var(--lt-grad-primary)"],
              ["Glass card", "var(--lt-grad-glass)"],
              ["Deep lake hero", "var(--lt-grad-hero)"],
              ["Hero overlay", "var(--lt-grad-overlay)"],
              ["Lakeglow text", "var(--lt-grad-text)"],
              ["Teal tint card", "var(--lt-grad-tint)"],
            ] as [string, string][]).map(([label, bg]) => (
              <div key={label} className="overflow-hidden rounded-lg border border-edge">
                <div className="h-12" style={{ backgroundImage: bg }} />
                <p className="bg-panel px-2 py-1 text-[10px] text-mist">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <PreviewLabel>03 · Semantic — status &amp; feedback</PreviewLabel>
          <div className="flex flex-wrap gap-2">
            <span className="rounded bg-teal/15 border border-teal/40 px-2 py-0.5 text-[11px] font-semibold text-teal">Success · live signal</span>
            <span className="rounded bg-warning/15 border border-warning/40 px-2 py-0.5 text-[11px] font-semibold text-warning">Warning · degraded</span>
            <span className="rounded bg-loonred/15 border border-loonred/40 px-2 py-0.5 text-[11px] font-semibold text-loonred">Danger · destructive</span>
            <span className="rounded bg-sky/15 border border-sky/40 px-2 py-0.5 text-[11px] font-semibold text-sky">Info · callout</span>
            <span className="rounded bg-feather/15 border border-feather/40 px-2 py-0.5 text-[11px] font-semibold text-feather">Feather · small accent</span>
          </div>
        </div>

        <div>
          <PreviewLabel>04 · Surfaces &amp; elevation</PreviewLabel>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-edge bg-panel p-4 shadow-sm">
              <p className="text-xs font-semibold text-foam">Raised / 1</p>
              <p className="mt-1 text-[11px] text-mist">Nav items, thumbnails</p>
            </div>
            <div className="rounded-lg border border-edge bg-surface p-4 shadow">
              <p className="text-xs font-semibold text-foam">Raised / 2</p>
              <p className="mt-1 text-[11px] text-mist">Default cards</p>
            </div>
            <div className="rounded-lg border border-hair bg-surface p-4 shadow-lg">
              <p className="text-xs font-semibold text-teal">Raised / 3</p>
              <p className="mt-1 text-[11px] text-mist">Modals, dropdowns</p>
            </div>
          </div>
        </div>

        <div>
          <PreviewLabel>05 · Forms</PreviewLabel>
          <div className="grid gap-3 sm:grid-cols-2 max-w-lg">
            <input placeholder="First name" className="rounded border border-edge bg-surface px-3 py-2 text-sm text-foam placeholder:text-mist/50 shadow-inner focus:border-teal focus:outline-none transition-colors" readOnly />
            <input placeholder="Email" className="rounded border border-edge bg-surface px-3 py-2 text-sm text-foam placeholder:text-mist/50 shadow-inner" readOnly />
            <label className="flex items-center gap-2 text-sm text-mist"><span className="inline-block h-4 w-4 rounded-sm border border-edge bg-surface" /><span>I agree to the <span className="text-link">field notes</span></span></label>
            <label className="flex items-center gap-2 text-sm text-mist">
              <span className="relative inline-block h-5 w-9 rounded-full bg-teal/30"><span className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-teal" /></span>
              Night mode
            </label>
          </div>
        </div>

        <div>
          <PreviewLabel>06 · Modal</PreviewLabel>
          <div className="max-w-sm rounded-lg border border-hair bg-panel p-5 shadow-lg">
            <h3 className="text-base font-bold text-foam">Launch the lake route?</h3>
            <p className="mt-1 text-sm text-mist">Weather-aware wayfinding will be enabled for this route.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded border border-edge px-4 py-1.5 text-sm text-mist hover:text-foam transition-colors">Cancel</button>
              <button type="button" className="rounded px-4 py-1.5 text-sm font-bold text-ink" style={{ backgroundImage: "var(--lt-grad-primary)" }}>Launch</button>
            </div>
          </div>
        </div>

        <div>
          <PreviewLabel>07 · Table</PreviewLabel>
          <div className="overflow-hidden rounded-lg border border-edge">
            <table className="w-full text-sm">
              <thead><tr className="bg-panel text-left text-[11px] uppercase tracking-wider text-mist">
                <th className="px-3 py-2 font-semibold">Route</th><th className="px-3 py-2 font-semibold">Status</th><th className="px-3 py-2 font-semibold">Views</th>
              </tr></thead>
              <tbody className="divide-y divide-edge bg-surface">
                <tr><td className="px-3 py-2 text-foam">North shore dawn</td><td className="px-3 py-2"><span className="rounded bg-teal/15 px-1.5 py-0.5 text-[11px] font-semibold text-teal">ready</span></td><td className="px-3 py-2 text-mist">4,120</td></tr>
                <tr><td className="px-3 py-2 text-foam">Bog crossing</td><td className="px-3 py-2"><span className="rounded bg-warning/15 px-1.5 py-0.5 text-[11px] font-semibold text-warning">processing</span></td><td className="px-3 py-2 text-mist">—</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <PreviewLabel>08 · Empty state &amp; signals</PreviewLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-edge bg-panel p-6 text-center">
              <p className="text-sm font-semibold text-foam">No routes yet</p>
              <p className="mt-1 text-xs text-mist">Mark your first route to see it here.</p>
              <button type="button" className="mt-3 rounded px-4 py-1.5 text-xs font-bold text-ink" style={{ backgroundImage: "var(--lt-grad-primary)" }}>New route</button>
            </div>
            <div className="space-y-2">
              <div className="rounded border-l-2 border-teal bg-teal/10 px-3 py-2 text-xs text-foam">Signal complete — route published.</div>
              <div className="rounded border-l-2 border-warning bg-warning/10 px-3 py-2 text-xs text-foam">Beacon degraded — retrying.</div>
              <div className="rounded border-l-2 border-loonred bg-loonred/10 px-3 py-2 text-xs text-foam">Signal failed — check connection.</div>
            </div>
          </div>
        </div>

        <div>
          <PreviewLabel>08b · Section templates (CMS)</PreviewLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              ["lt-sec-lake", "Lake — hero / full-bleed"],
              ["lt-sec-cabin", "Cabin — default section"],
              ["lt-sec-signal", "Signal — red accent, sparingly"],
              ["lt-sec-ice", "Ice tint — featured / promo"],
              ["lt-sec-glass", "Mist glass — nav / footer"],
              ["lt-sec-hero", "Hero — lake canvas + aurora"],
            ] as [string, string][]).map(([cls, label]) => (
              <div key={cls} className={`${cls} rounded-lg px-4 py-6`}>
                <p className="text-xs font-semibold text-foam">{label}</p>
                <p className="font-mono text-[10px] text-mist/70">.{cls}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <PreviewLabel>09 · Background ladder</PreviewLabel>
          <div className="flex overflow-hidden rounded-lg border border-edge">
            {["bg-abyss", "bg-ink", "bg-panel", "bg-surface", "bg-edge", "bg-hair"].map((c) => (
              <div key={c} className={`h-10 flex-1 ${c}`} title={c} />
            ))}
          </div>
          <p className="mt-2 text-[10px] text-mist/50">Spacing scale and elevation shadow values are fixed reference tokens (guide Part 2) — themable radius, colors, motion and fonts cover the brand surface.</p>
        </div>
      </div>
    </div>
  );
}
