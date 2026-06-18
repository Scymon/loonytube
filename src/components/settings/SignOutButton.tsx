"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const supabase = createClient();
  const router = useRouter();
  async function out() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <button onClick={out} className="rounded-full border border-edge px-5 py-2.5 text-sm font-semibold text-foam transition hover:bg-edge/50">
      Sign out
    </button>
  );
}
