import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import type { NavSlotOverride, RibbonShortcut, RibbonFixedHidden, FooterSection } from "@/components/admin/NavLinksEditor";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [{ data: settings }, { data: siteConfig }] = await Promise.all([
    supabase.from("app_settings").select("full_width").eq("id", 1).maybeSingle(),
    supabase.from("site_config").select("site_name, logo_url, nav_slot_overrides, ribbon_shortcuts, ribbon_fixed_hidden, footer_sections").eq("id", 1).maybeSingle(),
  ]);

  const navSlotOverrides: NavSlotOverride[] = (siteConfig?.nav_slot_overrides as NavSlotOverride[] | null) ?? [];
  const ribbonShortcuts:   RibbonShortcut[]   = (siteConfig?.ribbon_shortcuts   as RibbonShortcut[]   | null) ?? [];
  const ribbonFixedHidden: RibbonFixedHidden  = (siteConfig?.ribbon_fixed_hidden as RibbonFixedHidden | null) ?? [];
  const footerSections:    FooterSection[]    = (siteConfig?.footer_sections    as FooterSection[]   | null) ?? [];

  return (
    <AppShell
      fullWidth={settings?.full_width ?? true}
      siteName={siteConfig?.site_name ?? "LoonyTube"}
      logoUrl={siteConfig?.logo_url ?? null}
      navSlotOverrides={navSlotOverrides}
      ribbonShortcuts={ribbonShortcuts}
      ribbonFixedHidden={ribbonFixedHidden}
      footerSections={footerSections}
    >
      {children}
    </AppShell>
  );
}
