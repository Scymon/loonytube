"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import DmList from "@/components/threads/dms/DmList";
import Thread from "@/components/messages/Thread";

type ConvoMeta = { name: string; avatar: string | null };

export default function DmShell({
  conversationId,
  meId,
}: {
  conversationId?: string;
  meId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [meta, setMeta] = useState<ConvoMeta | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    setMeta(null);
    supabase.rpc("my_conversations").then(({ data }) => {
      const c = (data ?? []).find((c: any) => c.conversation_id === conversationId);
      if (c) setMeta({ name: c.other_name || c.other_username || "User", avatar: c.other_avatar });
    });
  }, [conversationId, supabase]);

  const hasConvo = !!conversationId;

  return (
    <div className="flex flex-1 min-h-0 min-w-0">
      {/* ── Col 1: DM list ─────────────────────────────────────── */}
      {/* Desktop: always visible (w-72). Mobile: visible only when no active convo */}
      <div
        className={`flex-col ${hasConvo ? "hidden md:flex md:w-72 md:shrink-0" : "flex w-full"}`}
      >
        <DmList meId={meId} activeId={conversationId} />
      </div>

      {/* ── Col 2: Thread pane ─────────────────────────────────── */}
      {/* Desktop: always visible. Mobile: visible only when convo selected */}
      <div
        className={`flex-col min-w-0 flex-1 min-h-0 overflow-hidden ${hasConvo ? "flex" : "hidden md:flex"}`}
      >
        {conversationId ? (
          <>
            {/* Thread header: back (mobile only) + avatar + name */}
            <div className="flex shrink-0 items-center gap-3 border-b border-edge px-3 py-2.5">
              <button
                onClick={() => router.push("/threads/dms")}
                aria-label="Back to conversations"
                className="-ml-1 p-2 text-mist hover:text-foam md:hidden"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
              </button>
              {meta && <Avatar name={meta.name} src={meta.avatar} size={32} />}
              <p className="font-semibold text-foam">{meta?.name ?? "…"}</p>
            </div>

            {/* Thread body */}
            <Thread
                key={conversationId}
                conversationId={conversationId}
                meId={meId}
                header={null}
                onActivity={() => {}}
              />
          </>
        ) : (
          // Desktop empty state when no convo selected
          <div className="grid h-full place-items-center">
            <div className="text-center">
              <svg className="mx-auto mb-3 text-mist" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p className="text-sm text-mist">Select a conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
