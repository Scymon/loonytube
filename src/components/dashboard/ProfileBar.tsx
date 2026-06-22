import Avatar from "@/components/Avatar";
import Link from "next/link";
import { nfmt } from "@/lib/format";

type Props = {
  profile: { name: string; handle: string; avatar: string | null };
  followingCount: number;
  savedCount: number;
  playlistCount: number;
};

export default function ProfileBar({ profile, followingCount, savedCount, playlistCount }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-edge px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3">
        <Avatar name={profile.name} src={profile.avatar} size={40} ring />
        <div>
          <p className="font-bold text-foam leading-tight">{profile.name}</p>
          {profile.handle && (
            <p className="text-xs text-mist">@{profile.handle}</p>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-1 text-xs text-mist ml-3">
          <span><strong className="text-foam">{nfmt(followingCount)}</strong> Following</span>
          <span className="mx-1 opacity-40">·</span>
          <span><strong className="text-foam">{nfmt(savedCount)}</strong> Saved</span>
          <span className="mx-1 opacity-40">·</span>
          <span><strong className="text-foam">{nfmt(playlistCount)}</strong> Playlists</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Bell */}
        <button className="grid h-9 w-9 place-items-center rounded-full border border-edge text-mist hover:border-hair hover:text-foam transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
        {/* Edit */}
        <Link href="/studio/profile"
          className="rounded-[10px] border border-edge px-4 py-1.5 text-sm font-semibold text-foam hover:bg-edge/40 transition">
          Edit
        </Link>
      </div>
    </div>
  );
}
