import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SplitShell from "@/components/auth/SplitShell";
import AuthHero from "@/components/auth/AuthHero";
import InterestPicker from "@/components/onboarding/InterestPicker";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Interests · LoonyTube" };

export default async function InterestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Invite-only funnel: if the switch is on and this user hasn't redeemed an
  // invite, send them to the gate first. (No-op when invite-only is off.)
  const { data: access } = await supabase.rpc("has_onboarding_access");
  if (access !== true) redirect("/onboarding/invite");

  const { data: options } = await supabase
    .from("interests")
    .select("slug, label")
    .order("sort", { ascending: true });

  const { data: mine } = await supabase
    .from("profile_interests")
    .select("interest_slug")
    .eq("profile_id", user.id);

  const initial = (mine ?? []).map((r) => r.interest_slug as string);

  return (
    <SplitShell hero={<AuthHero tone="violet" image="/onboarding/interests-hero.jpg" />}>
      <InterestPicker options={options ?? []} initial={initial} />
    </SplitShell>
  );
}
