// Server-side theme access: cached, tag-invalidated ("theme") from
// /api/pages/revalidate when the Styleguide tab saves.
import { unstable_cache } from "next/cache";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { themeToCss, type ThemeOverrides } from "./theme-tokens";

export const getThemeCss = unstable_cache(
  async (): Promise<string> => {
    const supabase = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data } = await supabase.from("site_config").select("theme").eq("id", 1).maybeSingle();
    return themeToCss((data?.theme as ThemeOverrides | null) ?? null);
  },
  ["site-theme"],
  { revalidate: 3600, tags: ["theme"] }
);
