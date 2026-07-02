import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { renderMd } from "@/lib/renderMd";
import { getPublishedPage, SITE_URL } from "@/lib/pages";
import BlockRenderer from "@/components/admin/page-builder/blocks/BlockRenderer";
import type { Block } from "@/components/admin/page-builder/types";

// No force-dynamic: page data comes from a tagged cache, invalidated on publish.

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) return {};
  const description = page.description ?? undefined;
  const images = page.og_image_url ? [page.og_image_url] : undefined;
  return {
    title: page.title,
    description,
    alternates: { canonical: `${SITE_URL}/p/${slug}` },
    openGraph: { title: page.title, description, url: `${SITE_URL}/p/${slug}`, images, type: "website" },
    twitter: { card: images ? "summary_large_image" : "summary", title: page.title, description, images },
  };
}

export default async function CustomPage({ params }: Params) {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) notFound();

  const blocks: Block[] = Array.isArray(page.blocks) && page.blocks.length > 0
    ? (page.blocks as Block[])
    : [];

  return (
    <div className="min-h-screen pb-16">
      {blocks.length === 0 && (
        // Legacy markdown body fallback — shown when no blocks exist yet
        <div className="mx-auto max-w-2xl px-4">
          <Link href="/" className="mb-8 block text-sm text-mist hover:text-foam transition-colors">
            ← Back
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
