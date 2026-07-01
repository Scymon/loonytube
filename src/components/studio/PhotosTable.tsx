"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ago } from "@/lib/format";

type LibraryImage = {
  url: string;
  title: string | null;
  source: "photo" | "post";
  created_at: string;
  id: string; // photo id or post id
};

export default function PhotosTable() {
  const supabase = createClient();
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [{ data: photos }, { data: posts }] = await Promise.all([
        supabase
          .from("photos")
          .select("id, title, url, created_at")
          .eq("owner", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("posts")
          .select("id, images, created_at")
          .eq("owner", user.id)
          .not("images", "is", null)
          .order("created_at", { ascending: false }),
      ]);

      const lib: LibraryImage[] = [];

      for (const p of photos ?? []) {
        lib.push({ url: p.url, title: p.title, source: "photo", created_at: p.created_at, id: p.id });
      }

      for (const post of posts ?? []) {
        for (const url of (post.images as string[] | null) ?? []) {
          if (url) lib.push({ url, title: null, source: "post", created_at: post.created_at, id: post.id });
        }
      }

      // sort newest first
      lib.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setImages(lib);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 1500);
  }

  if (loading) return <p className="py-10 text-center text-sm text-mist">Loading…</p>;
  if (!images.length) return (
    <p className="py-10 text-center text-sm text-mist">No images yet. Upload images or add them to a post.</p>
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {images.map((img, i) => (
        <div key={`${img.id}-${i}`} className="group relative overflow-hidden rounded-xl border border-edge bg-surface aspect-square">
          <img src={img.url} alt={img.title ?? ""} className="h-full w-full object-cover" />
          {/* Overlay on hover */}
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent
            opacity-0 group-hover:opacity-100 transition-opacity p-2 gap-1">
            {img.title && (
              <p className="text-xs font-semibold text-white truncate leading-tight">{img.title}</p>
            )}
            <p className="text-[10px] text-white/60">{ago(img.created_at)} · {img.source}</p>
            <div className="flex gap-1.5 mt-1">
              <button
                onClick={() => copyUrl(img.url)}
                className="flex-1 rounded-md bg-white/20 hover:bg-white/30 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm transition-colors text-center"
              >
                {copied === img.url ? "Copied!" : "Copy URL"}
              </button>
              <a href={img.url} target="_blank" rel="noopener noreferrer"
                className="rounded-md bg-white/20 hover:bg-white/30 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm transition-colors">
                ↗
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
