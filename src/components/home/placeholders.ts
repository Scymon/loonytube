/**
 * ──────────────────────────────────────────────────────────────────────────
 *  UI DESIGN PLACEHOLDERS — NOT real data, NOT persisted to the database.
 * ──────────────────────────────────────────────────────────────────────────
 *  These exist so the homepage matches the Figma while the backend for each
 *  section doesn't exist yet. Nothing here is written to Supabase. To make a
 *  section real, replace its export with a query in src/app/(app)/page.tsx and
 *  pass the result into the component — the props shape stays the same.
 *
 *    samplePost  ->  Loon Posts table        (Phase 2.5 — hybrid feed)
 *    liveNow     ->  live streaming           (Phase 5)
 *    schedule    ->  schedule / premieres     (Phase 5)
 *    shelves     ->  video categories / tags  (add `category` to videos)
 * ──────────────────────────────────────────────────────────────────────────
 */

export type SamplePost = {
  author: string;
  handle: string;
  agoLabel: string;
  body: string;
  comments: number;
  reposts: number;
  likes: number;
};

export const samplePost: SamplePost = {
  author: "Alex Rivers",
  handle: "arivers",
  agoLabel: "4h",
  body: "Just tried the new LoonyTube feed and I'm obsessed. The mix of video and threads is exactly what we needed. Who else is migrating? 🚀",
  comments: 428,
  reposts: 1200,
  likes: 8400,
};

export type LiveChannel = { name: string; watching: number };
export const liveNow: LiveChannel[] = [
  { name: "TechVerse", watching: 12400 },
  { name: "GamerX", watching: 8700 },
  { name: "LiveNews", watching: 45000 },
];

export type ScheduleItem = {
  time: string;
  when: "Now" | "Next" | "Tonight";
  channel: string;
  title: string;
  note: string;
  live?: boolean;
};
export const schedule: ScheduleItem[] = [
  { time: "8:00 PM", when: "Now", channel: "TechVerse", title: "Verse Live Build", note: "Live right now — tap to watch", live: true },
  { time: "9:30 PM", when: "Next", channel: "GamerX", title: "AI Tools Breakdown", note: "Exploring the latest AI tools and workflows" },
  { time: "11:00 PM", when: "Tonight", channel: "DesignHub", title: "Night Mode Design", note: "Late-night UI design session" },
];

export type ShelfCard = { label: string; channel: string; duration: string };
export type Shelf = { icon: string; title: string; channel: string; cards: ShelfCard[] };
export const shelves: Shelf[] = [
  {
    icon: "🏆",
    title: "Esports & Action",
    channel: "EsportsHub",
    cards: [
      { label: "Finals Highlights", channel: "EsportsHub", duration: "18:42" },
      { label: "Pro Tips", channel: "EsportsHub", duration: "12:34" },
      { label: "Neon Run", channel: "GamerX", duration: "09:41" },
      { label: "Server Tour", channel: "GamerX", duration: "22:15" },
    ],
  },
  {
    icon: "💻",
    title: "Tech & Builds",
    channel: "TechVerse",
    cards: [
      { label: "Finals Highlights", channel: "TechVerse", duration: "18:42" },
      { label: "Pro Tips", channel: "TechVerse", duration: "12:34" },
      { label: "Neon Run", channel: "Jordan Flow", duration: "09:41" },
      { label: "Server Tour", channel: "Jordan Flow", duration: "22:15" },
    ],
  },
];
