"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { nfmt } from "@/lib/format";

export default function PostActions({
  postId,
  signedIn,
  initialLikes,
  initialLiked,
  initialBookmarks,
  initialBookmarked,
  replies,
}: {
  postId: string;
  signedIn: boolean;
  initialLikes: number;
  initialLiked: boolean;
  initialBookmarks: number;
  initialBookmarked: boolean;
  replies: number;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);
  const [bm, setBm] = useState(initialBookmarks);
  const [bmOn, setBmOn] = useState(initialBookmarked);

  async function uid() {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  }
  function gate() {
    if (!signedIn) { router.push("/login"); return false; }
    return true;
  }

  async function like() {
    if (!gate()) return;
    const id = await uid();
    if (!id) return;
    if (liked) { setLiked(false); setLikes((c) => c - 1); await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", id); }
    else { setLiked(true); setLikes((c) => c + 1); await supabase.from("post_likes").insert({ post_id: postId, user_id: id }); }
  }
  async function bookmark() {
    if (!gate()) return;
    const id = await uid();
    if (!id) return;
    if (bmOn) { setBmOn(false); setBm((c) => c - 1); await supabase.from("bookmarks").delete().eq("post_id", postId).eq("user_id", id); }
    else { setBmOn(true); setBm((c) => c + 1); await supabase.from("bookmarks").insert({ post_id: postId, user_id: id }); }
  }

  const Btn = ({ on, onClick, color, title, children }: any) => (
    <button onClick={onClick} title={title} className={`transition hover:text-foam ${on ? color : "text-mist"}`}>
      {children}
    </button>
  );

  return (
    <>
      <div className="flex items-center gap-1.5 text-sm text-mist">
        <b className="text-foam">{nfmt(likes)}</b> Likes
        <span className="mx-2">·</span>
        <b className="text-foam">{nfmt(replies)}</b> Comments
        <span className="mx-2">·</span>
        <b className="text-foam">{nfmt(bm)}</b> Bookmarks
      </div>
      <div className="mt-3 flex items-center justify-between border-y border-edge py-2.5">
        <Btn on={liked} onClick={like} color="text-link" title="Like">
          <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><path d="M12 21s-7-4.6-9.5-9A5 5 0 0112 5a5 5 0 019.5 7c-2.5 4.4-9.5 9-9.5 9z" /></svg>
        </Btn>
        <Btn title="Repost — coming soon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 2l4 4-4 4M3 11V9a4 4 0 014-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" /></svg>
        </Btn>
        <Btn onClick={() => document.getElementById("comment-box")?.scrollIntoView({ behavior: "smooth" })} title="Comment">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12a8 8 0 01-11.5 7.2L3 21l1.8-6.5A8 8 0 1121 12z" /></svg>
        </Btn>
        <Btn on={bmOn} onClick={bookmark} color="text-teal" title="Bookmark">
          <svg width="20" height="20" viewBox="0 0 24 24" fill={bmOn ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><path d="M6 3h12v18l-6-4-6 4z" /></svg>
        </Btn>
        <Btn title="Share — coming soon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V4M8 8l4-4 4 4M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" /></svg>
        </Btn>
      </div>
    </>
  );
}
