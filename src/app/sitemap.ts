import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/pages";

// Cached an hour + invalidated by /api/pages/revalidate (tag "sitemap").
const getEntries = unstable_cache(
  async (): Promise<MetadataRoute.Sitemap> => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const [{ data: pages }, { data: videos }, { data: articles }] = await Promise.all([
      supabase.from("pages").select("slug, updated_at").eq("is_published", true),
      supabase.from("videos").select("id, created_at").eq("status", "ready").eq("visibility", "public")
        .order("created_at", { ascending: false }).limit(500),
      supabase.from("articles").select("id, created_at")
        .order("created_at", { ascending: false }).limit(200),
    ]);

    return [
      { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
      { url: `${SITE_URL}/explore`, changeFrequency: "hourly", priority: 0.8 },
      ...(pages ?? []).map((p) => ({
        url: `${SITE_URL}/p/${p.slug}`,
        lastModified: new Date(p.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...(videos ?? []).map((v) => ({
        url: `${SITE_URL}/watch/${v.id}`,
        lastModified: new Date(v.created_at),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
      ...(articles ?? []).map((a) => ({
        url: `${SITE_URL}/article/${a.id}`,
        lastModified: new Date(a.created_at),
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
    ];
  },
  ["sitemap"],
  { revalidate: 3600, tags: ["sitemap"] }
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getEntries();
}
