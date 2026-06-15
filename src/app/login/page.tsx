"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setMsg(null);
    const fn =
      mode === "signin"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }
    if (mode === "signup") {
      setMsg("Account created. If email confirmation is on, check your inbox — otherwise sign in.");
      setMode("signin");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="mb-6 text-2xl font-bold">
        {mode === "signin" ? "Sign in" : "Create account"}
      </h1>
      <div className="space-y-3">
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-edge bg-panel px-3 py-2 outline-none focus:border-loon"
        />
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="w-full rounded border border-edge bg-panel px-3 py-2 outline-none focus:border-loon"
        />
        <button
          onClick={submit}
          disabled={loading}
          className="w-full rounded bg-loon py-2 font-semibold text-ink hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "..." : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
        {msg && <p className="text-sm text-loonred">{msg}</p>}
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full text-center text-sm text-gray-400 hover:text-white"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
