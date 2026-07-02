# LoonyTube — Structure Analysis & Restructuring Plan

*Written 2026-07-01. All counts measured against the working tree on `fix/cms-render-escape-and-staged-ui-polish`.*

This is a plan for `refactor`-branch work: every phase is behavior-neutral, independently shippable, and gated by `npx tsc --noEmit`. Phases are ordered by risk (lowest first) — stop after any phase and the codebase is still better than before.

---

## What's already good

The broad shape is right and shouldn't change: route groups `(app)` / `(auth)` with separate layouts, domain folders under `src/components/`, the server/client Supabase split in `lib/supabase/`, RLS-first migrations, and a real design-token system (Tailwind tokens + `lt-*` component classes). The plan below tightens execution, not architecture.

---

## Findings

### F1 — 20 files violate the project's own 300-line hard limit

EDITING-RULES.md calls 300 lines the "primary defence against file corruption." Current violations:

| File | Lines | Worst offenders inside |
|---|---|---|
| `create/ArticleComposer.tsx` | 1043 | editor toolbar, block rendering, image upload, publish flow |
| `admin/page-builder/PropsPanel.tsx` | 770 | one giant switch over block types |
| `dashboard/DashHero.tsx` | 750 | hero + resume rail + inline player logic |
| `watch/WatchPlayer.tsx` | 747 | OSD, shortcuts panel, settings menus, mode logic |
| `messages/Thread.tsx` | 623 | bubbles, embeds, composer, upload |
| `Ribbon.tsx` | 562 | nav tree + carousel + subscriptions + playlists |
| `create/AudioComposer.tsx` / `VideoComposer.tsx` | 489 / 488 | forms + upload + polling |
| 12 more between 302–456 | | admin editors, ContentTable, AudioContext, ChannelHero, Nav, WatchLayout, studio/live page |

### F2 — `lib/format.ts` exists but 12 components re-implement it

`fmt`, `fmtDur`, `fmtViews`, `fmtTime` are locally redefined in AudioPlayer, MiniPlayer, ChannelHero, DashHero, WatchHistorySection, Thread, QueuePanel, WatchMeta, WatchPlayer, WatchSidebar, Scheduler, ScheduleGrid — all duplicating `nfmt()` / `formatTime()`. Same-name functions with subtly different signatures (`s: number | null` vs `number`) invite drift.

### F3 — ~30 `localStorage` keys as scattered string literals

`loonytube:resume` (8 call sites), `loonytube:volume` (7), `loonytube:queue*`, `loonytube:playerMode`, etc. are typed by hand everywhere. One typo = silent state loss. No single place documents what's persisted.

### F4 — `src/utils/` vs `src/lib/` split

`utils/` holds exactly one file (`parseChapters.ts`). Two homes for the same concept means every new helper faces a coin-flip decision.

### F5 — 18 root-level components mix three different kinds of thing

App chrome (Nav, AppShell, Ribbon, SiteFooter, SearchBar), true primitives (Avatar, Logo, RoleBadge), and misplaced domain components (Comments → watch; PlaylistModal, StreamPlayer, ThumbnailPicker, ProcessingToast/Watcher → studio/media). The root folder is where components go when no one decides.

### F6 — Types live inside component files

`src/types/` holds one file, while 29 component files export types. Cross-domain imports like `WatchLayout` importing `SidebarVideo` from `WatchSidebar.tsx` couple modules that should share a types file (`src/types/watch.ts` etc.).

### F7 — 32 unnumbered SQL migrations, ordered only by a stale README table

Confirmed by the 07-01 audit: the README table lists 17 of 32 files. Order is tribal knowledge. `messages.sql` vs `messages-v01.sql` vs `messages-embeds.sql` — which runs first is guesswork.

### F8 — Naming and boundary drift (smaller)

- `AudioContext` (337 lines) also owns the *video* miniplayer state (`setVideoMiniMode`, `videoOnWatchPage`) — it's really a global PlayerContext.
- API route naming mixes styles: `/api/video/visibility` (singular) vs `/api/videos/[id]/download` (plural) vs `/api/sync-video-status` (verb-first).
- Root of the repo carries 7 markdown guides + `featurelist.html/md`.

---

## Target structure

```
src/
  app/                  (unchanged shape; keep loading/error/not-found files per group)
  components/
    chrome/             ← Nav, AppShell, Ribbon, RibbonSettings, SiteFooter, SearchBar,
                          ProcessingToast, ProcessingWatcher   (app shell & global overlays)
    ui/                 ← Avatar, Logo, RoleBadge, LikeButton  (dumb primitives, no data fetching)
    watch/              ← + Comments, PlayerContextMenu, StreamPlayer, PersistentMiniVideo
    studio/             ← + ThumbnailPicker
    playlists/          ← PlaylistModal + PlaylistClient pieces
    …existing domain folders unchanged
  lib/
    format.ts           (single source: nfmt, ago, formatTime, fmtDur — delete local copies)
    storage.ts          ← NEW: every localStorage key as a typed constant + get/set helpers
    parseChapters.ts    ← moved from utils/ (delete src/utils/)
    …
  contexts/
    PlayerContext.tsx   ← renamed from AudioContext; split audio vs video state internally
  types/
    watch.ts, messages.ts, studio.ts, …  (types currently exported from components)
supabase/
  001_schema.sql … 032_ribbon_fixed_hidden.sql   (numbered; README table generated by script)
docs/
  agent/                ← CODING-GUIDE, EDITING-RULES, GIT-WORKFLOW, SKILLS (CLAUDE.md stays
                          at root and links here)
  featurelist.md        (html version deleted or regenerated on demand)
```

---

## Phased plan (each = one `refactor` branch merge)

### Phase 1 — Mechanical consolidation *(low risk, ~1 session)*
1. `src/utils/parseChapters.ts` → `src/lib/parseChapters.ts`; delete `utils/`; fix ~2 imports.
2. Create `src/lib/storage.ts`: `export const LS = { resume: "loonytube:resume", … } as const` plus `lsGet/lsSet` with the try/catch that's currently copy-pasted 30+ times. Migrate call sites mechanically (exact-string Python replace, file by file).
3. Extend `lib/format.ts` with the one missing shape (`fmtDur(s: number | null)`), then delete all 12 local re-implementations and import instead.
   **Gate:** tsc + grep shows zero `function fmt` in components, zero raw `loonytube:` literals outside `storage.ts`.

### Phase 2 — Component re-homing *(low risk, pure `git mv` + import updates)*
Move the 18 root components into `chrome/`, `ui/`, and their domains per the target tree. No file content changes beyond import paths. Update the two "where things live" maps (CODING-GUIDE.md, this doc).

### Phase 3 — Migration numbering *(medium risk, coordinate with any pending SQL)*
Prefix all 32 files `NNN_` in their true dependency order (reconstruct from `CREATE TABLE` / `ALTER` references; the git history of each file's first commit is the tiebreaker). Add `scripts/gen-migration-table.mjs` that emits the README table from the folder listing — closes the recurring "README table is stale" audit finding permanently. Rule: new migration = next number, README regenerated in the same commit.

### Phase 4 — Split the six worst files *(medium risk, one file per PR)*
Priority order (size × traffic): WatchPlayer, ArticleComposer, Thread, Ribbon, DashHero, ContentTable.
Pattern per file: extract visual chunks to siblings (`watch/player/OsdOverlay.tsx`, `create/article/Toolbar.tsx`, …), extract stateful logic to hooks (`useArticleEditor`, `useRibbonTree`), extract types to `src/types/`. Target: no file over 300; each extraction is a separate commit so a regression bisects cleanly. The admin/page-builder files (770/456/407/437) are lower priority — admin-only surface.

### Phase 5 — Boundary cleanup *(do last; touches behavior-adjacent code)*
1. Rename `AudioContext` → `PlayerContext`; internally split `useAudioPlayer()` / `useMiniVideo()` selectors so consumers stop re-rendering on unrelated state.
2. API route naming: standardize on plural-resource paths (`/api/videos/[id]/visibility`); keep old routes as thin re-exports for one release, then delete.
3. Root tidy: guides → `docs/agent/` with CLAUDE.md updated to point there; delete `featurelist.html`.

---

## Guardrails so it stays clean

- **Enforce the 300-line rule mechanically**: fix the broken lint setup (add `eslint-config-next` to devDependencies — known audit finding) and add `max-lines: ["warn", 300]`. A warning in every PR beats a rule in a doc.
- **`import/no-restricted-paths`** (or a simple grep in CI) to keep `components/ui/` from importing Supabase.
- The two structure maps (CODING-GUIDE.md "File System" section + this doc) get updated in the same commit as any structural change.

## Explicitly not proposed

- No app-router reshuffle: `(app)`/`(auth)`/`studio` layouts work; moving `studio` into a route group buys nothing and risks URL churn.
- No state-management library, no barrel `index.ts` files (they bloat bundles and create import cycles), no monorepo split — the app is one deployable and should stay that way.
- No CSS framework change; the token system just needs adoption (continue the `--lt-grad-*` pattern from 07-01).
