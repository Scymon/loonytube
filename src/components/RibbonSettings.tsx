"use client";
import Avatar from "@/components/Avatar";
import type { Sub } from "@/components/Ribbon";

type SectionKey = "shortcuts" | "subscriptions" | "playlists" | "groups";
const SECTION_LABELS: Record<SectionKey, string> = {
  shortcuts: "Shortcuts", subscriptions: "Subscriptions", playlists: "Playlists", groups: "Groups",
};

type Props = {
  expanded: boolean;
  visible: Record<SectionKey, boolean>;
  hiddenList: Sub[];
  onToggleSection: (k: SectionKey) => void;
  onRestore: (id: string) => void;
};

export default function RibbonSettings({ expanded, visible, hiddenList, onToggleSection, onRestore }: Props) {
  return (
    <div className={`absolute bottom-[96px] z-10 rounded-xl border border-edge bg-surface p-3 shadow-xl ${expanded ? "left-2 right-2" : "left-[72px] w-64"}`}>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mist">Sections</p>
      {(Object.keys(SECTION_LABELS) as SectionKey[]).map((k) => (
        <label key={k} className="flex cursor-pointer items-center justify-between py-1.5 text-sm text-foam">
          {SECTION_LABELS[k]}
          <input type="checkbox" checked={visible[k]} onChange={() => onToggleSection(k)} className="h-4 w-4 accent-teal" />
        </label>
      ))}
      {hiddenList.length > 0 && (
        <>
          <p className="mb-1 mt-3 text-[11px] font-bold uppercase tracking-wider text-mist">Hidden channels</p>
          {hiddenList.map(s => (
            <div key={s.id} className="flex items-center justify-between py-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar name={s.full_name || s.username} src={s.avatar_url} size={22} />
                <span className="truncate text-sm text-foam">{s.full_name || s.username || "channel"}</span>
              </div>
              <button onClick={() => onRestore(s.id)} className="ml-2 shrink-0 text-xs text-teal hover:underline">Restore</button>
            </div>
          ))}
        </>
      )}
      <p className="mt-3 text-[10px] text-mist/60">Drag subscription avatars to reorder. Right-click to hide.</p>
    </div>
  );
}
