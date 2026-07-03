"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import type { Block, BlockType } from "./types";
import { usePageBuilder } from "./usePageBuilder";
import { useDraftPublish } from "./useDraftPublish";
import Sidebar from "./Sidebar";
import BlockCanvas    from "./BlockCanvas";
import PropsPanel, { PageInfoPanel } from "./PropsPanel";
import { useBuilderShortcuts } from "./useBuilderShortcuts";
import TitleBar from "./toolbar/TitleBar";
import ViewportTools, { type CanvasWidth } from "./toolbar/ViewportTools";
import HistoryTools from "./toolbar/HistoryTools";
import PublishTools from "./toolbar/PublishTools";
import PageTools from "./toolbar/PageTools";
import StatusBar from "./toolbar/StatusBar";

type Props = {
  pageId: string;
  initialTitle: string;
  initialSlug: string;
  initialPublished: boolean;
  initialBlocks: Block[];              // published blocks
  initialDraftBlocks: Block[] | null;  // work-in-progress; null = no draft
  onClose: (updated: {
    title: string; is_published: boolean; updated_at: string;
    blocks: Block[]; draft_blocks: Block[] | null;
  }) => void;
};



export default function PageBuilder({
  pageId, initialTitle, initialSlug, initialPublished, initialBlocks, initialDraftBlocks, onClose,
}: Props) {
  const supabase = createClient();
  const [title, setTitle]             = useState(initialTitle);
  const [isPublished, setIsPublished] = useState(initialPublished);
  const [description, setDescription] = useState("");
  const [ogImage, setOgImage]         = useState("");

  // SEO fields aren't part of PageManager's list payload — fetch on mount.
  useEffect(() => {
    supabase.from("pages").select("description, og_image_url").eq("id", pageId).maybeSingle()
      .then(({ data }) => {
        setDescription(data?.description ?? "");
        setOgImage(data?.og_image_url ?? "");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);
  const [canvasWidth, setCanvasWidth] = useState<CanvasWidth>("desktop");
  const [zoom,       setZoom]       = useState(1);
  const [showGrid,   setShowGrid]   = useState(false);

  function adjustZoom(delta: number) {
    setZoom(z => Math.max(0.25, Math.min(2, Math.round((z + delta) * 20) / 20)));
  }

  const {
    blocks, selectedId, selectedBlock, preview, saveStatus,
    canUndo, canRedo,
    setSelectedId, addBlock, addBlockAtIndex, updateBlock, updateBlockStyle,
    duplicateBlock, deleteBlock, moveBlock, reorderBlocks,
    undo, redo, togglePreview, toggleHidden, resetTo,
  } = usePageBuilder(pageId, initialDraftBlocks ?? initialBlocks);

  // ── Draft / publish workflow (autosave -> draft; Publish promotes to live) ──
  const {
    publishedRef, hasDraft, publishing, revisions,
    publishDraft, discardDraft, restoreRevision, replaceDraft,
  } = useDraftPublish({ pageId, supabase, blocks, resetTo, initialBlocks, initialDraftBlocks });

  useBuilderShortcuts({
    selectedId, setSelectedId, deleteBlock, undo, redo, duplicateBlock,
    togglePreview, setZoom, setShowGrid,
  });

  // ── Meta save ─────────────────────────────────────────────────────────────
  async function saveMeta(
    field: "title" | "is_published" | "description" | "og_image_url",
    value: string | boolean
  ) {
    await supabase.from("pages").update({ [field]: value === "" ? null : value }).eq("id", pageId);
    // Meta changes affect the rendered page + sitemap — bust the cache
    fetch("/api/pages/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId }),
    }).catch(() => {});
  }

  async function handleClose() {
    const { data } = await supabase
      .from("pages")
      .select("updated_at")
      .eq("id", pageId)
      .maybeSingle();
    onClose({
      title,
      is_published: isPublished,
      updated_at: data?.updated_at ?? new Date().toISOString(),
      blocks: publishedRef.current,
      draft_blocks: hasDraft ? blocks : null,
    });
  }

  const handleAddBlock = useCallback(
    (type: BlockType, afterId?: string | null) => addBlock(type, afterId ?? selectedId),
    [addBlock, selectedId]
  );

  const [portalMounted, setPortalMounted] = useState(false);
  useEffect(() => { setPortalMounted(true); }, []);

  const builderEl = (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-ink">

      {/* ── Top bar — composed from toolbar/ tool components ── */}
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-edge bg-surface px-4">
        <TitleBar
          title={title}
          setTitle={setTitle}
          onSaveTitle={() => saveMeta("title", title)}
          onClose={handleClose}
        />

        {!preview && (
          <ViewportTools
            canvasWidth={canvasWidth}
            setCanvasWidth={setCanvasWidth}
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid(g => !g)}
            zoom={zoom}
            onZoom={adjustZoom}
            onResetZoom={() => setZoom(1)}
          />
        )}

        <div className="flex items-center gap-2 shrink-0">
          {!preview && (
            <>
              <HistoryTools undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} saveStatus={saveStatus} />
              <PageTools slug={initialSlug} blocks={blocks} onReplaceDraft={replaceDraft} />
            </>
          )}
          <PublishTools
            slug={initialSlug}
            isPublished={isPublished}
            onTogglePublished={() => {
              const next = !isPublished;
              setIsPublished(next);
              saveMeta("is_published", next);
            }}
            preview={preview}
            onTogglePreview={togglePreview}
          />
        </div>
      </header>


      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {!preview && (
          <Sidebar
            blocks={blocks}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdd={(type) => handleAddBlock(type, selectedId)}
            onToggleHidden={toggleHidden}
            onReorder={reorderBlocks}
            onAddGroup={() => addBlock("group", selectedId)}
          />
        )}

        <BlockCanvas
          blocks={blocks}
          selectedId={selectedId}
          preview={preview}
          canvasWidth={canvasWidth}
          onSelect={setSelectedId}
          onEdit={(blockId, field, value) => updateBlock(blockId, { [field]: value })}
          onDelete={deleteBlock}
          onMove={moveBlock}
          onReorder={reorderBlocks}
          onDuplicate={duplicateBlock}
          onAdd={(type, afterId) => addBlock(type, afterId)}
          onDeselect={() => setSelectedId(null)}
          zoom={zoom}
          onZoom={adjustZoom}
          showGrid={showGrid}
        />

        {!preview && selectedBlock && (
          <PropsPanel block={selectedBlock} onChange={updateBlock} onStyleChange={updateBlockStyle} />
        )}
        {!preview && !selectedBlock && (
          <PageInfoPanel
            title={title}
            setTitle={setTitle}
            slug={initialSlug}
            isPublished={isPublished}
            setIsPublished={setIsPublished}
            onSaveMeta={saveMeta}
            hasDraft={hasDraft}
            publishing={publishing}
            onPublish={publishDraft}
            onDiscard={discardDraft}
            revisions={revisions}
            onRestore={restoreRevision}
            description={description}
            setDescription={setDescription}
            ogImage={ogImage}
            setOgImage={setOgImage}
            blockCount={blocks.filter(b => b.type !== "group").length}
          />
        )}
      </div>

      {/* ── Status bar ── */}
      {!preview && (
        <StatusBar
          selectedBlock={selectedBlock}
          blockCount={blocks.filter(b => b.type !== "group").length}
          zoom={zoom}
        />
      )}
    </div>
  );

  if (!portalMounted) return null;
  return createPortal(builderEl, document.body);
}