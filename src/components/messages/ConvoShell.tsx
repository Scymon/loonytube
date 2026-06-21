"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import Thread from "@/components/messages/Thread";

type ConvoMeta = { name: string; avatar: string | null };

export default function ConvoShell({ conversationId, meId }: { conversationId: string; meId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [meta, setMeta] = useState<ConvoMeta | null>(null);

  useEffect(() => {
    supabase.rpc("my_conversations").then(({ data }) => {
      const c = (data ?? []).find((c: any) => c.conversation_id === conversationId);
      if (c) setMeta({ name: c.other_name || c.other_username || "User", avatar: c.other_avatar });
    });
  }, [conversationId, supabase]);

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-edge px-3 py-2">
        <button onClick={() => router.back()} aria-label="Back"
          className="-ml-1 p-2 text-mist hover:text-foam">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        {meta && <Avatar name={meta.name} src={meta.avatar} size={32} />}
        <p className="font-semibold text-foam">{meta?.name ?? "…"}</p>
      </div>
      <div className="min-h-0 flex-1">
        <Thread conversationId={conversationId} meId={meId} header={null} onActivity={() => {}} />
      </div>
    </div>
  );
}
