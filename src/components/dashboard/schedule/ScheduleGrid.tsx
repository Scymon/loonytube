import ScheduleRow from "./ScheduleRow";
import type { ScheduleChannel } from "@/types/schedule";

type Props = {
  channels: ScheduleChannel[];
  /** Hours to show, e.g. [20, 21, 22, 23, 0] */
  hours: number[];
};

function fmtHour(h: number) {
  if (h === 0)  return "12:00 AM";
  if (h === 12) return "12:00 PM";
  return h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`;
}

export default function ScheduleGrid({ channels, hours }: Props) {
  const gridStartMin = hours[0] * 60;
  const gridDuration = hours.length * 60;

  return (
    <div className="overflow-x-auto">
      {/* Time header */}
      <div className="flex ml-24 border-b border-edge/40 pb-1 mb-1 min-w-[520px]">
        {hours.map((h) => (
          <div key={h} className="flex-1 text-[11px] text-mist font-medium">
            {fmtHour(h)}
          </div>
        ))}
      </div>

      {/* Channel rows */}
      <div className="min-w-[520px]">
        {channels.length === 0 ? (
          <div className="py-10 text-center text-sm text-mist">
            No channels you follow have scheduled content yet.
          </div>
        ) : (
          channels.map((ch) => (
            <ScheduleRow
              key={ch.id}
              channel={ch}
              gridStartMin={gridStartMin}
              gridDuration={gridDuration}
            />
          ))
        )}
      </div>
    </div>
  );
}
