import Nav from "@/components/Nav";

// Chrome for the main, signed-in app surface (feed, watch, upload).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}
