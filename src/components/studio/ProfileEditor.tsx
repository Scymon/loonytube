"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";

export type Profile = {
  id: string; username: string | null; full_name: string | null; bio: string | null;
  avatar_url: string | null; banner_url: string | null; website: string | null; location: string | null;
  social_x: string | null; social_instagram: string | null; social_youtube: string | null;
};

const BANNER_FALLBACK = "linear-gradient(120deg,#0a1a2c 0%,#0d2b3e 40%,#103244 70%,#0a1622 100%)";

function CameraIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 8h3l2-2h8l2 2h3v12H3z" /><circle cx="12" cy="13" r="3.5" /></svg>;
}
function ImgIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 15l5-4 4 3 3-2 6 5" /><path d="M19 3v4M17 5h4" /></svg>;
}
function SocialGlyph({ k }: { k: "x" | "instagram" | "youtube" }) {
  if (k === "x") return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 3h3l-7 8 8 10h-6l-5-6-5 6H1l8-9L1 3h6l4 5 7-5z" /></svg>;
  if (k === "instagram") return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>;
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="2.5" y="5.5" width="19" height="13" rx="3.5" /><path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" /></svg>;
}

export default function ProfileEditor({ initial }: { initial: Profile }) {
  const supabase = createClient();
  const [p, setP] = useState(initial);
  const [base, setBase] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<null | "avatar" | "banner">(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(p) !== JSON.stringify(base);
  const set = (k: keyof Profile, v: string) => setP((prev) => ({ ...prev, [k]: v }));

  async function upload(file: File, kind: "avatar" | "banner") {
    setUploading(kind); setMsg(null);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${p.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("profiles").upload(path, file, { upsert: true, cacheControl: "3600" });
    if (error) { setMsg({ ok: false, text: `Upload failed: ${error.message}` }); setUploading(null); return; }
    const { data } = supabase.storage.from("profiles").getPublicUrl(path);
    setP((prev) => ({ ...prev, [kind === "avatar" ? "avatar_url" : "banner_url"]: data.publicUrl }));
    setUploading(null);
  }

  async function save() {
    setBusy(true); setMsg(null);
    const patch = {
      full_name: p.full_name?.trim() || null,
      username: p.username?.trim() || null,
      bio: p.bio?.trim() || null,
      avatar_url: p.avatar_url || null,
      banner_url: p.banner_url || null,
      website: p.website?.trim() || null,
      location: p.location?.trim() || null,
      social_x: p.social_x?.trim() || null,
      social_instagram: p.social_instagram?.trim() || null,
      social_youtube: p.social_youtube?.trim() || null,
    };
    const { error } = await supabase.from("profiles").update(patch).eq("id", p.id);
    setBusy(false);
    if (error) { setMsg({ ok: false, text: error.code === "23505" ? "That handle is already taken." : error.message }); return; }
    setBase(p); setMsg({ ok: true, text: "Profile saved." });
  }

  const name = p.full_name || p.username || "Your channel";

  return (
    <div className="-mt-6">
      <input ref={avatarInput} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "avatar")} />
      <input ref={bannerInput} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "banner")} />

      {/* cover banner — breaks out of the studio content padding */}
      <div className="relative -mx-5 h-44 overflow-hidden sm:h-52 lg:-mx-8" style={{ background: BANNER_FALLBACK }}>
        {p.banner_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.banner_url} alt="" className="h-full w-full object-cover" />}
        <button onClick={() => bannerInput.current?.click()} disabled={uploading === "banner"}
          className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-foam backdrop-blur hover:bg-black/70 disabled:opacity-60">
          <CameraIcon /> {uploading === "banner" ? "Uploading…" : "Change banner"}
        </button>
      </div>

      {/* avatar overlapping the banner */}
      <div className="-mt-12 mb-6 flex items-end">
        <div className="relative">
          <div className="rounded-full ring-4 ring-teal" style={{ boxShadow: "0 0 0 4px #0d0d0f" }}>
            <Avatar name={name} src={p.avatar_url} size={96} />
          </div>
          <button onClick={() => avatarInput.current?.click()} disabled={uploading === "avatar"} aria-label="Change avatar"
            className="absolute bottom-1 right-1 grid h-8 w-8 place-items-center rounded-full bg-teal text-ink shadow hover:brightness-110 disabled:opacity-60">
            <CameraIcon />
          </button>
        </div>
      </div>

      {/* fields */}
      <div className="grid gap-x-10 gap-y-5 pb-28 lg:grid-cols-2">
        {/* left column */}
        <div className="space-y-5">
          <div>
            <label className="lt-label">Display name</label>
            <input className="lt-input" value={p.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} placeholder="Your channel name" />
          </div>
          <div>
            <label className="lt-label">Handle</label>
            <div className="flex items-center">
              <span className="rounded-l-[10px] border border-r-0 border-edge bg-surface px-3 py-2.5 text-sm text-mist">@</span>
              <input className="lt-input rounded-l-none" value={p.username ?? ""} onChange={(e) => set("username", e.target.value.replace(/\s/g, ""))} placeholder="handle" />
            </div>
          </div>
          <div>
            <label className="lt-label">Bio</label>
            <textarea className="lt-input min-h-[110px]" value={p.bio ?? ""} onChange={(e) => set("bio", e.target.value)} placeholder="Tell viewers about your channel…" />
          </div>
          <div>
            <label className="lt-label">Website URL</label>
            <input className="lt-input" value={p.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="https://yourwebsite.com" />
          </div>
          <div>
            <label className="lt-label">Location</label>
            <input className="lt-input" value={p.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="City, Country" />
          </div>
        </div>

        {/* right column */}
        <div className="space-y-6">
          <div>
            <label className="lt-label">Profile banner</label>
            <button onClick={() => bannerInput.current?.click()} disabled={uploading === "banner"}
              className="flex h-40 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-hair bg-surface/40 text-mist transition hover:border-teal hover:text-foam disabled:opacity-60">
              {p.banner_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.banner_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <><ImgIcon /><span className="text-sm font-semibold">{uploading === "banner" ? "Uploading…" : "Change Banner"}</span></>
              )}
            </button>
          </div>

          <div>
            <label className="lt-label">Add social links</label>
            <div className="space-y-3">
              {([
                ["social_x", "x"], ["social_instagram", "instagram"], ["social_youtube", "youtube"],
              ] as const).map(([field, k]) => (
                <div key={field} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-edge bg-surface text-foam">
                    <SocialGlyph k={k} />
                  </span>
                  <input className="lt-input" value={p[field] ?? ""} onChange={(e) => set(field, e.target.value)} placeholder="@handle" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-[#0d0d0f]/95 backdrop-blur sm:left-60">
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 lg:px-8">
          <p className="text-sm text-mist">
            {msg ? <span className={msg.ok ? "text-teal" : "text-loonred"}>{msg.text}</span> : dirty ? "Unsaved changes" : "All changes saved"}
          </p>
          <div className="flex items-center gap-3">
            <button onClick={() => { setP(base); setMsg(null); }} disabled={!dirty || busy}
              className="rounded-full border border-edge px-5 py-2.5 text-sm font-bold text-foam transition hover:bg-edge/50 disabled:opacity-40">
              Discard Changes
            </button>
            <button onClick={save} disabled={busy || !dirty}
              className="rounded-full px-6 py-2.5 text-sm font-bold text-ink transition hover:brightness-110 disabled:opacity-50"
              style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>
              {busy ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
