"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CmsPage } from "./PageManager";
import type { RibbonShortcut } from "./NavLinksEditor";
import { ICON_OPTIONS } from "./NavSlotCustomizer";

/* ── Icons ───────────────────────────────────────────────────────────── */
const HOME_ICON    = "M3 11l9-8 9 8|M5 10v10h5v-6h4v6h5V10";
const PLUS_ICON    = "M12 5v14|M5 12h14";
const EXPLORE_ICON = "M12 2a10 10 0 100 20 10 10 0 000-20z|M16 8l-2.5 5.5L8 16l2.5-5.5z";
const SAVED_ICON   = "M6 3h12v18l-6-4-6 4z";
const PAGE_ICON    = "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z";

const BUILTIN_CHIPS: { label: string; href: string; icon: string }[] = [
  { label: "Feed",      href: "/feed",      icon: "M4 6h16M4 12h16M4 18h16" },
  { label: "Studio",    href: "/studio",    icon: "M15 10l4.553-2.069A1 1 0 0121 8.867v6.266a1 1 0 01-1.447.902L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
  { label: "Dashboard", href: "/dashboard", icon: "M12 12a4 4 0 100-8 4 4 0 000 8z|M4 21c0-4 4-6 8-6s8 2 8 6" },
  { label: "Threads",   href: "/threads",   icon: "M4 5h16v11H8l-4 4z" },
  { label: "DMs",  href: "/threads/dms",  icon: "M22 2L11 13|M22 2l-7 20-4-9-9-4z" },
  { label: "Settings",  href: "/settings",  icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z|M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

function genId() { return Math.random().toString(36).slice(2, 9); }

/* ── Helpers ─────────────────────────────────────────────────────────── */
function SvgIcon({ d, size = 18 }: { d: string; size?: number }) {
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

/* ── Palette drag chip ───────────────────────────────────────────────── */
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
        <SvgIcon d={icon} size={13} />
      </span>
      <span className="truncate max-w-[110px]">{label}</span>
      <span className="ml-auto text-[10px] text-mist/40 truncate max-w-[72px]">{href}</span>
    </div>
  );
}

/* ── Icon picker popover ─────────────────────────────────────────────── */
function IconPickerPopover({ onPick, onClose }: { onPick: (d: string) => void; onClose: () => void }) {
  return (
    <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-2xl border border-edge bg-panel shadow-2xl p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-mist/50 mb-2">Pick icon</p>
      <div className="grid grid-cols-5 gap-1">
        {ICON_OPTIONS.map(ic => (
          <button key={ic.label} title={ic.label}
            onClick={() => onPick(ic.d)}
            className="flex flex-col items-center gap-0.5 rounded-xl p-1.5
              text-mist/70 hover:text-teal hover:bg-teal/10 transition-colors">
            <SvgIcon d={ic.d} size={15} />
            <span className="text-[8px] leading-none">{ic.label}</span>
          </button>
        ))}
      </div>
      <button onClick={onClose}
        className="mt-2 w-full text-[11px] text-mist/40 hover:text-mist text-center pt-1">
        Close
      </button>
    </div>
  );
}

/* ── Shortcut row inside the mockup ─────────────────────────────────── */
// MODULE-LEVEL to avoid React identity bug
type ShortcutRowProps = {
  item: RibbonShortcut & { icon: string };
  idx: number;
  dragIdx: number | null;
  iconPickerIdx: number | null;
  onDragStart: (idx: number) => void;
  onDragOver:  (idx: number) => void;
  onDragEnd:   () => void;
  onRemove:    (id: string) => void;
  onPickIcon:  (idx: number, d: string) => void;
  onTogglePicker: (idx: number) => void;
  onClosePicker: () => void;
};

function ShortcutRow({
  item, idx, dragIdx, iconPickerIdx,
  onDragStart, onDragOver, onDragEnd, onRemove, onPickIcon, onTogglePicker, onClosePicker,
}: ShortcutRowProps) {
  const isDraggingThis = dragIdx === idx;
  const showPicker = iconPickerIdx === idx;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(idx)}
      onDragOver={e => { e.preventDefault(); onDragOver(idx); }}
      onDragEnd={onDragEnd}
      className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all duration-100 group/row
        cursor-grab active:cursor-grabbing
        ${isDraggingThis ? "opacity-40 scale-95 bg-teal/5" : "hover:bg-white/[0.04]"}`}
    >
      {/* Grip */}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-mist/20 shrink-0">
        <circle cx="9" cy="6" r="2"/><circle cx="15" cy="6" r="2"/>
        <circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/>
        <circle cx="9" cy="18" r="2"/><circle cx="15" cy="18" r="2"/>
      </svg>

      {/* Icon — clickable to change */}
      <div className="relative shrink-0">
        <button onClick={() => onTogglePicker(idx)} title="Change icon"
          className="grid h-7 w-7 place-items-center rounded-full text-mist/70 hover:text-teal hover:bg-teal/10 transition-colors">
          <SvgIcon d={item.icon} size={15} />
        </button>
        {showPicker && (
          <IconPickerPopover onPick={d => onPickIcon(idx, d)} onClose={onClosePicker} />
        )}
      </div>

      {/* Label + href */}
      <span className="flex-1 text-sm text-foam truncate">{item.label}</span>
      <span className="text-[10px] text-mist/40 truncate max-w-[80px]">{item.href}</span>

      {/* Remove */}
      <button onClick={() => onRemove(item.id)}
        className="ml-1 grid h-5 w-5 shrink-0 place-items-center rounded-full
          text-mist/20 hover:text-red-400 hover:bg-red-400/10
          opacity-0 group-hover/row:opacity-100 transition-all">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  );
}

/* ── Drop zone for adding new shortcuts from palette ─────────────────── */
type DropZoneProps = {
  isOver: boolean;
  isEmpty: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
};

function AddDropZone({ isOver, isEmpty, onDragOver, onDragLeave, onDrop }: DropZoneProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`mx-2 mt-1 rounded-xl border-2 border-dashed transition-all duration-150 text-center py-3 text-xs
        ${isOver
          ? "border-teal/60 bg-teal/10 text-teal"
          : isEmpty
          ? "border-edge/60 text-mist/30"
          : "border-transparent text-mist/20"
        }`}
    >
      {isOver ? "Drop to add" : isEmpty ? "Drag a destination here to add a shortcut" : "Drop here to add more"}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────── */
type Props = {
  initialShortcuts: RibbonShortcut[];
  initialFixedHidden: string[];
  pages: CmsPage[];
};

// Extended shortcut type that includes icon (not persisted in DB yet but tracked locally)
type ShortcutItem = RibbonShortcut & { icon: string };

function toItems(shortcuts: RibbonShortcut[]): ShortcutItem[] {
  return shortcuts.map(sc => ({
    ...sc,
    icon: (sc as ShortcutItem).icon ?? PAGE_ICON,
  }));
}

export default function RibbonShortcutCustomizer({ initialShortcuts, initialFixedHidden, pages }: Props) {
  const supabase = createClient();

  const [items,       setItems]      = useState<ShortcutItem[]>(toItems(initialShortcuts));
  const [saveStatus,  setSaveStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [dragIdx,     setDragIdx]    = useState<number | null>(null);
  const [dropZoneOver,setDropOver]   = useState(false);
  const [pickerIdx,   setPickerIdx]  = useState<number | null>(null);
  const [fixedHidden, setFixedHidden] = useState<Set<string>>(new Set(initialFixedHidden));

  // For palette → list drops
  const paletteRef = useRef<{ label: string; href: string; icon: string } | null>(null);
  // Flag: current drag is from palette vs. list-reorder
  const dragSourceRef = useRef<"palette" | "list">("list");

  /* ── Persistence ── */
  async function save(next: ShortcutItem[]) {
    setSaveStatus("saving");
    const shortcuts = next.map(({ id, label, href }) => ({ id, label, href }));
    const fixedHiddenArr = [...fixedHidden];
    const { error } = await supabase.from("site_config")
      .update({ ribbon_shortcuts: shortcuts, ribbon_fixed_hidden: fixedHiddenArr }).eq("id", 1);
    if (error) {
      console.error("[RibbonShortcutCustomizer] save error:", error.message);
      setSaveStatus("error");
    } else {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      window.dispatchEvent(new CustomEvent("lt:ribbon-shortcuts", { detail: { shortcuts, fixedHidden: fixedHiddenArr } }));
    }
  }

  function toggleFixed(label: string) {
    setFixedHidden(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  /* ── List reorder drag ── */
  function listDragStart(idx: number) {
    dragSourceRef.current = "list";
    setDragIdx(idx);
  }
  function listDragOver(idx: number) {
    if (dragSourceRef.current !== "list" || dragIdx === null || dragIdx === idx) return;
    const next = [...items];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    setDragIdx(idx);
    setItems(next);
  }
  function listDragEnd() { setDragIdx(null); }

  /* ── Palette → list drop ── */
  function paletteDragStart(label: string, href: string, icon: string) {
    dragSourceRef.current = "palette";
    paletteRef.current = { label, href, icon };
  }

  function dropZoneDragOver(e: React.DragEvent) {
    if (dragSourceRef.current !== "palette") return;
    e.preventDefault();
    setDropOver(true);
  }
  function dropZoneDragLeave() { setDropOver(false); }
  function dropZoneDrop(e: React.DragEvent) {
    e.preventDefault();
    setDropOver(false);
    const drag = paletteRef.current;
    if (!drag) return;
    const next = [...items, { id: genId(), label: drag.label, href: drag.href, icon: drag.icon }];
    setItems(next);
    paletteRef.current = null;
  }

  /* ── Remove ── */
  function remove(id: string) { setItems(items.filter(i => i.id !== id)); }

  /* ── Icon picker ── */
  function pickIcon(idx: number, d: string) {
    const next = items.map((it, i) => i === idx ? { ...it, icon: d } : it);
    setItems(next);
    setPickerIdx(null);
  }

  const pubPages = pages.filter(p => p.is_published);

  return (
    <div className="space-y-5">

      {/* ── Header: save ── */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-mist/50 flex-1">
          Drag a destination from below · Click an icon to change it · Hover a row to remove it
        </span>
        <SaveBadge status={saveStatus} />
        <button onClick={() => save(items)}
          className="rounded-lg bg-teal/10 border border-teal/30 px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal/20 transition-colors">
          Save ribbon
        </button>
      </div>

      {/* ── Mockup: expanded ribbon panel ── */}
      <div className="relative rounded-2xl border border-edge bg-[#0e0e11] overflow-visible select-none"
        onDragEnd={listDragEnd}>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

        {/* Ribbon header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <p className="text-sm font-bold text-foam">Quick Access</p>
          <span className="grid h-6 w-6 place-items-center rounded-full text-mist/30">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </span>
        </div>

        {/* Shortcuts section */}
        <div className="px-2 pb-3 pt-1">
          <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-mist/40">Shortcuts</p>

          {/* Fixed items — toggle on right */}
          {[
            { label: "Home",    icon: HOME_ICON,    href: "/"        },
            { label: "Create",  icon: PLUS_ICON,    href: "/create"  },
            { label: "Explore", icon: EXPLORE_ICON, href: "/explore" },
            { label: "Saved",   icon: SAVED_ICON,   href: null       },
          ].map(it => {
            const hidden = fixedHidden.has(it.label);
            return (
              <div key={it.label}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-opacity ${hidden ? "opacity-40" : "opacity-90"}`}>
                <div className="grid h-7 w-7 place-items-center rounded-full text-mist/70 shrink-0">
                  <SvgIcon d={it.icon} size={15} />
                </div>
                <span className={`flex-1 text-sm ${hidden ? "text-mist/40" : "text-foam"}`}>{it.label}</span>
                {!it.href && <span className="text-[9px] uppercase tracking-wide text-mist/40 bg-edge/30 px-1.5 py-0.5 rounded">Soon</span>}
                <button
                  onClick={() => toggleFixed(it.label)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${hidden ? "bg-edge/60" : "bg-teal"}`}
                  title={hidden ? `Show ${it.label}` : `Hide ${it.label}`}>
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${hidden ? "translate-x-0" : "translate-x-4"}`} />
                </button>
              </div>
            );
          })}

          {/* Custom shortcuts — reorderable */}
          {items.length > 0 && (
            <>
              <div className="mx-3 my-2 h-px bg-white/[0.06]" />
              {items.map((item, idx) => (
                <ShortcutRow
                  key={item.id}
                  item={item}
                  idx={idx}
                  dragIdx={dragIdx}
                  iconPickerIdx={pickerIdx}
                  onDragStart={listDragStart}
                  onDragOver={listDragOver}
                  onDragEnd={listDragEnd}
                  onRemove={remove}
                  onPickIcon={pickIcon}
                  onTogglePicker={i => setPickerIdx(p => p === i ? null : i)}
                  onClosePicker={() => setPickerIdx(null)}
                />
              ))}
            </>
          )}

          {/* Drop zone for palette chips */}
          <AddDropZone
            isOver={dropZoneOver}
            isEmpty={items.length === 0}
            onDragOver={dropZoneDragOver}
            onDragLeave={dropZoneDragLeave}
            onDrop={dropZoneDrop}
          />
        </div>

        {/* Stub of other ribbon sections — greyed out context */}
        <div className="border-t border-white/[0.04] px-2 pb-3 pt-1 opacity-20 pointer-events-none">
          <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-mist/40">Subscriptions</p>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="h-6 w-6 rounded-full bg-edge/60"/>
            <div className="h-3 w-24 rounded-full bg-edge/60"/>
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="h-6 w-6 rounded-full bg-edge/40"/>
            <div className="h-3 w-16 rounded-full bg-edge/40"/>
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-mist/40 pl-1">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-white/[0.08] border border-white/[0.12]"/>Fixed — toggle to show/hide
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-teal/10 border border-dashed border-teal/30"/>Custom shortcuts
        </span>
      </div>

      {/* ── Palette chips ── */}
      <div className="space-y-4">
        {pubPages.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-mist/50 mb-2">Your published pages</p>
            <div className="flex flex-wrap gap-2">
              {pubPages.map(p => (
                <DragChip key={p.id} label={p.title} href={`/p/${p.slug}`} icon={PAGE_ICON}
                  onDragStart={paletteDragStart} />
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-mist/50 mb-2">Built-in routes</p>
          <div className="flex flex-wrap gap-2">
            {BUILTIN_CHIPS.map(r => (
              <DragChip key={r.href} label={r.label} href={r.href} icon={r.icon}
                onDragStart={paletteDragStart} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
