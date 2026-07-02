import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/pages";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/studio", "/settings", "/messages", "/threads", "/notifications", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
