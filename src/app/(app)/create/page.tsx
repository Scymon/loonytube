"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import VideoComposer from "@/components/create/VideoComposer";
import PostComposer from "@/components/create/PostComposer";

type Tab = "video" | "post";

export default function CreatePage() {
  const supabase = createClient();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("video");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
      else setReady(true);
    });
  }, [supabase, router]);

  if (!ready) return <p className="py-16 text-center text-mist">…</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex gap-8 border-b border-edge">
        {(["video", "post"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 pb-3 text-sm font-semibold capitalize transition ${
              tab === t ? "border-sky text-foam" : "border-transparent text-mist hover:text-foam"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "video" && <VideoComposer />}
      {tab === "post" && <PostComposer />}
    </div>
  );
}
