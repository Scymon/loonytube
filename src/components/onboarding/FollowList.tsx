"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Stepper from "@/components/auth/Stepper";

type Creator = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

function Avatar({ c }: { c: Creator }) {
  if (c.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={c.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />;
  }
  const ch = (c.full_name || c.username || "?").charAt(0).toUpperCase();
  return (
    <div
      className="grid h-11 w-11 place-items-center rounded-full font-bold text-ink"
      style={{ backgroundImage: "linear-gradient(135deg, #3ad6bd, #62b8e6)" }}
    >
      {ch}
    </div>
  );
}

export default function FollowList({
  meId,
  creators,
  initial,
}: {
  meId: string;
  creators: Creator[];
  initial: string[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [following, setFollowing] = useState<Set<string>>(new Set(initial));
  const [busy, setBusy] = useState(false);

  async function toggle(id: string) {
    const on = following.has(id);
    setFollowing((prev) => {
      const next = new Set(prev);
      on ? next.delete(id) : next.add(id);
      return next;
    });
    if (on) {
      await supabase.from("follows").delete().eq("follower", meId).eq("followee", id);
    } else {
      await supabase.from("follows").insert({ follower: meId, followee: id });
    }
  }

  async function done() {
    setBusy(true);
    await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", meId);
    router.push("/onboarding/done");
  }

  return (
    <div className="flex min-h-[70vh] flex-col">
      <div className="flex-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-foam">Who to follow first?</h1>
        <p className="mt-2 text-mist">Follow a few creators to see what they&apos;re posting.</p>

        <div className="mt-8 space-y-3">
          {creators.length === 0 && (
            <p className="rounded-[10px] border border-edge bg-surface p-5 text-center text-sm text-mist">
              More creators are joining LoonyTube every day. You can skip this for now and follow people as you explore.
            </p>
          )}
          {creators.map((c) => {
            const on = following.has(c.id);
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-[12px] border border-edge bg-surface px-4 py-3">
                <Avatar c={c} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foam">{c.full_name || c.username || "Creator"}</p>
                  <p className="truncate text-[13px] text-mist">@{c.username ?? "user"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(c.id)}
                  className={
                    on
                      ? "rounded-full px-5 py-1.5 text-[13px] font-bold text-ink"
                      : "rounded-full border border-follow px-5 py-1.5 text-[13px] font-bold text-follow hover:bg-follow/10"
                  }
                  style={on ? { backgroundImage: "linear-gradient(180deg, #3ad6bd, #2dbfa6)" } : undefined}
                >
                  {on ? "Following" : "Follow"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-8">
        <Stepper step={2} total={2} />
        <button onClick={done} disabled={busy} className="lt-btn-primary">
          {busy ? "Finishing…" : "Done"}
        </button>
      </div>
    </div>
  );
}
