"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { createClient } from "@/lib/supabase/client";
import type { Block } from "./types";

export type PageRevision = { id: string; saved_at: string };

// Draft/publish workflow for the page builder. Edits autosave into
// pages.draft_blocks (see usePageBuilder); publishing promotes the draft into
// pages.blocks, snapshots a revision, and busts the public page cache.
export function useDraftPublish({
  pageId, supabase, blocks, resetTo, initialBlocks, initialDraftBlocks,
}: {
  pageId: string;
  supabase: ReturnType<typeof createClient>;
  blocks: Block[];
  resetTo: (b: Block[]) => void;
  initialBlocks: Block[];
  initialDraftBlocks: Block[] | null;
}) {
  // publishedRef holds the blocks the public page currently serves.
  const publishedRef = useRef<Block[]>(initialBlocks);
  const [hasDraft, setHasDraft]     = useState(initialDraftBlocks != null);
  const [publishing, setPublishing] = useState(false);
  const [revisions, setRevisions]   = useState<PageRevision[]>([]);

  // Any edit after mount means there is a draft (autosave persists it)
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    setHasDraft(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  const loadRevisions = useCallback(() => {
    supabase
      .from("page_revisions")
      .select("id, saved_at")
      .eq("page_id", pageId)
      .order("saved_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setRevisions(data ?? []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);
  useEffect(() => { loadRevisions(); }, [loadRevisions]);

  // Promote the draft to the live page + snapshot a revision
  async function publishDraft() {
    setPublishing(true);
    const current = blocks;
    const { error } = await supabase
      .from("pages")
      .update({ blocks: current, draft_blocks: null, published_at: new Date().toISOString() })
      .eq("id", pageId);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("page_revisions")
        .insert({ page_id: pageId, blocks: current, saved_by: user?.id ?? null });
      publishedRef.current = current;
      setHasDraft(false);
      mountedRef.current = false; // next blocks change re-arms the draft flag
      fetch("/api/pages/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      }).catch(() => {});
      loadRevisions();
    }
    setPublishing(false);
  }

  // Throw the draft away and go back to what is live
  async function discardDraft() {
    if (!confirm("Discard all unpublished changes and restore the live version?")) return;
    await supabase.from("pages").update({ draft_blocks: null }).eq("id", pageId);
    resetTo(publishedRef.current);
    setHasDraft(false);
    mountedRef.current = false;
  }

  // Replace the whole draft (import, clear, revision restore) — never touches live
  async function replaceDraft(next: Block[]) {
    resetTo(next);
    await supabase.from("pages").update({ draft_blocks: next }).eq("id", pageId);
    setHasDraft(true);
  }

  // Load a published revision into the DRAFT (never straight to live)
  async function restoreRevision(revisionId: string) {
    const { data } = await supabase
      .from("page_revisions")
      .select("blocks")
      .eq("id", revisionId)
      .maybeSingle();
    if (!data) return;
    await replaceDraft((data.blocks as Block[]) ?? []);
  }

  return { publishedRef, hasDraft, publishing, revisions, publishDraft, discardDraft, restoreRevision, replaceDraft };
}
