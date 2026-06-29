import Avatar from "@/components/Avatar";
import ScheduleBlock from "./ScheduleBlock";
import type { ScheduleChannel } from "@/types/schedule";

type Props = {
  channel: ScheduleChannel;
  /** Grid start in minutes-from-midnight */
  gridStartMin: number;
  /** Total grid duration in minutes */
  gridDuration: number;
};

export default function ScheduleRow({ channel, gridStartMin, gridDuration }: Props) {
  return (
    <div className="flex border-b border-edge/40 last:border-0">
      {/* Channel label — fixed width */}
      <div className="w-24 shrink-0 flex flex-col justify-center gap-0.5 pr-3 py-2">
        <div className="flex items-center gap-1.5">
          <Avatar name={channel.name} src={channel.avatar} size={20} />
          <span className="text-xs font-semibold text-foam truncate">{channel.name}</span>
        </div>
        {channel.subsLabel && (
          <span className="text-[10px] text-mist pl-[26px]">{channel.subsLabel}</span>
        )}
      </div>

      {/* Timeline track */}
      <div className="relative flex-1 min-h-[52px]">
        {channel.events.map((ev) => {
          const leftPct  = ((ev.startMinutes - gridStartMin) / gridDuration) * 100;
          const widthPct = (ev.durationMinutes / gridDuration) * 100;
          return (
            <ScheduleBlock
              key={ev.id}
              event={ev}
              leftPct={Math.max(0, leftPct)}
              widthPct={widthPct}
            />
          );
        })}
      </div>
    </div>
  );
}
