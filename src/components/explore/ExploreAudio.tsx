"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { dur, nfmt, ago } from "@/lib/format";
import type { ExploreAudioTrack } from "@/components/explore/ExploreShell";

function MusicNote() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      className="text-mist/40">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
  );
}

export default function ExploreAudio({ tracks }: { tracks: ExploreAudioTrack[] }) {
  if (tracks.length === 0) {
    return (
      <div className="rounded-2xl border border-edge bg-surface py-16 text-center">
        <p className="text-foam">No audio tracks yet</p>
        <p className="mt-1 text-sm text-mist">Upload your first track in the Studio.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tracks.map(t => (
        <Link key={t.id} href={`/listen/${t.id}`}
          className="group flex gap-3 rounded-2xl border border-edge bg-surface p-3
            transition-colors hover:border-teal/40 hover:bg-teal/5">
          {/* Cover art */}
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-edge">
            {t.cover_url
              ? <img src={t.cover_url} alt={t.title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
              : <div className="grid h-full w-full place-items-center"><MusicNote /></div>}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foam group-hover:text-teal transition-colors">
              {t.title}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Avatar name={t.channel} src={t.avatar} size={16} />
              <span className="truncate text-xs text-mist">{t.channel}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-mist/60">
              {t.category && (
                <span className="rounded-md bg-teal/10 px-1.5 py-0.5 text-[10px] font-semibold text-teal">
                  {t.category}
                </span>
              )}
              {t.duration && <span>{dur(t.duration)}</span>}
              <span>{nfmt(t.views)} plays</span>
              <span>·</span>
              <span>{ago(t.created_at)}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
