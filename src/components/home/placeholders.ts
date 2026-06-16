/**
 * Type definitions only. The fake sample data was removed — home sections now
 * render real data, or a "Coming soon" empty state when there's none.
 * These types remain for the (currently unused) LiveNowRail / ScheduleToday /
 * CategoryShelf components, which will be wired to real backends later.
 */
export type LiveChannel = { name: string; watching: number };
export type ScheduleItem = {
  time: string;
  when: "Now" | "Next" | "Tonight";
  channel: string;
  title: string;
  note: string;
  live?: boolean;
};
export type ShelfCard = { label: string; channel: string; duration: string };
export type Shelf = { icon: string; title: string; channel: string; cards: ShelfCard[] };
