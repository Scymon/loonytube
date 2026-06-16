import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SplitShell from "@/components/auth/SplitShell";
import AuthHero from "@/components/auth/AuthHero";
import FollowList from "@/components/onboarding/FollowList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Who to Follow · LoonyTube" };

export default async function FollowPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Real profiles only — exclude self. (A ranked "suggested creators" model
  // comes later; for now this surfaces actual accounts, newest first.)
  const { data: creators } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .neq("id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: existing } = await supabase
    .from("follows")
    .select("followee")
    .eq("follower", user.id);
  const initial = (existing ?? []).map((r) => r.followee as string);

  return (
    <SplitShell hero={<AuthHero tone="cyan" image="/onboarding/follow-hero.jpg" />}>
      <FollowList meId={user.id} creators={creators ?? []} initial={initial} />
    </SplitShell>
  );
}
