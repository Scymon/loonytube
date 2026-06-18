import SplitShell from "@/components/auth/SplitShell";
import AuthHero from "@/components/auth/AuthHero";
import SignupFlow from "@/components/auth/SignupFlow";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign Up · LoonyTube" };

export default async function SignupPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("invite_only").eq("id", 1).maybeSingle();

  return (
    <SplitShell hero={<AuthHero tone="teal" image="/onboarding/signup-hero.jpg" />}>
      <SignupFlow inviteOnly={data?.invite_only ?? false} />
    </SplitShell>
  );
}
