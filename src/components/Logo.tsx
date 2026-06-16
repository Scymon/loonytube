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
  const box =
    size === "lg" ? "h-11 w-11 text-2xl" : size === "sm" ? "h-7 w-7 text-base" : "h-9 w-9 text-xl";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  const mark = (
    <span className="flex items-center gap-2.5">
      <span
        className={`grid place-items-center rounded-[10px] font-black text-ink ${box}`}
        style={{ backgroundImage: "linear-gradient(135deg, #3ad6bd, #2dbfa6)" }}
      >
        L
      </span>
      {wordmark && (
        <span className={`font-extrabold tracking-tight text-foam ${text}`}>
          Loony<span className="text-teal">Tube</span>
        </span>
      )}
    </span>
  );

  return href ? (
    <Link href={href} className="inline-flex">
      {mark}
    </Link>
  ) : (
    mark
  );
}
