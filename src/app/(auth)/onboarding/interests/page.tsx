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
