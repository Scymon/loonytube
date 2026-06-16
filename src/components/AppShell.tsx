"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import Ribbon from "@/components/Ribbon";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { setOpen(localStorage.getItem("lt-ribbon-open") === "1"); } catch {}
  }, []);

  function set(next: boolean) {
    setOpen(next);
    try { localStorage.setItem("lt-ribbon-open", next ? "1" : "0"); } catch {}
  }

  return (
    <>
      <Nav onLogoClick={() => set(!open)} />
      <Ribbon open={open} onClose={() => set(false)} />
      <main className={`px-4 py-6 transition-[padding] duration-200 sm:px-6 ${open ? "lg:pl-[288px]" : ""}`}>
        {children}
      </main>
    </>
  );
}
