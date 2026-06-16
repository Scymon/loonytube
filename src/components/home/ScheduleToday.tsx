// Placeholder. Renders sample data until schedule/premieres (Phase 5) exists.
import Avatar from "@/components/Avatar";
import type { ScheduleItem } from "./placeholders";

export default function ScheduleToday({ items }: { items: ScheduleItem[] }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foam">Your Schedule Today</h2>
        <button className="text-sm font-semibold text-link hover:underline">Manage</button>
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div
            key={it.time}
            className={`flex gap-4 rounded-xl border p-3 ${
              it.live ? "border-sky/60 bg-sky/5" : "border-edge bg-surface"
            }`}
          >
            <div className="w-16 shrink-0">
              <p className="text-sm font-semibold text-foam">{it.time}</p>
              <p className="text-xs text-mist">{it.when}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate">
                <Avatar name={it.channel} size={18} />
                <span className="text-sm font-semibold text-teal">{it.channel}</span>
                <span className="truncate text-sm text-foam">{it.title}</span>
                {it.live && (
                  <span className="rounded bg-loonred px-1.5 py-0.5 text-[10px] font-bold text-white">LIVE</span>
                )}
              </p>
              <p className="mt-0.5 truncate text-xs text-mist">{it.note}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
