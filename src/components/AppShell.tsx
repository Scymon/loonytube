"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";
import Ribbon from "@/components/Ribbon";
import CreateModal from "@/components/create/CreateModal";

export default function AppShell({ children, fullWidth = true }: { children: React.ReactNode; fullWidth?: boolean }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem("lt-ribbon-open") === "1");
      setExpanded(localStorage.getItem("lt-ribbon-expanded") === "1");
    } catch {}
    setMounted(true);
  }, []);

  function persist(o: boolean, e: boolean) {
    setOpen(o); setExpanded(e);
    try {
      localStorage.setItem("lt-ribbon-open", o ? "1" : "0");
      localStorage.setItem("lt-ribbon-expanded", e ? "1" : "0");
    } catch {}
  }

  const pad = open ? (expanded ? "lg:pl-[288px]" : "lg:pl-[88px]") : "";
  const pathname = usePathname();
  const isMessages = pathname.startsWith("/messages") || pathname.startsWith("/threads");

  return (
    <div className={isMessages ? "fixed inset-0 flex flex-col" : ""}>
      <Nav onLogoClick={() => persist(!open, expanded)} />
      <Ribbon
        open={open}
        expanded={expanded}
        onClose={() => persist(false, expanded)}
        onToggleExpand={() => persist(true, !expanded)}
      />
      <main className={isMessages
        ? "flex-1 min-h-0 overflow-hidden"
        : `px-4 py-6 pb-24 ${mounted ? "transition-[padding] duration-200" : ""} sm:px-6 md:pb-6 ${pad}`
      }>{fullWidth ? children : <div className="mx-auto w-full max-w-[1440px]">{children}</div>}</main>
      <Suspense fallback={null}><CreateModal /></Suspense>
    </div>
  );
}
