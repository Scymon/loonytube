"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Block, BlockType, VideoRow } from "@/types/article";
import {
  DRAFT_KEY, rid, countWords, getDropUrl,
  makeKeyHandler, makePasteHandler, type EditorOps,
} from "@/components/create/article/helpers";

export function useArticleEditor() {
  const supabase = createClient();

  const [uid, setUid]             = useState<string | null>(null);
  const [title, setTitle]         = useState("");
  const [cover, setCover]         = useState<string | null>(null);
  const [blocks, setBlocks]       = useState<Block[]>([{ id: rid(), type: "text", value: "" }]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [busy, setBusy]           = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr]             = useState<string | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [draftSaved, setDraftSaved]   = useState(false);
  const [hasDraft, setHasDraft]       = useState(false);
  const [dragOver, setDragOver]       = useState<"cover" | "body" | null>(null);
  const [dropIdx, setDropIdx]         = useState<number | null>(null);

  const coverRef       = useRef<HTMLInputElement>(null);
  const imageRef       = useRef<HTMLInputElement>(null);
  const pendingBlockId = useRef<string | null>(null);
  const blockRefs      = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  function focusBlock(id: string, cursor: "start" | "end") {
    const el = blockRefs.current.get(id);
    if (!el) return;
    el.focus();
    const pos = cursor === "end" ? el.value.length : 0;
    el.setSelectionRange(pos, pos);
    setFocusedId(id);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, [supabase]);

  useEffect(() => {
    try { if (localStorage.getItem(DRAFT_KEY)) setHasDraft(true); } catch { /**/ }
  }, []);

  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, cover, blocks }));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    } catch { /**/ }
  }, [title, cover, blocks]);

  useEffect(() => {
    const t = setInterval(saveDraft, 10_000);
    return () => clearInterval(t);
  }, [saveDraft]);

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.title)  setTitle(d.title);
      if (d.cover)  setCover(d.cover);
      if (d.blocks) setBlocks(d.blocks);
      setHasDraft(false);
    } catch { /**/ }
  }
  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /**/ }
    setHasDraft(false);
  }

  // ── Block ops ──────────────────────────────────────────────────────────────
  const setText    = (id: string, v: string) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, value: v } : b));
  const setCaption = (id: string, v: string) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, caption: v } : b));
  const changeType = (id: string, type: BlockType) => setBlocks((bs) => bs.map((b) => b.id === id ? { ...b, type } : b));
  const remove     = (id: string) => setBlocks((bs) => bs.filter((b) => b.id !== id));
  const moveUp     = (i: number) => setBlocks((bs) => { const a = [...bs]; if (i > 0) [a[i-1], a[i]] = [a[i], a[i-1]]; return a; });
  const moveDown   = (i: number) => setBlocks((bs) => { const a = [...bs]; if (i < a.length-1) [a[i], a[i+1]] = [a[i+1], a[i]]; return a; });

  const addBlock = (type: BlockType) => {
    if (type === "image") { pendingBlockId.current = null; imageRef.current?.click(); return; }
    const nb = { id: rid(), type, value: "" };
    setBlocks((bs) => [...bs, nb]);
    setTimeout(() => setFocusedId(nb.id), 50);
  };

  function insertAfter(blockId: string) {
    const nb = { id: rid(), type: "text" as BlockType, value: "" };
    setBlocks((bs) => {
      const idx = bs.findIndex((b) => b.id === blockId);
      if (idx === -1) return [...bs, nb];
      return [...bs.slice(0, idx + 1), nb, ...bs.slice(idx + 1)];
    });
    setTimeout(() => {
      const el = blockRefs.current.get(nb.id);
      if (el) { el.focus(); el.setSelectionRange(0, 0); }
      setFocusedId(nb.id);
    }, 30);
  }

  function openImagePicker(blockId: string) {
    pendingBlockId.current = blockId;
    imageRef.current?.click();
  }

  function pickVideo(blockId: string, v: VideoRow) {
    setBlocks((bs) => bs.map((bl) =>
      bl.id === blockId
        ? { ...bl, videoId: v.id, videoTitle: v.title, videoThumb: v.thumbnail ?? undefined }
        : bl
    ));
  }

  // ── Keyboard / paste handler factories (logic lives in helpers.ts) ─────────
  const ops: EditorOps = { blocks, setBlocks, setText, remove, focusBlock, blockRefs, setFocusedId };
  const keyHandler   = (blockId: string, idx: number) => makeKeyHandler(ops, blockId, idx);
  const pasteHandler = (blockId: string, idx: number) => makePasteHandler(ops, blockId, idx);

  // ── Upload ─────────────────────────────────────────────────────────────────
  async function upload(file: File): Promise<string | null> {
    if (!uid) return null;
    const ext  = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${uid}/articles/${Date.now()}-${rid()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { upsert: false, contentType: file.type });
    if (error) { setErr(error.message); return null; }
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  async function pickCover(files: FileList | null) {
    if (!files?.[0]) return;
    setUploading(true); setErr(null);
    const url = await upload(files[0]);
    if (url) setCover(url);
    setUploading(false);
    if (coverRef.current) coverRef.current.value = "";
  }

  async function pickImage(files: FileList | null) {
    if (!files?.[0]) return;
    setUploading(true); setErr(null);
    const url = await upload(files[0]);
    if (url) {
      if (pendingBlockId.current) {
        setBlocks((bs) => bs.map((b) => b.id === pendingBlockId.current ? { ...b, url } : b));
      } else {
        setBlocks((bs) => [...bs, { id: rid(), type: "image", url }]);
      }
    }
    pendingBlockId.current = null;
    setUploading(false);
    if (imageRef.current) imageRef.current.value = "";
  }

  // ── Drag-and-drop ──────────────────────────────────────────────────────────
  async function handleCoverDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(null);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) { setUploading(true); const u = await upload(file); if (u) setCover(u); setUploading(false); return; }
    const url = getDropUrl(e);
    if (url) setCover(url);
  }

  async function handleBodyDrop(e: React.DragEvent, insertIdx?: number) {
    e.preventDefault(); setDragOver(null);
    const idx = insertIdx ?? blocks.length;
    function splice(bs: Block[], newBlock: Block) {
      return [...bs.slice(0, idx), newBlock, ...bs.slice(idx)];
    }
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) {
      setUploading(true); const u = await upload(file);
      if (u) setBlocks((bs) => splice(bs, { id: rid(), type: "image", url: u }));
      setUploading(false); return;
    }
    const url = getDropUrl(e);
    if (url) setBlocks((bs) => splice(bs, { id: rid(), type: "image", url }));
  }

  // ── Publish ────────────────────────────────────────────────────────────────
  async function publish() {
    if (!uid) return;
    if (!title.trim()) return setErr("Give your article a title.");
    const clean = blocks
      .map((b) =>
        b.type === "image"   ? { type: "image", url: b.url, caption: b.caption?.trim() || undefined } :
        b.type === "divider" ? { type: "divider" } :
        b.type === "video"   ? { type: "video", videoId: b.videoId, videoTitle: b.videoTitle, videoThumb: b.videoThumb } :
        { type: b.type, value: (b.value || "").trim() }
      )
      .filter((b) =>
        b.type === "image"   ? !!(b as { url?: string }).url :
        b.type === "divider" ? true :
        b.type === "video"   ? !!(b as { videoId?: string }).videoId :
        !!((b as { value?: string }).value)
      );
    if (clean.length === 0) return setErr("Add some content before publishing.");
    setBusy(true); setErr(null);
    const { data, error } = await supabase.from("articles")
      .insert({ owner: uid, title: title.trim(), cover_url: cover, blocks: clean })
      .select("id").single();
    if (error) { setBusy(false); return setErr(error.message); }
    clearDraft();
    setPublishedId((data as { id: string }).id);
    setBusy(false);
  }

  const words = countWords(blocks);

  return {
    supabase,
    uid, title, setTitle, cover, setCover, blocks, setBlocks,
    focusedId, setFocusedId, busy, uploading, err, publishedId,
    draftSaved, hasDraft, dragOver, setDragOver, dropIdx, setDropIdx,
    coverRef, imageRef, blockRefs,
    focusBlock, saveDraft, restoreDraft, clearDraft,
    setText, setCaption, changeType, remove, moveUp, moveDown,
    addBlock, insertAfter, openImagePicker, pickVideo,
    keyHandler, pasteHandler,
    pickCover, pickImage, handleCoverDrop, handleBodyDrop,
    publish, words,
  };
}
