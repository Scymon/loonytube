import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { renderMd } from "@/lib/renderMd";
import BlockRenderer from "@/components/admin/page-builder/blocks/BlockRenderer";
import type { Block } from "@/components/admin/page-builder/types";

export const dynamic = "force-dynamic";

export default async function CustomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: page } = await supabase
    .from("pages")
    .select("title, body, blocks, is_published, updated_at")
    .eq("slug", slug)
    .maybeSingle();

  if (!page || !page.is_published) notFound();

  const blocks: Block[] = Array.isArray(page.blocks) && page.blocks.length > 0
    ? (page.blocks as Block[])
    : [];

  return (
    <div className="min-h-screen pb-16">
      {blocks.length === 0 && (
        // Legacy markdown body fallback — shown when no blocks exist yet
        <div className="mx-auto max-w-2xl px-4">
          <Link href="/" className="mb-8 block text-sm text-mist hover:text-foam transition-colors">
            \u2190 Back
          </Link>
          <h1 className="text-4xl font-bold text-foam">{page.title}</h1>
          <p className="mt-2 text-sm text-mist">
            Updated{" "}
            {new Date(page.updated_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <div className="mt-8 space-y-1">{renderMd(page.body ?? "")}</div>
        </div>
      )}

      {blocks.length > 0 &&
        blocks.map((block) => <BlockRenderer key={block.id} block={block} />)}
    </div>
  );
}
