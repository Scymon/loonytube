import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LoonyTube",
  description: "Watch. Post. Stream. All in one.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink text-foam antialiased">{children}</body>
    </html>
  );
}
