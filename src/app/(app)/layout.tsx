import Nav from "@/components/Nav";

// Chrome for the main, signed-in app surface (home, watch, upload).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="px-4 py-6 sm:px-6">{children}</main>
    </>
  );
}
