export default function Avatar({
  name,
  src,
  size = 40,
  ring = false,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  ring?: boolean;
}) {
  const ch = (name || "?").charAt(0).toUpperCase();
  const ringCls = ring ? "ring-2 ring-teal/70 ring-offset-2 ring-offset-panel" : "";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name ?? ""}
        width={size}
        height={size}
        className={`rounded-full object-cover ${ringCls}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`grid place-items-center rounded-full font-bold text-ink ${ringCls}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        backgroundImage: "linear-gradient(135deg, #3ad6bd, #62b8e6)",
      }}
    >
      {ch}
    </span>
  );
}
