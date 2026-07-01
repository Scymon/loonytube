"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CmsPage } from "./PageManager";
import type { NavSlot, NavSlotOverride } from "./NavLinksEditor";

/* ── Constants (defined HERE, not in NavLinksEditor, to avoid circular dep) */
export const NAV_SLOT_DEFAULTS: Record<NavSlot, { label: string; href: string }> = {
  explore:   { label: "Explore",   href: "/explore"   },
  threads:   { label: "Threads",   href: "/threads"   },
  dashboard: { label: "Dashboard", href: "/dashboard" },
};

export const DEFAULT_SLOT_ICONS: Record<NavSlot, string> = {
  explore:   "M12 2a10 10 0 100 20 10 10 0 000-20zM16 8l-2.5 5.5L8 16l2.5-5.5z",
  threads:   "M4 5h16v11H8l-4 4z",
  dashboard: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6",
};

export const ICON_OPTIONS: { label: string; d: string }[] = [
  { label: "Compass",   d: "M12 2a10 10 0 100 20 10 10 0 000-20zM16 8l-2.5 5.5L8 16l2.5-5.5z" },
  { label: "Chat",      d: "M4 5h16v11H8l-4 4z" },
  { label: "Profile",   d: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6" },
  { label: "Document",  d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { label: "Bookmark",  d: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" },
  { label: "Star",      d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
  { label: "Grid",      d: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
  { label: "Bell",      d: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9|M13.73 21a2 2 0 01-3.46 0" },
  { label: "Video",     d: "M15 10l4.553-2.069A1 1 0 0121 8.867v6.266a1 1 0 01-1.447.902L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
  { label: "People",    d: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2|M23 21v-2a4 4 0 00-3-3.87|M16 3.13a4 4 0 010 7.75" },
  { label: "Lightning", d: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
  { label: "Trending",  d: "M23 6l-9.5 9.5-5-5L1 18|M17 6h6v6" },
  { label: "Heart",     d: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" },
  { label: "Calendar",  d: "M4 5h16v16H4zM4 9h16M8 3v4M16 3v4" },
  { label: "Feed",      d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { label: "Photo",     d: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z|M12 17a4 4 0 100-8 4 4 0 000 8z" },
  { label: "Music",     d: "M9 18V5l12-2v13|M6 21a3 3 0 100-6 3 3 0 000 6zM18 19a3 3 0 100-6 3 3 0 000 6z" },
  { label: "Trophy",    d: "M8 21h8m-4-4v4M5 3h14l-2 9H7L5 3zM5 3L3 1m16 2l2-2" },
  { label: "Map",       d: "M1 6l7-4 8 4 7-4v16l-7 4-8-4-7 4V6zM8 2v16M16 6v16" },
  { label: "Settings",  d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z|M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  { label: "Articles",  d: "M4 6h16M4 12h16M4 18h7" },
];

const BUILTIN_ROUTES: { label: string; href: string; icon: string }[] = [
  { label: "Explore",   href: "/explore",   icon: DEFAULT_SLOT_ICONS.explore   },
  { label: "Threads",   href: "/threads",   icon: DEFAULT_SLOT_ICONS.threads   },
  { label: "Dashboard", href: "/dashboard", icon: DEFAULT_SLOT_ICONS.dashboard },
  { label: "Feed",      href: "/feed",      icon: "M4 6h16M4 12h16M4 18h16"   },
  { label: "Studio",    href: "/studio",    icon: "M15 10l4.553-2.069A1 1 0 0121 8.867v6.266a1 1 0 01-1.447.902L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
  { label: "DMs",      href: "/threads/dms",      icon: "M22 2L11 13|M22 2l-7 20-4-9-9-4z" },
  { label: "Settings",  href: "/settings",  icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z|M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

const PAGE_ICON = "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z";
const HOME_ICON = "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10";
const PLUS_ICON = "M12 5v14M5 12h14";

/* ── Helpers ─────────────────────────────────────────────────────────── */
function SvgIcon({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((p, i) => <path key={i} d={p} />)}
    </svg>
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

/* ── Draggable chip ──────────────────────────────────────────────────── */
function DragChip({ label, href, icon, onDragStart }: {
  label: string; href: string; icon: string;
  onDragStart: (label: string, href: string, icon: string) => void;
}) {
  return (
    <div draggable onDragStart={() => onDragStart(label, href, icon)}
      className="flex cursor-grab items-center gap-2 rounded-xl border border-edge bg-surface px-3 py-2
        text-sm text-foam hover:border-teal/40 hover:text-teal active:cursor-grabbing select-none transition-colors group">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-mist/30 shrink-0">
        <circle cx="9" cy="6" r="2"/><circle cx="15" cy="6" r="2"/>
        <circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/>
        <circle cx="9" cy="18" r="2"/><circle cx="15" cy="18" r="2"/>
      </svg>
      <span className="text-mist/60 group-hover:text-teal/80 shrink-0 transition-colors">
        <SvgIcon d={icon} size={14} />
      </span>
      <span className="truncate max-w-[110px]">{label}</span>
      <span className="ml-auto text-[10px] text-mist/40 truncate max-w-[72px]">{href}</span>
    </div>
  );
}

/* ── SlotZone — at module level, stable identity across re-renders ────── */
type SlotZoneProps = {
  slotKey: NavSlot;
  overrides: NavSlotOverride[];
  isDragging: boolean;
  hoverSlot: NavSlot | null;
  iconPickerSlot: NavSlot | null;
  pendingLabel: string | null;
  pendingIcon: string | null;
  onDragOver: (s: NavSlot) => void;
  onDragLeave: () => void;
  onDrop: (s: NavSlot) => void;
  onSetIcon: (s: NavSlot, d: string) => void;
  onTogglePicker: (s: NavSlot) => void;
  onClosePicker: () => void;
  onReset: (s: NavSlot) => void;
};

function SlotZone({
  slotKey, overrides, isDragging, hoverSlot, iconPickerSlot,
  pendingLabel, pendingIcon,
  onDragOver, onDragLeave, onDrop, onSetIcon, onTogglePicker, onClosePicker, onReset,
}: SlotZoneProps) {
  const ov = overrides.find(o => o.slot === slotKey) ?? {
    slot:  slotKey,
    label: NAV_SLOT_DEFAULTS[slotKey].label,
    href:  NAV_SLOT_DEFAULTS[slotKey].href,
  };
  const isOver      = hoverSlot === slotKey;
  const isCustom    = !!overrides.find(o => o.slot === slotKey);
  const showPicker  = iconPickerSlot === slotKey;

  // During hover, preview the incoming icon + label
  const iconD        = isOver && pendingIcon  ? pendingIcon  : (ov.icon ?? DEFAULT_SLOT_ICONS[slotKey]);
  const displayLabel = isOver && pendingLabel ? pendingLabel : ov.label;

  return (
    <div className="relative flex flex-col items-center"
      onDragOver={e => { e.preventDefault(); onDragOver(slotKey); }}
      onDragLeave={onDragLeave}
      onDrop={e => { e.preventDefault(); onDrop(slotKey); }}>

      <div className={`relative flex flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 transition-all duration-150 ${
        isOver    ? "bg-teal/20 ring-2 ring-teal/50 scale-105"
        : isDragging ? "bg-white/[0.04] ring-1 ring-dashed ring-teal/30"
        : ""
      }`}>

        {/* Icon button — click to open picker */}
        <button onClick={() => onTogglePicker(slotKey)} title="Change icon"
          className={`group/btn relative grid place-items-center rounded-full h-9 w-9 transition-all duration-200 ${
            isOver ? "text-teal" : "text-mist/80 hover:text-teal hover:bg-teal/10"
          }`}>
          <SvgIcon d={iconD} size={19} />
          <span className="absolute -right-0.5 -bottom-0.5 grid h-3.5 w-3.5 place-items-center
            rounded-full bg-panel border border-edge text-mist/60 opacity-0 group-hover/btn:opacity-100 transition-opacity">
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
            </svg>
          </span>
        </button>

        <span className={`text-[10px] font-medium leading-none text-center max-w-[52px] truncate ${
          isOver ? "text-teal" : "text-mist/60"
        }`}>{displayLabel}</span>

        {/* Reset badge */}
        {isCustom && (
          <button onClick={() => onReset(slotKey)} title="Reset to default"
            className="absolute -top-1.5 -right-1.5 grid h-4 w-4 place-items-center z-10
              rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 transition-colors">
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Icon picker popover */}
      {showPicker && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-60 rounded-2xl border border-edge bg-panel shadow-2xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-mist/50 mb-2">Pick icon</p>
          <div className="grid grid-cols-5 gap-1">
            {ICON_OPTIONS.map(ic => (
              <button key={ic.label} title={ic.label}
                onClick={() => onSetIcon(slotKey, ic.d)}
                className="flex flex-col items-center gap-0.5 rounded-xl p-1.5
                  text-mist/70 hover:text-teal hover:bg-teal/10 transition-colors">
                <SvgIcon d={ic.d} size={16} />
                <span className="text-[8px] leading-none">{ic.label}</span>
              </button>
            ))}
          </div>
          <button onClick={onClosePicker}
            className="mt-2 w-full text-[11px] text-mist/40 hover:text-mist text-center pt-1">
            Close
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main component — owns ALL state, saves itself ───────────────────── */
type Props = {
  initialOverrides: NavSlotOverride[];
  pages: CmsPage[];
};

const SLOTS: NavSlot[] = ["explore", "threads", "dashboard"];

export default function NavSlotCustomizer({ initialOverrides, pages }: Props) {
  const supabase = createClient();

  // Own state — no parent dependency
  const [overrides,      setOverrides]   = useState<NavSlotOverride[]>(initialOverrides);
  const [saveStatus,     setSaveStatus]  = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [view,           setView]        = useState<"mobile" | "desktop">("desktop");
  const [hoverSlot,      setHover]       = useState<NavSlot | null>(null);
  const [isDragging,     setDragging]    = useState(false);
  const [iconPickerSlot, setIPSlot]      = useState<NavSlot | null>(null);

  const dragRef = useRef<{ label: string; href: string; icon: string } | null>(null);

  /* ── Persistence ── */
  async function save(next: NavSlotOverride[]) {
    setSaveStatus("saving");
    const { error } = await supabase.from("site_config")
      .update({ nav_slot_overrides: next }).eq("id", 1);
    if (error) {
      console.error("[NavSlotCustomizer] save error:", error.message, error.details);
      setSaveStatus("error");
    } else {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }

  /* ── Drag handlers ── */
  function startDrag(label: string, href: string, icon: string) {
    dragRef.current = { label, href, icon };
    setDragging(true);
  }
  function endDrag() { dragRef.current = null; setDragging(false); setHover(null); }

  function drop(slot: NavSlot) {
    const drag = dragRef.current;
    if (!drag) return;
    const existing = overrides.find(o => o.slot === slot);
    // Auto-assign the chip's icon + label + href
    const next = overrides.filter(o => o.slot !== slot);
    next.push({ slot, label: drag.label, href: drag.href, icon: drag.icon });
    setOverrides(next);
    dragRef.current = null;
    setDragging(false);
    setHover(null);
    void existing; // suppress unused var
  }

  /* ── Icon picker ── */
  function setIcon(slot: NavSlot, d: string) {
    const curr = overrides.find(o => o.slot === slot)
      ?? { slot, label: NAV_SLOT_DEFAULTS[slot].label, href: NAV_SLOT_DEFAULTS[slot].href };
    const next = [...overrides.filter(o => o.slot !== slot), { ...curr, icon: d }];
    setOverrides(next);
    setIPSlot(null);
  }

  /* ── Reset slot ── */
  function reset(slot: NavSlot) {
    setOverrides(overrides.filter(o => o.slot !== slot));
  }

  /* ── Shared zone props ── */
  const zoneProps: Omit<SlotZoneProps, "slotKey"> = {
    overrides,
    isDragging,
    hoverSlot,
    iconPickerSlot,
    pendingLabel: dragRef.current?.label ?? null,
    pendingIcon:  dragRef.current?.icon  ?? null,
    onDragOver:     (s) => setHover(s),
    onDragLeave:    () => setHover(null),
    onDrop:         drop,
    onSetIcon:      setIcon,
    onTogglePicker: (s) => setIPSlot(p => p === s ? null : s),
    onClosePicker:  () => setIPSlot(null),
    onReset:        reset,
  };

  const pubPages = pages.filter(p => p.is_published);

  return (
    <div className="space-y-5">

      {/* ── Header: toggle + save ── */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-xl border border-edge bg-panel p-0.5">
          {(["desktop", "mobile"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition-all ${
                view === v ? "bg-surface text-foam shadow" : "text-mist hover:text-foam"
              }`}>{v}</button>
          ))}
        </div>
        <span className="text-xs text-mist/50 flex-1">Drag a destination onto a slot · Click icon to change it</span>
        <SaveBadge status={saveStatus} />
        <button onClick={() => save(overrides)}
          className="rounded-lg bg-teal/10 border border-teal/30 px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal/20 transition-colors">
          Save nav
        </button>
      </div>

      {/* ── Mockup ── */}
      <div className="relative rounded-2xl border border-edge bg-[#0e0e11] overflow-visible select-none"
        onDragEnd={endDrag}>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

        {view === "desktop" ? (
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-1">
              <div className="h-9 w-9 rounded-[10px] bg-surface border border-edge mr-1 shrink-0" />
              {/* Home — fixed */}
              <div className="flex flex-col items-center gap-0.5 px-2 py-1.5 opacity-40 pointer-events-none">
                <div className="grid h-9 w-9 place-items-center text-mist/60"><SvgIcon d={HOME_ICON} size={19} /></div>
                <span className="text-[10px] text-mist/40 font-medium">Home</span>
              </div>
              <SlotZone slotKey="explore" {...zoneProps} />
              {/* Create — fixed */}
              <div className="flex flex-col items-center gap-0.5 px-2 py-1.5 opacity-40 pointer-events-none">
                <div className="grid h-9 w-9 place-items-center rounded-full border border-teal/30 text-teal/60"><SvgIcon d={PLUS_ICON} size={19} /></div>
                <span className="text-[10px] text-teal/40 font-medium">Create</span>
              </div>
              <SlotZone slotKey="threads"   {...zoneProps} />
              <SlotZone slotKey="dashboard" {...zoneProps} />
            </div>
            <div className="flex items-center gap-1.5 opacity-20 pointer-events-none">
              <div className="h-8 w-36 rounded-full bg-white/[0.06] border border-white/[0.06]" />
              <div className="h-8 w-8 rounded-full bg-white/[0.06]" />
              <div className="h-8 w-8 rounded-full bg-white/[0.06]" />
              <div className="h-8 w-8 rounded-full bg-teal/20" />
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-sm px-2 pt-3 pb-2">
            <div className="rounded-2xl border border-white/[0.08] bg-panel/80 px-2 pt-2 pb-2">
              <div className="relative flex items-end justify-around">
                <div className="flex flex-col items-center gap-0.5 px-2 pb-1 opacity-40 pointer-events-none">
                  <SvgIcon d={HOME_ICON} size={20} />
                  <span className="text-[10px] font-medium text-mist/40">Home</span>
                </div>
                <div className="pb-1"><SlotZone slotKey="explore" {...zoneProps} /></div>
                <div className="relative -top-3 flex flex-col items-center gap-0.5 opacity-40 pointer-events-none">
                  <div className="grid h-11 w-11 place-items-center rounded-full border border-teal/40 bg-teal/10 text-teal/60">
                    <SvgIcon d={PLUS_ICON} size={22} />
                  </div>
                  <span className="text-[10px] font-medium text-teal/40">Create</span>
                </div>
                <div className="pb-1"><SlotZone slotKey="threads"   {...zoneProps} /></div>
                <div className="pb-1"><SlotZone slotKey="dashboard" {...zoneProps} /></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-mist/40 pl-1">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-white/[0.08] border border-white/[0.12]"/>
          Fixed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-teal/10 border border-dashed border-teal/30"/>
          Reassignable
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-amber-500/20"/>
          Customised — × to reset
        </span>
      </div>

      {/* ── Drag sources ── */}
      <div className="space-y-4">
        {pubPages.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-mist/50 mb-2">Your published pages</p>
            <div className="flex flex-wrap gap-2">
              {pubPages.map(p => (
                <DragChip key={p.id} label={p.title} href={`/p/${p.slug}`} icon={PAGE_ICON} onDragStart={startDrag} />
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-mist/50 mb-2">Built-in routes</p>
          <div className="flex flex-wrap gap-2">
            {BUILTIN_ROUTES.map(r => (
              <DragChip key={r.href} label={r.label} href={r.href} icon={r.icon} onDragStart={startDrag} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
