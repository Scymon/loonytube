"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Nav() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-edge bg-panel">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="text-loon">◐</span>
          <span>Loony<span className="text-loon">Tube</span></span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {email ? (
            <>
              <Link
                href="/upload"
                className="rounded bg-loon px-3 py-1.5 font-semibold text-ink hover:opacity-90"
              >
                Upload
              </Link>
              <span className="hidden text-gray-400 sm:inline">{email}</span>
              <button onClick={signOut} className="text-gray-400 hover:text-white">
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="rounded border border-edge px-3 py-1.5 hover:border-loon">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
