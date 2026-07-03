import type { Metadata } from "next";
import "./globals.css";
import AudioShell from "@/components/AudioShell";
import { getSiteTheme } from "@/lib/theme";

export const metadata: Metadata = {
  title: "LoonyTube",
  description: "Watch. Post. Stream. All in one.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Brand overrides from the admin Styleguide tab. Cached + tag-invalidated;
  // themeToCss() emits only allow-listed vars built from validated hex values,
  // and the font stylesheet comes from a fixed preset whitelist.
  const { css: themeCss, fontHref } = await getSiteTheme();
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink text-foam antialiased">
        {fontHref && (
          <>
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link rel="stylesheet" href={fontHref} />
          </>
        )}
        {themeCss && <style id="brand-theme" dangerouslySetInnerHTML={{ __html: themeCss }} />}
        <AudioShell>{children}</AudioShell>
      </body>
    </html>
  );
}
