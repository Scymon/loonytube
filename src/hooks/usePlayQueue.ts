"use client";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "loonytube:play-queue";

export type QueueItem = {
  id: string;
  title: string;
  thumbnail: string | null;
  channel: string;
  duration: number | null;
};

function load(): QueueItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); }
  catch { return []; }
}
function save(items: QueueItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function usePlayQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(() => { setQueue(load()); }, []);

  const addToQueue = useCallback((item: QueueItem) => {
    setQueue(prev => {
      if (prev.some(v => v.id === item.id)) return prev;
      const next = [...prev, item];
      save(next);
      return next;
    });
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => { const next = prev.filter(v => v.id !== id); save(next); return next; });
  }, []);

  const clearQueue = useCallback(() => { save([]); setQueue([]); }, []);

  // Remove and return the first item (called when current video ends).
  const shiftQueue = useCallback((): QueueItem | null => {
    let shifted: QueueItem | null = null;
    setQueue(prev => {
      if (!prev.length) return prev;
      [shifted] = prev;
      const next = prev.slice(1);
      save(next);
      return next;
    });
    return shifted;
  }, []);

  const moveUp = useCallback((id: string) => {
    setQueue(prev => {
      const i = prev.findIndex(v => v.id === id);
      if (i <= 0) return prev;
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      save(next); return next;
    });
  }, []);

  const moveDown = useCallback((id: string) => {
    setQueue(prev => {
      const i = prev.findIndex(v => v.id === id);
      if (i < 0 || i >= prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      save(next); return next;
    });
  }, []);

  // Insert at front of queue (Play Next)
  const addToQueueNext = useCallback((item: QueueItem) => {
    setQueue(prev => {
      const filtered = prev.filter(v => v.id !== item.id);
      const next = [item, ...filtered];
      save(next);
      return next;
    });
  }, []);

  return { queue, addToQueue, addToQueueNext, removeFromQueue, clearQueue, shiftQueue, moveUp, moveDown };
}
