import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSwitches from "@/components/admin/AdminSwitches";
import InviteManager, { type Invite } from "@/components/admin/InviteManager";
import RoleManager, { type UserRow } from "@/components/admin/RoleManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · LoonyTube" };

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = me?.role ?? "creator";
  if (role !== "admin" && role !== "superadmin") redirect("/");
  const isSuper = role === "superadmin";

  const { data: settings } = await supabase
    .from("app_settings").select("invite_only, signups_enabled, uploads_enabled, full_width").eq("id", 1).maybeSingle();
  const { data: invites } = await supabase
    .from("invites").select("code, note, redeemed_by, redeemed_at, created_at, expires_at").order("created_at", { ascending: false }).limit(50);
  const { data: waitlist } = await supabase
    .from("waitlist").select("email, created_at").order("created_at", { ascending: false }).limit(100);

  let users: UserRow[] = [];
  if (isSuper) {
    const { data } = await supabase.from("profiles").select("id, username, full_name, role").order("created_at", { ascending: false }).limit(50);
    users = (data ?? []) as UserRow[];
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Admin console</h1>
      <p className="mt-1 text-sm text-mist">Signed in as <span className="font-semibold capitalize text-foam">{role}</span>.</p>

      <h2 className="mt-8 mb-3 text-lg font-bold">Feature switches</h2>
      <AdminSwitches initial={settings ?? { invite_only: false, signups_enabled: true, uploads_enabled: true, full_width: true }} canInviteOnly={isSuper} />

      <h2 className="mt-8 mb-3 text-lg font-bold">Invites</h2>
      <InviteManager initial={(invites ?? []) as Invite[]} uid={user.id} />

      <h2 className="mt-8 mb-3 text-lg font-bold">Waitlist {waitlist && waitlist.length > 0 && <span className="text-sm font-normal text-mist">· {waitlist.length}</span>}</h2>
      <div className="rounded-xl border border-edge bg-surface p-4">
        {waitlist && waitlist.length > 0 ? (
          <ul className="divide-y divide-edge text-sm">
            {waitlist.map((w) => (
              <li key={w.email} className="flex items-center justify-between py-2">
                <span className="text-foam">{w.email}</span>
                <span className="text-xs text-mist">{new Date(w.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        ) : <p className="py-2 text-center text-sm text-mist">No waitlist signups yet.</p>}
      </div>

      {isSuper && (
        <>
          <h2 className="mt-8 mb-3 text-lg font-bold">Roles</h2>
          <RoleManager initial={users} selfId={user.id} />
        </>
      )}
    </div>
  );
}
