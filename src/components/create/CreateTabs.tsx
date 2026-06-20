"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import VideoComposer from "@/components/create/VideoComposer";
import PostComposer from "@/components/create/PostComposer";
import ArticleComposer from "@/components/create/ArticleComposer";

export type CreateTab = "video" | "post" | "article";

const TABS: { key: CreateTab; label: string; icon: ReactNode }[] = [
  { key: "video", label: "Video", icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3" />
    </svg>
  ) },
  { key: "post", label: "Post", icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
    </svg>
  ) },
  { key: "article", label: "Article", icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6" /><path d="M9 13h7M9 17h6" />
    </svg>
  ) },
];

export default function CreateTabs({ initialTab = "video" }: { initialTab?: CreateTab }) {
  const supabase = createClient();
  const router = useRouter();
  const [tab, setTab] = useState<CreateTab>(initialTab);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (!data.user) router.push("/login"); else setReady(true); });
  }, [supabase, router]);

  if (!ready) return <p className="py-16 text-center text-mist">…</p>;

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-edge">
        {TABS.map(({ key, label, icon }) => (
          <button key={key} onClick={() => setTab(key)} title={label} aria-label={label}
            className={`-mb-px flex items-center justify-center border-b-2 px-5 pb-3 pt-1 transition ${
              tab === key ? "border-sky text-sky" : "border-transparent text-mist hover:text-foam"
            }`}>
            {icon}
          </button>
        ))}
      </div>

      {tab === "video" && <VideoComposer />}
      {tab === "post" && <PostComposer />}
      {tab === "article" && <ArticleComposer />}
    </div>
  );
}
