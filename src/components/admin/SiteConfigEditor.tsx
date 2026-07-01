"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export type SiteConfig = {
  site_name: string;
  site_tagline: string;
  logo_url: string | null;
  favicon_url: string | null;
  featured_video_id: string | null;
};

type VideoHit = { id: string; title: string; thumbnail: string | null };

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-edge py-5 last:border-0">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foam">{label}</p>
          {hint && <p className="mt-0.5 text-sm text-mist">{hint}</p>}
        </div>
        <div className="w-64 shrink-0">{children}</div>
      </div>
    </div>
  );
}

export default function SiteConfigEditor({ initial }: { initial: SiteConfig }) {
  const supabase = createClient();
  const [cfg, setCfg] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Featured video search
  const [videoQ, setVideoQ]     = useState("");
  const [videoHits, setVideoHits] = useState<VideoHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [featTitle, setFeatTitle] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save(field: string, value: string | null) {
    setSaving(field); setErr(null);
    const { error } = await supabase.from("site_config").update({ [field]: value }).eq("id", 1);
    setSaving(null);
    if (error) { setErr(error.message); return; }
    setSaved(field);
    setTimeout(() => setSaved(cur => cur === field ? null : cur), 1800);
  }

  function handleBlur(field: keyof SiteConfig, value: string) {
    const trimmed = value.trim() || null;
    if (trimmed !== initial[field]) save(field, trimmed);
  }

  function searchVideos(q: string) {
    setVideoQ(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setVideoHits([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("videos")
        .select("id, title, thumbnail")
        .eq("status", "ready")
        .ilike("title", `%${q}%`)
        .limit(6);
      setVideoHits((data ?? []) as VideoHit[]);
      setSearching(false);
    }, 300);
  }

  async function pickVideo(v: VideoHit | null) {
    const id = v?.id ?? null;
    setCfg(c => ({ ...c, featured_video_id: id }));
    setFeatTitle(v?.title ?? null);
    setVideoQ(""); setVideoHits([]);
    await save("featured_video_id", id);
  }

  const tick = (field: string) => (
    <span className={`text-xs font-semibold text-teal transition-opacity ${saved === field ? "opacity-100" : "opacity-0"}`}>
      Saved ✓
    </span>
  );

  return (
    <div className="rounded-xl border border-edge bg-surface">
      {/* Site name */}
      <Field label="Site name" hint="Shown in the browser tab, nav, and meta tags.">
        <div className="flex items-center gap-2">
          {tick("site_name")}
          <input className="lt-input flex-1" defaultValue={cfg.site_name}
            onBlur={e => handleBlur("site_name", e.target.value)}
            disabled={saving === "site_name"} />
        </div>
      </Field>

      {/* Tagline */}
      <Field label="Tagline" hint="Short description used in meta description.">
        <div className="flex items-center gap-2">
          {tick("site_tagline")}
          <input className="lt-input flex-1" defaultValue={cfg.site_tagline}
            onBlur={e => handleBlur("site_tagline", e.target.value)}
            disabled={saving === "site_tagline"} />
        </div>
      </Field>

      {/* Logo URL */}
      <Field label="Logo URL" hint="Direct URL to a PNG/SVG logo. Leave blank to use the default.">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {tick("logo_url")}
            <input className="lt-input flex-1" placeholder="https://..." defaultValue={cfg.logo_url ?? ""}
              onBlur={e => handleBlur("logo_url", e.target.value)}
              disabled={saving === "logo_url"} />
          </div>
          {cfg.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cfg.logo_url} alt="Logo preview" className="h-10 rounded object-contain bg-panel border border-edge p-1" />
          )}
        </div>
      </Field>

      {/* Favicon URL */}
      <Field label="Favicon URL" hint="Square image (32×32 or 64×64 PNG/ICO) for browser tab icon.">
        <div className="flex items-center gap-2">
          {tick("favicon_url")}
          <input className="lt-input flex-1" placeholder="https://..." defaultValue={cfg.favicon_url ?? ""}
            onBlur={e => handleBlur("favicon_url", e.target.value)}
            disabled={saving === "favicon_url"} />
        </div>
      </Field>

      {/* Featured video */}
      <Field label="Featured video" hint="Pinned as the first video in the home page hero. Overrides algorithmic selection.">
        <div className="space-y-2">
          {/* Current */}
          {cfg.featured_video_id ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-teal/30 bg-teal/5 px-3 py-2">
              <p className="truncate text-sm text-foam">{featTitle ?? cfg.featured_video_id}</p>
              <button onClick={() => pickVideo(null)}
                className="shrink-0 text-xs text-mist hover:text-loonred transition-colors">
                Clear
              </button>
            </div>
          ) : (
            <p className="text-sm text-mist italic">No video pinned — home uses algorithmic selection.</p>
          )}
          {/* Search */}
          <input className="lt-input w-full" placeholder="Search videos…" value={videoQ}
            onChange={e => searchVideos(e.target.value)} />
          {searching && <p className="text-xs text-mist">Searching…</p>}
          {videoHits.length > 0 && (
            <ul className="max-h-48 overflow-y-auto rounded-lg border border-edge bg-panel divide-y divide-edge">
              {videoHits.map(v => (
                <li key={v.id}>
                  <button onClick={() => pickVideo(v)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-edge/40 transition-colors">
                    {v.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.thumbnail} alt="" className="h-8 w-14 rounded object-cover shrink-0" />
                    )}
                    <span className="truncate text-foam">{v.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {tick("featured_video_id")}
        </div>
      </Field>

      {err && <p className="px-5 pb-4 text-sm text-loonred">{err}</p>}
    </div>
  );
}
