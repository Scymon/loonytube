// LoonyTube — Schedule domain types.
// ScheduleChannel + ScheduleEvent are the canonical shapes passed through every
// schedule component. When the live-streams backend is wired up, produce these
// shapes in page.tsx and pass them straight into DashSchedule.

export type CategoryTag = "LIVE" | "TECH" | "DESIGN" | "GAMING";

export type ScheduleEvent = {
  id: string;
  title: string;
  /** Display string already formatted, e.g. "8:00 PM" */
  startLabel: string;
  /** Minutes from the grid startHour (used for CSS positioning) */
  startMinutes: number;
  /** Duration in minutes */
  durationMinutes: number;
  category: CategoryTag;
  isLive: boolean;
};

export type ScheduleChannel = {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
  subsLabel?: string;
  events: ScheduleEvent[];
};
