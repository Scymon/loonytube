import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Accepts { identifier, password } where identifier is an email OR a username.
// Username -> email resolution happens server-side with the service role so we
// never expose any email to the client. Errors are intentionally generic.
export async function POST(req: Request) {
  const { identifier, password } = await req.json().catch(() => ({}));
  if (!identifier || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  let email: string = String(identifier).trim();

  if (!email.includes("@")) {
    const uname = email.replace(/^@/, "");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", uname)
      .maybeSingle();
    if (!prof) {
      return NextResponse.json({ error: "Invalid login credentials" }, { status: 400 });
    }
    const { data: u, error: uErr } = await supabaseAdmin.auth.admin.getUserById(prof.id);
    if (uErr || !u?.user?.email) {
      return NextResponse.json({ error: "Invalid login credentials" }, { status: 400 });
    }
    email = u.user.email;
  }

  // Sign in via the SSR server client so auth cookies are set on the response.
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return NextResponse.json({ error: "Invalid login credentials" }, { status: 400 });
  }

  const { data: prof } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", data.user.id)
    .maybeSingle();

  return NextResponse.json({ ok: true, onboarded: !!prof?.onboarded_at });
}
