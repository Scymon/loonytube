"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Block } from "./page-builder/types";
import PageBuilder from "./page-builder/PageBuilder";

export type CmsPage = {
  id: string;
  slug: string;
  title: string;
  body: string;
  blocks: Block[];
  is_published: boolean;
  updated_at: string;
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function PageManager({
  initial,
  onPagesChange,
}: {
  initial: CmsPage[];
  onPagesChange?: (pages: CmsPage[]) => void;
}) {
  const supabase = createClient();
  const [pages, setPages] = useState(initial);

  function updatePages(next: CmsPage[]) {
    setPages(next);
    onPagesChange?.(next);
  }
  const [builderPage, setBuilderPage] = useState<CmsPage | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // ── Create new page (title + slug only) ──
  async function createPage() {
    const slug = newSlug.trim();
    const title = newTitle.trim();
    if (!slug || !title) { setCreateErr("Slug and title are required."); return; }
    const { data, error } = await supabase
      .from("pages")
      .insert({ slug, title, body: "", blocks: [], is_published: false })
      .select("id, slug, title, body, blocks, is_published, updated_at")
      .single();
    if (error) { setCreateErr(error.message); return; }
    const page = data as CmsPage;
    updatePages([page, ...pages]);
    setNewTitle(""); setNewSlug(""); setCreating(false); setCreateErr(null);
    setBuilderPage(page);       // open builder immediately
  }

  // ── Builder close — sync updated title/published back into the list ──
  function handleBuilderClose(updated: { title: string; is_published: boolean; updated_at: string }) {
    if (!builderPage) return;
    const next = pages.map((p) =>
      p.id === builderPage.id
        ? { ...p, title: updated.title, is_published: updated.is_published, updated_at: updated.updated_at }
        : p
    );
    updatePages(next);
    setBuilderPage(null);
  }

  async function deletePage(id: string) {
    if (!confirm("Delete this page? This cannot be undone.")) return;
    setDeleting(id);
    await supabase.from("pages").delete().eq("id", id);
    updatePages(pages.filter((p) => p.id !== id));
    setDeleting(null);
  }

  async function togglePublished(p: CmsPage) {
    const next = !p.is_published;
    const nextPages = pages.map((x) => (x.id === p.id ? { ...x, is_published: next } : x));
    updatePages(nextPages);
    await supabase.from("pages").update({ is_published: next }).eq("id", p.id);
  }

  return (
    <>
      {/* Visual builder — full-screen overlay */}
      {builderPage && (
        <PageBuilder
          pageId={builderPage.id}
          initialTitle={builderPage.title}
          initialSlug={builderPage.slug}
          initialPublished={builderPage.is_published}
          initialBlocks={builderPage.blocks ?? []}
          onClose={handleBuilderClose}
        />
      )}

      <div className="space-y-4">
        {/* Page list */}
        <div className="rounded-xl border border-edge bg-surface divide-y divide-edge">
          {pages.length === 0 && (
            <p className="py-6 text-center text-sm text-mist">No custom pages yet.</p>
          )}
          {pages.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${p.is_published ? "bg-teal" : "bg-mist/40"}`} />
                  <p className="truncate font-semibold text-foam">{p.title}</p>
                </div>
                <p className="mt-0.5 text-xs text-mist">
                  <a href={`/p/${p.slug}`} target="_blank" rel="noopener noreferrer"
                    className="hover:text-sky transition-colors">/p/{p.slug}</a>
                  <span className="mx-2">·</span>
                  {p.is_published ? "Published" : "Draft"}
                  <span className="mx-2">·</span>
                  {new Date(p.updated_at).toLocaleDateString()}
                  {(p.blocks?.length ?? 0) > 0 && (
                    <><span className="mx-2">·</span>{p.blocks.length} block{p.blocks.length !== 1 ? "s" : ""}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => togglePublished(p)}
                  className="text-xs text-mist hover:text-foam transition-colors px-2 py-1 rounded border border-edge hover:border-hair">
                  {p.is_published ? "Unpublish" : "Publish"}
                </button>
                <button onClick={() => setBuilderPage(p)}
                  className="text-xs text-teal hover:text-foam transition-colors px-2 py-1 rounded border border-teal/30 hover:border-teal">
                  Edit ✦
                </button>
                <button onClick={() => deletePage(p.id)} disabled={deleting === p.id}
                  className="text-xs text-loonred/70 hover:text-loonred transition-colors disabled:opacity-40">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create new page */}
        {creating ? (
          <div className="rounded-xl border border-sky/30 bg-surface p-5 space-y-3">
            <h3 className="font-semibold text-foam text-sm">New page</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-mist">Title</label>
                <input className="lt-input w-full" value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    setNewSlug(slugify(e.target.value));
                  }} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-mist">Slug</label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-mist">/p/</span>
                  <input className="lt-input flex-1" value={newSlug}
                    onChange={(e) => setNewSlug(slugify(e.target.value))} />
                </div>
              </div>
            </div>
            {createErr && <p className="text-xs text-loonred">{createErr}</p>}
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => { setCreating(false); setCreateErr(null); }}
                className="text-sm text-mist hover:text-foam transition-colors">Cancel</button>
              <button onClick={createPage}
                className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-ink hover:brightness-110 transition">
                Create & open builder
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setCreating(true)}
            className="w-full rounded-xl border border-dashed border-edge py-3 text-sm text-mist hover:border-teal/50 hover:text-teal transition-colors">
            + New page
          </button>
        )}
      </div>
    </>
  );
}
