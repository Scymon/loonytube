import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import type { Invite } from "@/components/admin/InviteManager";
import type { UserRow } from "@/components/admin/RoleManager";
import type { SiteConfig } from "@/components/admin/SiteConfigEditor";
import type { CmsPage } from "@/components/admin/PageManager";
import type { NavSlotOverride, RibbonShortcut, RibbonFixedHidden, FooterSection } from "@/components/admin/NavLinksEditor";

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

  const [
    { data: settings },
    { data: invites },
    { data: waitlist },
    { data: siteConfigRaw },
    { data: pagesRaw },
    { count: videoCount },
    { count: userCount },
    { count: postCount },
    { count: commentCount },
  ] = await Promise.all([
    supabase.from("app_settings").select("invite_only, signups_enabled, uploads_enabled, full_width").eq("id", 1).maybeSingle(),
    supabase.from("invites").select("code, note, redeemed_by, redeemed_at, created_at, expires_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("waitlist").select("email, created_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("site_config").select("site_name, site_tagline, logo_url, favicon_url, featured_video_id, nav_slot_overrides, ribbon_shortcuts, ribbon_fixed_hidden, footer_sections").eq("id", 1).maybeSingle(),
    supabase.from("pages").select("id, slug, title, body, blocks, is_published, updated_at").order("updated_at", { ascending: false }),
    supabase.from("videos").select("*", { count: "exact", head: true }).eq("status", "ready"),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("posts").select("*", { count: "exact", head: true }).is("parent_id", null),
    supabase.from("comments").select("*", { count: "exact", head: true }),
  ]);

  let users: UserRow[] = [];
  if (isSuper) {
    const { data } = await supabase.from("profiles").select("id, username, full_name, role").order("created_at", { ascending: false }).limit(50);
    users = (data ?? []) as UserRow[];
  }

  const siteConfig: SiteConfig = {
    site_name:        siteConfigRaw?.site_name        ?? "LoonyTube",
    site_tagline:     siteConfigRaw?.site_tagline     ?? "Watch. Post. Stream. All in one.",
    logo_url:         siteConfigRaw?.logo_url         ?? null,
    favicon_url:      siteConfigRaw?.favicon_url      ?? null,
    featured_video_id: siteConfigRaw?.featured_video_id ?? null,
  };
  const navSlotOverrides: NavSlotOverride[] = (siteConfigRaw?.nav_slot_overrides as NavSlotOverride[] | null) ?? [];
  const ribbonShortcuts:   RibbonShortcut[]   = (siteConfigRaw?.ribbon_shortcuts   as RibbonShortcut[]   | null) ?? [];
  const ribbonFixedHidden: RibbonFixedHidden  = (siteConfigRaw?.ribbon_fixed_hidden as RibbonFixedHidden | null) ?? [];
  const footerSections:    FooterSection[]    = (siteConfigRaw?.footer_sections    as FooterSection[]   | null) ?? [];

  return (
    <AdminShell
      isSuper={isSuper}
      settings={settings ?? { invite_only: false, signups_enabled: true, uploads_enabled: true, full_width: true }}
      invites={(invites ?? []) as Invite[]}
      waitlist={waitlist ?? []}
      users={users}
      selfId={user.id}
      siteConfig={siteConfig}
      pages={(pagesRaw ?? []) as CmsPage[]}
      navSlotOverrides={navSlotOverrides}
      ribbonShortcuts={ribbonShortcuts}
      ribbonFixedHidden={ribbonFixedHidden}
      footerSections={footerSections}
      stats={{
        videos:   videoCount   ?? 0,
        users:    userCount    ?? 0,
        posts:    postCount    ?? 0,
        comments: commentCount ?? 0,
      }}
    />
  );
}
