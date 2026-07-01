"use client";

import { useState } from "react";
import NavSlotCustomizer from "./NavSlotCustomizer";
import RibbonShortcutCustomizer from "./RibbonShortcutCustomizer";
import { createClient } from "@/lib/supabase/client";
import type { CmsPage } from "./PageManager";

/* ── Types (exported for layout + AppShell + Nav + Ribbon) ─────────────── */

export type NavSlot = "explore" | "threads" | "dashboard";

/** Defaults for the 3 reassignable nav slots */
export const NAV_SLOT_DEFAULTS: Record<NavSlot, { label: string; href: string }> = {
  explore:   { label: "Explore",   href: "/explore"   },
  threads:   { label: "Threads",   href: "/threads"   },
  dashboard: { label: "Dashboard", href: "/dashboard" },
};

/** Override for a single slot */
export type NavSlotOverride = {
  slot: NavSlot;
  label: string;
  href: string;
  icon?: string; // SVG path string; if absent, falls back to DEFAULT_SLOT_ICONS[slot]
};

/** Default icon SVG paths for each reassignable slot */
export const DEFAULT_SLOT_ICONS: Record<NavSlot, string> = {
  explore:   "M12 2a10 10 0 100 20 10 10 0 000-20zM16 8l-2.5 5.5L8 16l2.5-5.5z",
  threads:   "M4 5h16v11H8l-4 4z",
  dashboard: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6",
};

/** Labels of the 4 fixed ribbon items that are hidden */
export type RibbonFixedHidden = string[];

/** A pinned shortcut in the Ribbon sidebar */
export type RibbonShortcut = {
  id: string;
  label: string;
  href: string;
};

/** Footer column section */
export type FooterSection = {
  id: string;
  title: string;
  links: { id: string; label: string; href: string }[];
};

function genId() { return Math.random().toString(36).slice(2, 9); }

/* ── Tiny shared UI ──────────────────────────────────────────────────────── */

function Inp({ value, onChange, placeholder, className = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <input type="text" className={`lt-input text-sm ${className}`}
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  );
}

function SaveBadge({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "idle") return null;
  return (
    <span className={`text-xs font-medium ${
      status === "saved" ? "text-teal" : status === "error" ? "text-red-400" : "text-mist"
    }`}>{status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Error"}</span>
  );
}

function MoveBtn({ dir, onClick, disabled }: { dir: "up" | "down"; onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="rounded p-1 text-mist/50 hover:text-foam disabled:opacity-20 transition-colors">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir === "up" ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
      </svg>
    </button>
  );
}

function DelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="rounded p-1 text-mist/40 hover:text-red-400 transition-colors ml-1">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M18 6 6 18M6 6l12 12"/>
      </svg>
    </button>
  );
}

function PagePicker({ pages, onPick }: { pages: CmsPage[]; onPick: (label: string, href: string) => void }) {
  const [open, setOpen] = useState(false);
  const pub = pages.filter(p => p.is_published);
  if (pub.length === 0) return null;
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="rounded-lg border border-edge px-2.5 py-1.5 text-xs text-mist hover:text-foam hover:border-foam/40 transition-colors">
        From page ▾
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 min-w-[180px] rounded-xl border border-edge bg-panel shadow-xl overflow-hidden">
          {pub.map(p => (
            <button key={p.id} onClick={() => { onPick(p.title, `/p/${p.slug}`); setOpen(false); }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-edge/60">
              <span className="font-medium text-foam">{p.title}</span>
              <span className="block text-[11px] text-mist">/p/{p.slug}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Section 1: Nav Slot Reassignment ────────────────────────────────────── */

const SLOT_LABELS: Record<NavSlot, string> = {
  explore:   "Explore",
  threads:   "Threads",
  dashboard: "Dashboard",
};

function NavSlotsSection({
  overrides, pages, onChange,
}: {
  overrides: NavSlotOverride[];
  pages: CmsPage[];
  onChange: (o: NavSlotOverride[]) => void;
}) {
  const SLOTS: NavSlot[] = ["explore", "threads", "dashboard"];

  function getOverride(slot: NavSlot): NavSlotOverride {
    return overrides.find(o => o.slot === slot) ?? {
      slot,
      label: NAV_SLOT_DEFAULTS[slot].label,
      href:  NAV_SLOT_DEFAULTS[slot].href,
    };
  }

  function update(slot: NavSlot, field: "label" | "href", val: string) {
    const next = overrides.filter(o => o.slot !== slot);
    const curr = getOverride(slot);
    next.push({ ...curr, [field]: val });
    onChange(next);
  }

  function reset(slot: NavSlot) {
    onChange(overrides.filter(o => o.slot !== slot));
  }

  function pickPage(slot: NavSlot, label: string, href: string) {
    const next = overrides.filter(o => o.slot !== slot);
    next.push({ slot, label, href });
    onChange(next);
  }

  const isDefault = (slot: NavSlot) => {
    const o = overrides.find(o => o.slot === slot);
    if (!o) return true;
    return o.label === NAV_SLOT_DEFAULTS[slot].label && o.href === NAV_SLOT_DEFAULTS[slot].href;
  };

  return (
    <div className="space-y-3">
      {/* Fixed slots (always shown, can't be changed) */}
      <div className="rounded-xl border border-edge/50 bg-panel/40 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-mist/40 mb-2">Fixed — always shown</p>
        <div className="flex flex-wrap gap-2">
          {["Home", "Create"].map(l => (
            <span key={l} className="rounded-lg border border-edge/50 bg-panel/60 px-3 py-1.5 text-xs text-mist/50 font-medium">
              {l}
            </span>
          ))}
        </div>
      </div>

      {/* Reassignable slots */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-mist/50">Reassignable slots</p>
        {SLOTS.map(slot => {
          const ov = getOverride(slot);
          const def = isDefault(slot);
          return (
            <div key={slot} className="flex items-center gap-2 rounded-xl border border-edge bg-panel/60 px-3 py-2.5">
              <span className="w-20 shrink-0 text-xs font-semibold text-mist/60 uppercase tracking-wide">
                {SLOT_LABELS[slot]}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-edge shrink-0">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
              <Inp value={ov.label} onChange={v => update(slot, "label", v)} placeholder="Label" className="w-28" />
              <Inp value={ov.href} onChange={v => update(slot, "href", v)} placeholder="/p/slug or /route" className="flex-1" />
              <PagePicker pages={pages} onPick={(l, h) => pickPage(slot, l, h)} />
              {!def && (
                <button onClick={() => reset(slot)}
                  className="text-xs text-mist/40 hover:text-amber-400 transition-colors whitespace-nowrap">
                  Reset
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-mist/40 pl-1">
        Changes apply to both the desktop nav bar and the mobile bottom nav.
      </p>
    </div>
  );
}

/* ── Section 2: Ribbon Shortcuts ─────────────────────────────────────────── */

function RibbonShortcutsSection({
  shortcuts, pages, onChange,
}: {
  shortcuts: RibbonShortcut[];
  pages: CmsPage[];
  onChange: (s: RibbonShortcut[]) => void;
}) {
  function add() { onChange([...shortcuts, { id: genId(), label: "", href: "" }]); }
  function addPage(label: string, href: string) { onChange([...shortcuts, { id: genId(), label, href }]); }
  function update(id: string, field: "label" | "href", val: string) {
    onChange(shortcuts.map(s => s.id === id ? { ...s, [field]: val } : s));
  }
  function remove(id: string) { onChange(shortcuts.filter(s => s.id !== id)); }
  function move(i: number, dir: "up" | "down") {
    const next = [...shortcuts];
    const j = dir === "up" ? i - 1 : i + 1;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {/* Fixed ribbon items */}
      <div className="rounded-xl border border-edge/50 bg-panel/40 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-mist/40 mb-2">Fixed — always in ribbon</p>
        <div className="flex flex-wrap gap-2">
          {["Home", "Create"].map(l => (
            <span key={l} className="rounded-lg border border-edge/50 bg-panel/60 px-3 py-1.5 text-xs text-mist/50 font-medium">{l}</span>
          ))}
        </div>
      </div>

      {shortcuts.length === 0 && (
        <p className="text-sm text-mist py-2">No pinned shortcuts yet.</p>
      )}
      {shortcuts.map((sc, i) => (
        <div key={sc.id} className="flex items-center gap-2 rounded-xl border border-edge bg-panel/60 px-3 py-2">
          <div className="flex flex-col gap-0.5">
            <MoveBtn dir="up" onClick={() => move(i, "up")} disabled={i === 0} />
            <MoveBtn dir="down" onClick={() => move(i, "down")} disabled={i === shortcuts.length - 1} />
          </div>
          <Inp value={sc.label} onChange={v => update(sc.id, "label", v)} placeholder="Label" className="w-32" />
          <Inp value={sc.href} onChange={v => update(sc.id, "href", v)} placeholder="/p/slug or /route" className="flex-1" />
          <DelBtn onClick={() => remove(sc.id)} />
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <button onClick={add}
          className="rounded-lg border border-edge px-2.5 py-1.5 text-xs text-mist hover:text-foam hover:border-foam/40 transition-colors">
          + Custom link
        </button>
        <PagePicker pages={pages} onPick={addPage} />
      </div>
      <p className="text-[11px] text-mist/40 pl-1">
        Pinned pages appear in the Shortcuts section of the sidebar ribbon.
      </p>
    </div>
  );
}

/* ── Section 3: Footer ───────────────────────────────────────────────────── */

function FooterSectionEditor({
  section, pages, onChange, onDelete,
}: {
  section: FooterSection;
  pages: CmsPage[];
  onChange: (s: FooterSection) => void;
  onDelete: () => void;
}) {
  const addLink = () => onChange({ ...section, links: [...section.links, { id: genId(), label: "", href: "" }] });
  const addPage = (label: string, href: string) => onChange({ ...section, links: [...section.links, { id: genId(), label, href }] });
  const updateLink = (id: string, f: "label" | "href", v: string) =>
    onChange({ ...section, links: section.links.map(l => l.id === id ? { ...l, [f]: v } : l) });
  const removeLink = (id: string) => onChange({ ...section, links: section.links.filter(l => l.id !== id) });
  const moveLink = (i: number, dir: "up" | "down") => {
    const next = [...section.links]; const j = dir === "up" ? i - 1 : i + 1;
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...section, links: next });
  };
  return (
    <div className="rounded-2xl border border-edge bg-surface p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Inp value={section.title} onChange={t => onChange({ ...section, title: t })}
          placeholder="Section title (e.g. Company)" className="flex-1 font-semibold" />
        <button onClick={onDelete} className="text-xs text-mist/50 hover:text-red-400 transition-colors">Remove</button>
      </div>
      <div className="space-y-1.5 pl-1">
        {section.links.map((link, i) => (
          <div key={link.id} className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <MoveBtn dir="up" onClick={() => moveLink(i, "up")} disabled={i === 0} />
              <MoveBtn dir="down" onClick={() => moveLink(i, "down")} disabled={i === section.links.length - 1} />
            </div>
            <Inp value={link.label} onChange={v => updateLink(link.id, "label", v)} placeholder="Label" className="w-28" />
            <Inp value={link.href} onChange={v => updateLink(link.id, "href", v)} placeholder="/p/slug or https://…" className="flex-1" />
            <DelBtn onClick={() => removeLink(link.id)} />
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <button onClick={addLink}
            className="rounded-lg border border-edge px-2 py-1 text-xs text-mist hover:text-foam transition-colors">
            + Link
          </button>
          <PagePicker pages={pages} onPick={addPage} />
        </div>
      </div>
    </div>
  );
}

/* ── Main editor ─────────────────────────────────────────────────────────── */

type Props = {
  initialNavSlotOverrides:  NavSlotOverride[];
  initialRibbonShortcuts:   RibbonShortcut[];
  initialRibbonFixedHidden: RibbonFixedHidden;
  initialFooterSections:    FooterSection[];
  pages: CmsPage[];
};

export default function NavLinksEditor({
  initialNavSlotOverrides,
  initialRibbonShortcuts,
  initialRibbonFixedHidden,
  initialFooterSections,
  pages,
}: Props) {
  const supabase = createClient();
  const [footerSections,  setFooterSections]  = useState<FooterSection[]>(initialFooterSections);
  const [footerStatus, setFooterStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");

  async function save(
    col: string, val: unknown,
    setter: (v: unknown) => void,
    setStatus: (s: "idle"|"saving"|"saved"|"error") => void,
  ) {
    setter(val);
    setStatus("saving");
    const { error } = await supabase.from("site_config").update({ [col]: val }).eq("id", 1);
    setStatus(error ? "error" : "saved");
    if (!error) setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="space-y-10">

      {/* ── Nav slot reassignment ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foam">Nav slot destinations</h2>
            <p className="text-sm text-mist mt-0.5">
              Reassign the 3 flexible slots in the top nav and mobile bottom nav.
            </p>
          </div>
          <div />
        </div>
        <NavSlotCustomizer
          initialOverrides={initialNavSlotOverrides}
          pages={pages}
        />
      </section>

      {/* ── Ribbon shortcuts ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foam">Ribbon shortcuts</h2>
          <p className="text-sm text-mist mt-0.5">
            Pages and links pinned to the Shortcuts section of the sidebar ribbon.
          </p>
        </div>
        <RibbonShortcutCustomizer
          initialShortcuts={initialRibbonShortcuts}
          initialFixedHidden={initialRibbonFixedHidden}
          pages={pages}
        />
      </section>

      {/* ── Footer sections ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foam">Site footer</h2>
            <p className="text-sm text-mist mt-0.5">
              Footer columns at the bottom of every page. Add sections like Company, Legal, Resources…
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SaveBadge status={footerStatus} />
            <button
              onClick={() => save("footer_sections", footerSections, v => setFooterSections(v as FooterSection[]), setFooterStatus)}
              className="rounded-lg bg-teal/10 border border-teal/30 px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal/20 transition-colors">
              Save footer
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {footerSections.length === 0 && (
            <div className="rounded-2xl border border-dashed border-edge p-8 text-center">
              <p className="text-sm text-mist">No footer sections yet.</p>
              <p className="text-xs text-mist/50 mt-1">Add a section to create your site footer.</p>
            </div>
          )}
          {footerSections.map((s, i) => (
            <FooterSectionEditor
              key={s.id} section={s} pages={pages}
              onChange={updated => setFooterSections(footerSections.map((x, j) => j === i ? updated : x))}
              onDelete={() => setFooterSections(footerSections.filter((_, j) => j !== i))}
            />
          ))}
          <button
            onClick={() => setFooterSections([...footerSections, { id: genId(), title: "New Section", links: [] }])}
            className="rounded-xl border border-dashed border-edge/60 px-4 py-2.5 text-sm text-mist hover:text-foam hover:border-edge transition-colors w-full">
            + Add footer section
          </button>
        </div>
      </section>

    </div>
  );
}
