import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";

// Chrome for the main, signed-in app surface. The full-width top bar lives in
// Nav; the Loon logo opens the customizable left ribbon (AppShell wires them).
// Reads the content-width setting from app_settings so the layout can switch
// between full-width and readable-width modes via the SuperAdmin panel.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("full_width")
    .eq("id", 1)
    .maybeSingle();

  return <AppShell fullWidth={settings?.full_width ?? true}>{children}</AppShell>;
}
