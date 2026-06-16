"use client";

import { useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const QUICK = [
  { label: "Watch", href: "/", icon: "M8 5v14l11-7z" },
  { label: "Post", href: "/upload", icon: "M12 19V5M5 12l7-7 7 7" },
  { label: "Go Live", href: "/", icon: "M15 10l5-3v10l-5-3M4 7h11v10H4z" },
];

export default function AllSet() {
  const supabase = createClient();

  // Idempotent safety net: if a user lands here directly, mark onboarding done.
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ onboarded_at: new Date().toISOString() })
          .eq("id", user.id)
          .is("onboarded_at", null);
      }
    })();
  }, [supabase]);

  return (
    <div className="text-center">
      <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full border border-teal/50"
           style={{ boxShadow: "0 0 28px -4px rgba(45,212,180,0.55)" }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2dd4b4" strokeWidth="1.8">
          <path d="M4 13l4 4L20 5" /><path d="M9 16l3 3" opacity="0.5" />
        </svg>
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight text-foam">You are all set!</h1>
      <p className="mt-2 text-mist">Welcome to the future of video entertainment.</p>

      <p className="mb-3 mt-9 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-mist">
        Quick Start
      </p>
      <div className="grid grid-cols-3 gap-3">
        {QUICK.map((q) => (
          <Link
            key={q.label}
            href={q.href}
            className="group flex flex-col items-center gap-2 rounded-[12px] border border-edge bg-surface py-5 transition hover:border-teal/60"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full border border-teal/40 text-teal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d={q.icon} />
              </svg>
            </span>
            <span className="text-[13px] font-semibold text-foam">{q.label}</span>
          </Link>
        ))}
      </div>

      <Link href="/" className="lt-btn-primary mt-7 block">
        Start Exploring
      </Link>
      <Link href="/" className="mt-4 inline-block text-[13px] text-mist underline underline-offset-4 hover:text-foam">
        Do this later
      </Link>

      <p className="mt-10 text-[11px] text-mist/70">
        Redefining Video Entertainment for the Next Generation. © 2026 LoonyTube.
      </p>
    </div>
  );
}
