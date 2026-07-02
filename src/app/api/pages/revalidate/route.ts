import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Called by the page builder after any save so the cached /p/[slug] page and
// the sitemap pick up changes immediately (instead of the 5-min safety window).
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin" && me?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { pageId, slug: rawSlug } = await req.json().catch(() => ({}));

  let slug: string | null = typeof rawSlug === "string" && rawSlug ? rawSlug : null;
  if (!slug) {
    if (!pageId || typeof pageId !== "string") {
      return NextResponse.json({ error: "pageId or slug required" }, { status: 400 });
    }
    const { data: page } = await supabase
      .from("pages").select("slug").eq("id", pageId).maybeSingle();
    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
    slug = page.slug;
  }

  revalidateTag(`page:${slug}`);
  revalidateTag("sitemap");
  return NextResponse.json({ ok: true, slug });
}
