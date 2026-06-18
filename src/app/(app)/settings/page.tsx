import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/settings/SignOutButton";
import RoleBadge from "@/components/RoleBadge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · LoonyTube" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prof } = await supabase
    .from("profiles").select("username, full_name, role").eq("id", user.id).maybeSingle();
  const role = prof?.role ?? "creator";
  const isAdmin = role === "admin" || role === "superadmin";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="mt-6 rounded-xl border border-edge bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foam">Account</h2>
          <RoleBadge role={role} />
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-mist">Display name</dt><dd className="text-foam">{prof?.full_name || "—"}</dd></div>
          <div className="flex justify-between"><dt className="text-mist">Handle</dt><dd className="text-foam">@{prof?.username ?? "you"}</dd></div>
          <div className="flex justify-between"><dt className="text-mist">Email</dt><dd className="text-foam">{user.email}</dd></div>
        </dl>
        <div className="mt-4 flex items-center gap-3">
          <Link href="/studio/profile" className="rounded-full px-5 py-2.5 text-sm font-bold text-ink" style={{ backgroundImage: "linear-gradient(180deg,#3ad6bd,#3e9fe6)" }}>Edit profile</Link>
          <SignOutButton />
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-edge bg-surface p-5">
        <h2 className="font-bold text-foam">Preferences</h2>
        <p className="mt-2 text-sm text-mist">Appearance and notification preferences are coming soon.</p>
      </section>

      {isAdmin && (
        <section className="mt-4 rounded-xl border border-sky/30 bg-sky/5 p-5">
          <h2 className="font-bold text-foam">Admin</h2>
          <p className="mt-1 text-sm text-mist">Top-level switches, invites, and roles.</p>
          <Link href="/admin" className="mt-3 inline-block rounded-full border border-sky/40 px-5 py-2.5 text-sm font-bold text-sky transition hover:bg-sky/10">
            Open Admin console →
          </Link>
        </section>
      )}
    </div>
  );
}
