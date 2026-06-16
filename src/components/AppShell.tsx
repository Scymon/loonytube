"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import Ribbon from "@/components/Ribbon";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem("lt-ribbon-open") === "1");
      setExpanded(localStorage.getItem("lt-ribbon-expanded") === "1");
    } catch {}
  }, []);

  function persist(o: boolean, e: boolean) {
    setOpen(o); setExpanded(e);
    try {
      localStorage.setItem("lt-ribbon-open", o ? "1" : "0");
      localStorage.setItem("lt-ribbon-expanded", e ? "1" : "0");
    } catch {}
  }

  const pad = open ? (expanded ? "lg:pl-[288px]" : "lg:pl-[88px]") : "";

  return (
    <>
      <Nav onLogoClick={() => persist(!open, expanded)} />
      <Ribbon
        open={open}
        expanded={expanded}
        onClose={() => persist(false, expanded)}
        onToggleExpand={() => persist(true, !expanded)}
      />
      <main className={`px-4 py-6 transition-[padding] duration-200 sm:px-6 ${pad}`}>{children}</main>
    </>
  );
}
