# LoonyTube CMS vs Instatic — Comparison & Improvement Plan

*Written 2026-07-01. Compared against [CoreBunch/Instatic](https://github.com/CoreBunch/Instatic) at HEAD (cloned, ~2,500 TS files) and our CMS surface: `admin/page-builder/*`, `PageManager`, `supabase/cms.sql` + `cms-blocks.sql`, `/p/[slug]`.*

## Framing — what each thing is

Instatic is a **CMS product**: one Bun server containing a canvas editor, design-token engine, typed reusable components, template/layout system, collection loops, forms, a media workspace, RBAC (36 capabilities), a plugin sandbox, an AI editing agent, and a three-layer static publishing pipeline. Our CMS is a **feature of a video platform**: 9 block types, a props panel, drag/drop canvas with undo/redo, one `pages` table, rendered at `/p/[slug]`.

That difference is the whole plan. We should not chase Instatic's product surface — we should steal the ~6 ideas that fix real weaknesses in ours, at our scale.

## Feature comparison

| Capability | Instatic | LoonyTube CMS | Gap severity |
|---|---|---|---|
| Draft vs published separation | Full editorial workflow: draft → scheduled → published | **None — autosave writes the live `blocks` column.** Editing a published page publishes each keystroke (10s autosave) | **High** |
| Version history / revert | Version history on published copies | None | **High** |
| SEO metadata | Semantic HTML output, per-page meta | **No `generateMetadata`, no description/OG fields, no sitemap.ts, no robots.ts** | **High** |
| Delivery / caching | Baked static HTML + LRU render cache + publish-version busting | `/p/[slug]` is `force-dynamic` — DB query on every view of pages that change ~never | **High** |
| Media management | OS-style media workspace, usage tracking, replace flows | Image/bg blocks take **raw URLs only** (no upload, no library) — despite the app already having storage upload flows in ArticleComposer/ProfileEditor | Medium |
| Dynamic content in pages | Loops render any collection (posts, tables) with variants | Blocks are static; only a hand-pasted CF video UID embeds platform content | Medium |
| Reusable components | Typed params, named slots, edit-once-update-everywhere | Duplicate block only (single page) | Medium |
| Scheduled publishing | Built-in | None (but the app already has a video Scheduler pattern to reuse) | Low |
| Paste/import HTML | Import pipeline, whole-site Super Import | Exists in ArticleComposer (`paste.ts`) but **not wired into the page builder** | Low (cheap win) |
| Sanitization | DOMPurify at publish boundary | `renderMd` escapes first (fixed 07-01), block props render as JSX text | Parity — OK |
| Audit trail | Real RBAC + auditing | `site_config` stamps `updated_by`; `pages` doesn't | Low |
| Design tokens | Core Framework: token-driven shades/type/spacing | Hardcoded `COLOR_PRESETS` array in the props panel | Low |
| Canvas editor UX | Multi-breakpoint frames, live edit mode | Single-column canvas + preview | Not worth chasing |
| Plugins / AI agent / forms / ⌘K | Yes | No | Out of scope |

## Explicitly not adopting

Multi-breakpoint canvas frames, the plugin sandbox, the AI editing agent, form builder, command palette, and the design-token engine. Each is a product in itself; our CMS exists to publish "About", "Terms", landing pages, and the occasional campaign page. Also **not** moving content into a generic `data_tables`/`data_rows` model — Supabase tables with RLS are already our content model.

## Improvement plan

### Phase 1 — Draft/publish separation + revisions *(the editorial gap; `features` branch + migration)*
The one Instatic idea we genuinely need. Today `usePageBuilder` autosaves into the same `blocks` column the public page reads.
1. Migration `supabase/cms-drafts.sql`: add `draft_blocks jsonb`, `published_at timestamptz`, `updated_by uuid` to `pages`; new `page_revisions` table (`page_id, blocks, saved_at, saved_by`, keep last ~20 per page).
2. Builder autosaves to `draft_blocks`; a **Publish** button copies draft → `blocks` + snapshots a revision; "Discard draft" restores from `blocks`. `PageInfoPanel` gets publish state + "unpublished changes" indicator.
3. Revision list in the Page sidebar with one-click restore (into draft, not live).
Size: M. This also makes the is_published toggle honest — right now "published" pages mutate silently.

### Phase 2 — SEO + delivery *(the traffic gap; pairs with performance-plan P2)*
1. Add `description text`, `og_image_url text` to `pages`; expose in `PageInfoPanel`.
2. `generateMetadata()` in `/p/[slug]/page.tsx` (title, description, OG/Twitter card).
3. Drop `force-dynamic` on `/p/[slug]`; fetch via `unstable_cache(..., { tags: ["page:" + slug] })` and call `revalidateTag` from the publish action — Instatic's publish-version cache busting, expressed in Next.js primitives. CMS pages then serve cached until actually republished.
4. `src/app/sitemap.ts`: published pages + recent public watch/article URLs; `robots.ts` alongside.
Size: S–M. Highest value-per-line in this plan.

### Phase 3 — Media picker *(kill raw-URL-only images)*
One shared `MediaPicker` modal (upload to the existing `media` bucket + grid of previously uploaded files, reusing ArticleComposer's upload logic) wired into: image block source, BgImagePicker, cover fields. No usage tracking, no folders — that's Instatic scope creep; a flat "your uploads" grid covers 95%.
Size: M.

### Phase 4 — Platform-aware blocks *(Instatic's "loops," reduced to what we'd actually use)*
Three new block types that render live platform data server-side in `/p/[slug]`:
- `latest-videos` (props: category?, count, layout) → reuses `RealShelf`
- `creator-spotlight` (props: handle) → reuses `ChannelHero` pieces
- `latest-articles` (props: count) → reuses `ArticleCard`
`BlockRenderer` stays presentational: the page fetches data for these block types (parallel, per performance-plan patterns) and passes it in; the canvas shows a labeled placeholder instead of live data.
Size: M–L, but this is what turns CMS pages from static brochures into pages worth linking from the nav.

### Phase 5 — Cheap wins *(each ≤ a session)*
1. Wire the ArticleComposer `paste.ts` HTML/Markdown converter into the page-builder text block (paste a doc, get blocks).
2. "Save as section" presets: `cms_presets` table storing a block's type+props; palette gains a Presets group. Poor-man's Visual Components — no params, no live linking, deliberately.
3. Scheduled publish: `publish_at` column + the existing video-Scheduler pattern.
4. `updated_by` stamp + revision author display (falls out of Phase 1's table).
5. Reserved-slug editable pages for `404` and `welcome`, so the pages we hardcoded (e.g. `not-found.tsx`) can defer to CMS content when an admin has authored one.

## Suggested order

Phase 2 first (smallest, most user-visible — SEO + speed), then Phase 1 (editorial safety), then 3, 5, 4. Phases 1–2 together close every **High** row in the table above.


---

# Builder 2.0 — competing with Framer / Divi / Instatic (added 2026-07-02)

Operator decision (2026-07-02): the page builder should compete with Framer, Divi, and
Instatic — "better UI, more property controls, columns that hold blocks, sections,
rows, and columns, more Figma-like design, mapping to CSS properties, JSON export."
This supersedes the "not adopting design tokens / multi-breakpoint" line above:
LoonyTube is a full CMS + social + video platform, and the builder is a pillar of it.

## Target data model

Flat `Block[]` becomes a tree. Containers are blocks whose `children` hold blocks:

```
Page
└─ section (full-width band; bg, padding)
   └─ row (horizontal flex; gap, wrap, vertical align)
      └─ column (width fraction; holds any blocks, incl. nested rows)
         └─ leaf blocks (hero, text, image, video, cta, features, …)
```

- `Block` gains `children?: Block[]` (containers only) — same `id`/`props`/`style`
  shape at every level, so undo history, revisions, drafts, and JSON export/import
  (`{ version: 2, blocks }`) all keep working with the same whole-tree snapshots.
- Legacy pages (flat arrays / `version: 1` exports) load unchanged: top-level leaf
  blocks are valid forever; "wrap in section" is an explicit action, not a migration.
- Design properties: `style?: NodeStyle` on every node (shipped — Phase A below).
  All values typed + validated in `styleToCss()`; free-form CSS strings are
  deliberately impossible (style JSON renders on the public route → security boundary).

## Phases

**A. Style system — SHIPPED 2026-07-02.** `style.ts` (NodeStyle → validated CSS),
`StylePanel` in the props panel for every block (spacing, size, surface, text,
effects), applied by `BlockRenderer` in canvas + public page. Untouched blocks
render byte-identical to Builder 1.x.

**B. Container tree (L).** `section`/`row`/`column` block types with `children`;
recursive `BlockRenderer`; recursive tree ops in `usePageBuilder`
(find/update/insert/delete/move-within-parent by id); nested click-selection on
canvas (stopPropagation up the tree) with breadcrumb in the props-panel header;
palette gains a Layout group; "wrap selection in section". Drag-and-drop *between*
containers can land after buttons-based moves — Divi shipped years on buttons.

**C. Figma-like UI (M–L).** Layers panel (tree sidebar; the flat `group` type
retires in favor of real nesting), multi-select, copy/paste style, per-breakpoint
overrides (`style.md`, `style.lg` partial NodeStyle merged in a generated class —
inline styles can't express media queries), and inline editing extended to every
text-bearing block (hero/text/cta already have it).

**D. Presets & templates (M).** "Save as section" into a `cms_presets` table,
starter page templates, and the Phase 3–5 items above (media picker, platform
blocks) which all compose better once containers exist.

Order: B → C → D. Phase 3 (media picker) from the original plan slots naturally
between B and C. One phase per branch, per GIT-WORKFLOW.
