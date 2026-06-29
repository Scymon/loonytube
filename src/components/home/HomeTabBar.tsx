"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function HomeTabBar() {
  const params = useSearchParams();
  const tab = params.get("tab") ?? "foryou";

  const cls = (active: boolean) =>
    [
      "px-5 py-2 text-sm font-semibold rounded-full transition-all duration-200",
      active
        ? "bg-teal/15 text-teal border border-teal/40 shadow-[0_0_10px_rgba(45,212,180,0.2)]"
        : "text-mist/60 hover:text-teal hover:bg-teal/5",
    ].join(" ");

  return (
    <div className="flex gap-2 border-b border-edge pb-1">
      <Link href="/" className={cls(tab === "foryou")}>
        For You
      </Link>
      <Link href="/?tab=following" className={cls(tab === "following")}>
        Following
      </Link>
    </div>
  );
}
