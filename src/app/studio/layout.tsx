import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudioShell from "@/components/studio/StudioShell";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return <StudioShell profile={profile ?? { username: null, full_name: null, avatar_url: null }}>{children}</StudioShell>;
}
