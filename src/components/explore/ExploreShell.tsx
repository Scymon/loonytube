"use client";
import { useState } from "react";
import DashHero from "@/components/dashboard/DashHero";
import type { FeaturedVideo } from "@/components/dashboard/DashHero";
import ExploreTabBar from "@/components/explore/ExploreTabBar";
import ExploreVideos from "@/components/explore/ExploreVideos";
import ExplorePosts from "@/components/explore/ExplorePosts";
import ExploreArticles from "@/components/explore/ExploreArticles";

export type ExploreVideo = {
  id: string; title: string; thumbnail: string | null; duration: number | null;
  views: number; created_at: string; category: string | null;
  channel: string; avatar: string | null; channelHandle: string | null;
};
export type ExplorePost = {
  id: string; body: string; images: string[] | null; created_at: string; agoLabel: string;
  author: string; handle: string; avatar: string | null;
  likes: number; replies: number; reposts: number;
};
export type ExploreArticle = {
  id: string; title: string; cover_url: string | null;
  author: string; handle: string; avatar: string | null;
  agoLabel: string; readMinutes: number;
};
export type ExploreTab = "videos" | "posts" | "articles";

type Props = {
  featuredVideo: FeaturedVideo | null;
  heroVideos?: FeaturedVideo[];
  videos: ExploreVideo[];
  posts: ExplorePost[];
  articles: ExploreArticle[];
  role: string | null;
};

export default function ExploreShell({ featuredVideo, heroVideos, videos, posts, articles, role }: Props) {
  const [activeTab, setActiveTab] = useState<ExploreTab>("videos");

  return (
    <div className="-mt-6">
      {/* Tab bar — sticky under nav.
          pointer-events-none on the full-width wrapper so the transparent area
          never blocks clicks on the hero controls beneath it.
          pointer-events-auto is restored on the pill inside ExploreTabBar. */}
      <div className="sticky top-[57px] z-20 pointer-events-none">
        <ExploreTabBar activeTab={activeTab} onTabChange={setActiveTab} role={role} />
      </div>

      {/* Videos: hero slides -60 px under the tab bar so it rests behind it */}
      {activeTab === "videos" && (
        <>
          <div className="-mt-[60px]">
            <DashHero featuredVideo={featuredVideo} videos={heroVideos} />
          </div>
          <div className="pt-4"><ExploreVideos videos={videos} /></div>
        </>
      )}

      {activeTab === "posts" && (
        <div className="pt-6"><ExplorePosts posts={posts} /></div>
      )}

      {activeTab === "articles" && (
        <div className="pt-6"><ExploreArticles articles={articles} /></div>
      )}
    </div>
  );
}
