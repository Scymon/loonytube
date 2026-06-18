import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Single landing point for OAuth logins, email-confirmation links, and password
// recovery links. Exchanges the code for a session, then routes by onboarding state.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/login?error=auth", url.origin));
    }
  }

  // Recovery links should always go to the set-new-password screen.
  if (next === "/reset-password") {
    return NextResponse.redirect(new URL("/reset-password", url.origin));
  }

  // Otherwise send un-onboarded users into setup, everyone else to their target.
  let dest = next;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    // If the signup carried a validated invite (email-confirmation path), redeem it now.
    const invite = url.searchParams.get("invite");
    if (invite) await supabase.rpc("redeem_invite", { p_code: invite });

    const { data: prof } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", user.id)
      .maybeSingle();
    if (!prof?.onboarded_at) {
      const { data: access } = await supabase.rpc("has_onboarding_access");
      dest = access === true ? "/onboarding/interests" : "/onboarding/invite";
    }
  }

  return NextResponse.redirect(new URL(dest, url.origin));
}
