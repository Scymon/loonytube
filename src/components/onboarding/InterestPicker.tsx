"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Stepper from "@/components/auth/Stepper";

type Interest = { slug: string; label: string };

export default function InterestPicker({
  options,
  initial,
}: {
  options: Interest[];
  initial: string[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set(initial));
  const [busy, setBusy] = useState(false);

  function toggle(slug: string) {
    setSel((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }

  async function next() {
    setBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    // Replace selections: clear then insert the current set.
    await supabase.from("profile_interests").delete().eq("profile_id", user.id);
    const rows = [...sel].map((slug) => ({ profile_id: user.id, interest_slug: slug }));
    if (rows.length) await supabase.from("profile_interests").insert(rows);
    router.push("/onboarding/follow");
  }

  return (
    <div className="flex min-h-[70vh] flex-col">
      <div className="flex-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-foam">What do you love?</h1>
        <p className="mt-2 text-mist">Choose your interests to personalize your feed.</p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          {options.map((o) => {
            const on = sel.has(o.slug);
            return (
              <button key={o.slug} type="button" data-on={on} onClick={() => toggle(o.slug)} className="lt-pill">
                <span>{o.label}</span>
                <span className={on ? "opacity-100" : "opacity-0"}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M5 12l4 4 10-10" />
                  </svg>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-8">
        <Stepper step={1} total={2} />
        <button onClick={next} disabled={busy || sel.size === 0} className="lt-btn-primary">
          {busy ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
