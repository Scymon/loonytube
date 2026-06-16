import { createClient } from "@/lib/supabase/server";
import ProfileEditor, { type Profile } from "@/components/studio/ProfileEditor";

export const dynamic = "force-dynamic";

export default async function StudioProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user!.id;

  const { data } = await supabase
    .from("profiles")
    .select("id, username, full_name, bio, avatar_url, banner_url, website, location, social_x, social_instagram, social_youtube")
    .eq("id", uid).maybeSingle();

  const profile: Profile = data ?? {
    id: uid, username: null, full_name: null, bio: null, avatar_url: null, banner_url: null,
    website: null, location: null, social_x: null, social_instagram: null, social_youtube: null,
  };

  return (
    <div>
      <h1 className="sr-only">Edit profile</h1>
      <ProfileEditor initial={profile} />
    </div>
  );
}
