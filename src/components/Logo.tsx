import Link from "next/link";

export default function Logo({
  size = "md",
  href = "/",
  wordmark = true,
}: {
  size?: "sm" | "md" | "lg";
  href?: string | null;
  wordmark?: boolean;
}) {
  const box = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  const mark = (
    <span className="flex items-center gap-2.5">
      <span className={`overflow-hidden rounded-[10px] ${box}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="\loonytube-logo_x480.png" alt="LoonyTube" className="h-full w-full object-cover" />
      </span>
      {wordmark && (
        <span className={`font-extrabold tracking-tight text-foam ${text}`}>
          Loony<span className="text-teal">Tube</span>
        </span>
      )}
    </span>
  );

  return href ? <Link href={href} className="inline-flex">{mark}</Link> : mark;
}
