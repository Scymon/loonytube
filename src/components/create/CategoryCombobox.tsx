"use client";
import { useEffect, useRef, useState } from "react";

export type Category = { id: string; name: string; slug: string };

type Props = {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  onAdd:    (category: Category) => void;
};

export default function CategoryCombobox({ categories, value, onChange, onAdd }: Props) {
  const [open,   setOpen]   = useState(false);
  const [query,  setQuery]  = useState("");
  const [saving, setSaving] = useState(false);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected   = categories.find(c => c.id === value);
  const filtered   = categories.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
  const exactMatch = categories.some(c => c.name.toLowerCase() === query.trim().toLowerCase());
  const canAdd     = query.trim().length >= 2 && !exactMatch;

  function close() { setOpen(false); setQuery(""); }

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  async function handleAdd() {
    const name = query.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      const r    = await fetch("/api/audio/categories", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name }),
      });
      const json = await r.json();
      if (!r.ok) { alert(json.error ?? "Failed to create category"); return; }
      onAdd(json as Category);
      onChange((json as Category).id);
      close();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative flex-1">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 0); }}
        className="lt-input flex w-full items-center justify-between gap-2 text-sm"
      >
        <span className={selected ? "text-foam" : "text-mist/40"}>
          {selected?.name ?? "Category"}
        </span>
        <svg className="shrink-0 text-mist/50" width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full min-w-[180px] rounded-xl
          border border-edge bg-surface shadow-xl">
          {/* Search input */}
          <div className="border-b border-edge px-3 py-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search or type to add…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && canAdd) { e.preventDefault(); void handleAdd(); }
                if (e.key === "Escape") close();
              }}
              className="w-full bg-transparent text-sm text-foam outline-none
                placeholder:text-mist/40"
            />
          </div>

          {/* Options */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 && !canAdd && (
              <p className="px-3 py-2 text-xs text-mist/40">No categories found</p>
            )}
            {filtered.map(c => (
              <button key={c.id} type="button"
                onClick={() => { onChange(c.id); close(); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm
                  transition-colors hover:bg-edge
                  ${c.id === value ? "text-teal" : "text-foam"}`}>
                {c.id === value && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <span className={c.id === value ? "" : "pl-[14px]"}>{c.name}</span>
              </button>
            ))}
            {canAdd && (
              <button type="button" onClick={() => void handleAdd()} disabled={saving}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm
                  text-teal transition-colors hover:bg-teal/10 disabled:opacity-40">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {saving ? "Adding…" : `Add "${query.trim()}"`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
