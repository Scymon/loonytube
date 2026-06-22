"use client";

import { useState } from "react";
import ScheduleGrid from "./schedule/ScheduleGrid";
import ScheduleFilters from "./schedule/ScheduleFilters";
import type { ScheduleChannel } from "@/types/schedule";

type Filter = "all" | "live" | "tonight";

type Props = {
  channels?: ScheduleChannel[];
  /** ISO date label to display next to "My Schedule", e.g. "Mon, Jun 15" */
  dateLabel?: string;
};

// Default evening window: 8 PM – midnight
const HOURS = [20, 21, 22, 23, 0];

export default function DashSchedule({ channels = [], dateLabel }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible = channels.filter((ch) => {
    if (filter === "live")    return ch.events.some((e) => e.isLive);
    if (filter === "tonight") return ch.events.length > 0;
    return true;
  });

  return (
    <section>
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Calendar icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
            className="text-mist">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M3 9h18M8 2v4M16 2v4" />
          </svg>
          <h2 className="text-base font-bold text-foam">My Schedule</h2>
          {dateLabel && (
            <span className="text-xs text-mist">{dateLabel}</span>
          )}
        </div>
        <ScheduleFilters active={filter} onChange={setFilter} />
      </div>

      {/* Grid */}
      <div className="rounded-xl border border-edge bg-surface/50 p-3">
        <ScheduleGrid channels={visible} hours={HOURS} />
      </div>
    </section>
  );
}
