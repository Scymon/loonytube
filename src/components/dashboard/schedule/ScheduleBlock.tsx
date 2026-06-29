import type { ScheduleEvent, CategoryTag } from "@/types/schedule";

const CAT_COLORS: Record<CategoryTag, string> = {
  LIVE:    "bg-teal/20 border-teal/40 text-teal",
  TECH:    "bg-sky/20  border-sky/40  text-sky",
  DESIGN:  "bg-violet-500/20 border-violet-500/40 text-violet-300",
  GAMING:  "bg-amber-500/20  border-amber-500/40  text-amber-300",
};

const CAT_PILL: Record<CategoryTag, string> = {
  LIVE:   "bg-teal   text-ink",
  TECH:   "bg-sky    text-ink",
  DESIGN: "bg-violet-500 text-white",
  GAMING: "bg-amber-500  text-ink",
};

type Props = {
  event: ScheduleEvent;
  /** Width expressed as a percentage of the parent grid track */
  widthPct: number;
  /** Left offset as a percentage of the parent grid track */
  leftPct: number;
};

export default function ScheduleBlock({ event, widthPct, leftPct }: Props) {
  const color  = CAT_COLORS[event.category as CategoryTag] ?? CAT_COLORS.TECH;
  const pill   = CAT_PILL[event.category  as CategoryTag] ?? CAT_PILL.TECH;

  return (
    <div
      className={`absolute top-1 bottom-1 rounded-lg border px-2 py-1 overflow-hidden cursor-pointer hover:brightness-125 transition ${color}`}
      style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 5)}%` }}
      title={event.title}
    >
      <div className="flex items-center gap-1 mb-0.5 flex-wrap">
        <span className="text-[9px] font-bold text-mist">{event.startLabel}</span>
        {event.isLive && (
          <span className="rounded px-1 py-0 text-[9px] font-bold bg-loonred text-white">LIVE</span>
        )}
        <span className={`rounded px-1 py-0 text-[9px] font-bold ${pill}`}>{event.category}</span>
      </div>
      <p className="text-[11px] font-semibold text-foam leading-tight line-clamp-2">{event.title}</p>
    </div>
  );
}
