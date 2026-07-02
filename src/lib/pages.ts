// Server-side CMS page access with tag-based caching.
// Published pages change only when an admin saves, so they are cached and
// invalidated via revalidateTag("page:<slug>") from /api/pages/revalidate.
import { unstable_cache } from "next/cache";
import { createClient as createAnonClient } from "@supabase/supabase-js";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://loonytube.tv";

export type CmsPage = {
  title: string;
  description: string | null;
  og_image_url: string | null;
  body: string | null;
  blocks: unknown;
  updated_at: string;
};

// Cookie-less anon client: RLS allows anonymous reads of published pages, and
// unstable_cache() cannot access request cookies anyway.
function anon() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export function getPublishedPage(slug: string): Promise<CmsPage | null> {
  return unstable_cache(
    async () => {
      const { data } = await anon()
        .from("pages")
        .select("title, description, og_image_url, body, blocks, updated_at")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      return (data as CmsPage | null) ?? null;
    },
    ["cms-page", slug],
    { revalidate: 300, tags: [`page:${slug}`] } // 5-min safety net + explicit tag
  )();
}
