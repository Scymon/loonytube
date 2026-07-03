import type { Metadata } from "next";
import "./globals.css";
import AudioShell from "@/components/AudioShell";
import { getThemeCss } from "@/lib/theme";

export const metadata: Metadata = {
  title: "LoonyTube",
  description: "Watch. Post. Stream. All in one.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Brand overrides from the admin Styleguide tab. Cached + tag-invalidated;
  // themeToCss() emits only allow-listed vars built from validated hex values.
  const themeCss = await getThemeCss();
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink text-foam antialiased">
        {themeCss && <style id="brand-theme" dangerouslySetInnerHTML={{ __html: themeCss }} />}
        <AudioShell>{children}</AudioShell>
      </body>
    </html>
  );
}
