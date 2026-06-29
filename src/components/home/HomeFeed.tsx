"use client";
import { useState } from "react";
import Link from "next/link";
import VideoRow, { type FeedVideo } from "./VideoRow";
import PostCard, { type CardPost } from "./PostCard";
import ArticleCard, { type CardArticle } from "./ArticleCard";
import ComingSoon from "./ComingSoon";
import RealShelf, { type ShelfVideo } from "./RealShelf";

type Props = {
  forYouVideos: FeedVideo[];
  postCard: CardPost | null;
  articleCard: CardArticle | null;
  realShelves: { title: string; videos: ShelfVideo[] }[];
  signedIn: boolean;
};

type FollowState = "idle" | "loading" | "loaded" | "empty" | "unauth";

export default function HomeFeed({ forYouVideos, postCard, articleCard, realShelves, signedIn }: Props) {
  const [tab, setTab] = useState<"foryou" | "following">("foryou");
  const [followState, setFollowState] = useState<FollowState>("idle");
  const [followingVideos, setFollowingVideos] = useState<FeedVideo[]>([]);

  async function switchToFollowing() {
    if (tab === "following") return;
    setTab("following");
    if (followState !== "idle") return; // already fetched or fetching
    setFollowState("loading");
    try {
      const r = await fetch("/api/feed/following");
      if (r.status === 401) { setFollowState("unauth"); return; }
      const { videos } = await r.json();
      setFollowingVideos(videos ?? []);
      setFollowState(videos?.length ? "loaded" : "empty");
    } catch {
      setFollowState("empty");
    }
  }

  const tabCls = (active: boolean) =>
    [
      "px-5 py-1.5 text-sm font-semibold rounded-full transition-all duration-200",
      active
        ? "bg-teal/15 text-teal border border-teal/40 shadow-[0_0_10px_rgba(45,212,180,0.2)]"
        : "text-mist/60 hover:text-teal hover:bg-teal/5",
    ].join(" ");

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1.5fr,1fr]">
      <div>
        {/* Tab bar — scoped to left column only */}
        <div className="flex gap-2 border-b border-edge pb-1 mb-6">
          <button type="button" onClick={() => setTab("foryou")} className={tabCls(tab === "foryou")}>
            For You
          </button>
          <button type="button" onClick={switchToFollowing} className={tabCls(tab === "following")}>
            Following
          </button>
        </div>
          {tab === "following" ? (
            <div className="space-y-6">
              {followState === "loading" && (
                <div className="py-16 text-center text-mist/60 text-sm animate-pulse">Loading…</div>
              )}
              {followState === "unauth" && (
                <div className="rounded-2xl border border-edge bg-surface py-16 text-center">
                  <p className="text-lg text-foam">Sign in to see your Following feed</p>
                  <p className="mt-2 text-sm text-mist">
                    <Link href="/auth/login" className="text-teal hover:underline">Log in</Link>{" "}or{" "}
                    <Link href="/auth/signup" className="text-teal hover:underline">create an account</Link>.
                  </p>
                </div>
              )}
              {followState === "empty" && (
                <div className="rounded-2xl border border-edge bg-surface py-16 text-center">
                  <p className="text-lg text-foam">Nothing here yet</p>
                  <p className="mt-2 text-sm text-mist">Follow some creators and their latest videos will appear here.</p>
                </div>
              )}
              {followState === "loaded" && followingVideos.map((v) => (
                <VideoRow key={v.id} video={v} context="home" signedIn={signedIn} />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {forYouVideos[0] && <VideoRow video={forYouVideos[0]} context="home" signedIn={signedIn} />}
              {postCard ? <PostCard post={postCard} /> : <ComingSoon label="No posts yet — start the conversation" />}
              {articleCard && <ArticleCard article={articleCard} />}
              {forYouVideos.slice(1).map((v) => (
                <VideoRow key={v.id} video={v} context="home" signedIn={signedIn} />
              ))}
            </div>
          )}
      </div>

      <aside className="space-y-8">
        <section>
          <h2 className="mb-3 text-lg font-bold text-foam">Live Now</h2>
          <ComingSoon label="No live streams right now" />
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold text-foam">Your Schedule Today</h2>
          <ComingSoon label="Nothing scheduled yet" />
        </section>
        {realShelves.length > 0 ? (
          realShelves.map((s) => <RealShelf key={s.title} title={s.title} videos={s.videos} />)
        ) : (
          <section>
            <h2 className="mb-3 text-lg font-bold text-foam">Browse by category</h2>
            <ComingSoon label="No categorized videos yet" />
          </section>
        )}
      </aside>
    </div>
  );
}
