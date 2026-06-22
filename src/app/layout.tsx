import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LoonyTube",
    template: "%s | LoonyTube",
  },
  description: "Watch. Post. Stream. All in one. A hybrid video + social platform for creators.",

  // === Open Graph (Facebook, LinkedIn, Discord, etc.) ===
  openGraph: {
    title: "LoonyTube — Watch. Post. Stream. All in one.",
    description: "Long-form videos, Shorts, and real conversations in one feed. Built by creators, for creators.",
    images: [
      {
        url: "/images/og-home.jpg", // ← This controls the preview image
        width: 1200,
        height: 630,
        alt: "LoonyTube homepage",
      },
    ],
    url: "https://www.loonytube.tv",
    siteName: "LoonyTube",
    type: "website",
    locale: "en_US",
  },

  // === Twitter / X Card ===
  twitter: {
    card: "summary_large_image",
    title: "LoonyTube",
    description: "Watch. Post. Stream. All in one.",
    images: ["/images/og-home.jpg"],
    creator: "@DavidScymon", // ← change to your handle
  },

  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink text-foam antialiased">{children}</body>
    </html>
  );
}