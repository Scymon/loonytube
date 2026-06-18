import SplitShell from "@/components/auth/SplitShell";
import AuthHero from "@/components/auth/AuthHero";
import SignupFlow from "@/components/auth/SignupFlow";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign Up · LoonyTube" };

export default async function SignupPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings").select("invite_only, signups_enabled").eq("id", 1).maybeSingle();

  const signupsOpen = data?.signups_enabled ?? true;

  return (
    <SplitShell hero={<AuthHero tone="teal" image="/onboarding/signup-hero.jpg" />}>
      {signupsOpen ? (
        <SignupFlow inviteOnly={data?.invite_only ?? false} />
      ) : (
        <div className="mx-auto max-w-sm text-center">
          <h1 className="text-2xl font-bold text-foam">Sign-ups are paused</h1>
          <p className="mt-3 text-sm text-mist">
            LoonyTube isn&apos;t accepting new accounts right now. Check back soon.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-teal hover:underline">
            Already have an account? Log in
          </Link>
        </div>
      )}
    </SplitShell>
  );
}
