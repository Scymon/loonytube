import type { InlineEditProps } from "./BlockRenderer";

type Props = { props: Record<string, unknown> } & InlineEditProps;

export default function HeroBlock({ props, editing = false, onEdit }: Props) {
  const heading    = (props.heading    as string) || "Heading";
  const subheading = (props.subheading as string) || "";
  const ctaText    = (props.ctaText    as string) || "";
  const ctaUrl     = (props.ctaUrl     as string) || "/";
  const bgColor    = (props.bgColor    as string) || "#0a1a2c";
  const textColor  = (props.textColor  as string) || "#ffffff";
  const bgImage    = (props.bgImage    as string) || "";
  const bgSize     = (props.bgSize     as string) || "cover";
  const bgPos      = (props.bgPos      as string) || "center";
  const bgOverlay  = (props.bgOverlay  as number) ?? 50;
  const align      = (props.align      as string) || "center";
  const minHeight  = (props.minHeight  as number) ?? 400;
  const paddingY   = (props.paddingY   as number) ?? 96;
  const textAlign  = align === "center" ? "text-center" : "text-left";

  return (
    <section
      style={{
        background: bgColor,
        minHeight,
        paddingTop: paddingY,
        paddingBottom: paddingY,
        color: textColor,
        ...(bgImage ? {
          backgroundImage: `url(${bgImage})`,
          backgroundSize: bgSize,
          backgroundPosition: bgPos,
        } : {}),
      }}
      className="relative w-full px-8 overflow-hidden"
    >
      {bgImage && bgOverlay > 0 && (
        <div className="pointer-events-none absolute inset-0" style={{ background: `rgba(0,0,0,${bgOverlay / 100})` }} />
      )}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC45IiBudW1PY3RhdmVzPSI0Ii8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIi8+PC9zdmc+')]" />
      <div className={`relative mx-auto max-w-3xl ${textAlign}`}>
        {editing ? (
          <input
            autoFocus
            className="w-full bg-transparent text-5xl font-bold outline-none
              border-b-2 border-white/30 focus:border-white/60 transition-colors pb-1 leading-tight"
            style={{ color: textColor }}
            value={heading}
            onChange={(e) => onEdit?.("heading", e.target.value)}
            placeholder="Heading..."
          />
        ) : (
          <h1 className="text-5xl font-bold leading-tight tracking-tight" style={{ color: textColor }}>{heading}</h1>
        )}

        {editing ? (
          <input
            className="mt-5 w-full bg-transparent text-xl outline-none
              border-b border-white/20 focus:border-white/40 transition-colors pb-0.5"
            style={{ color: textColor, opacity: 0.7 }}
            value={subheading}
            onChange={(e) => onEdit?.("subheading", e.target.value)}
            placeholder="Subheading..."
          />
        ) : subheading ? (
          <p className="mt-5 text-xl leading-relaxed" style={{ color: textColor, opacity: 0.7 }}>{subheading}</p>
        ) : null}

        {ctaText && !editing && (
          <a href={ctaUrl}
            className="mt-10 inline-block rounded-full bg-white/10 backdrop-blur border border-white/20
              px-8 py-3 text-base font-semibold hover:bg-white/20 transition-all"
            style={{ color: textColor }}>
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
}
