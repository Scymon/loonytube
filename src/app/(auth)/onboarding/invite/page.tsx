import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SplitShell from "@/components/auth/SplitShell";
import AuthHero from "@/components/auth/AuthHero";
import InviteGate from "@/components/onboarding/InviteGate";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invite · LoonyTube" };

export default async function InvitePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // If invite-only is off, or this user already redeemed one, skip the gate.
  const { data: access } = await supabase.rpc("has_onboarding_access");
  if (access === true) redirect("/onboarding/interests");

  return (
    <SplitShell hero={<AuthHero tone="teal" image="/onboarding/interests-hero.jpg" />}>
      <InviteGate />
    </SplitShell>
  );
}
