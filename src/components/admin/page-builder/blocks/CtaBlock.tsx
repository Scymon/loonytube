import type { InlineEditProps } from "./BlockRenderer";

type Props = { props: Record<string, unknown> } & InlineEditProps;

export default function CtaBlock({ props, editing = false, onEdit }: Props) {
  const heading    = (props.heading    as string) || "Ready to get started?";
  const body       = (props.body       as string) || "";
  const buttonText = (props.buttonText as string) || "Get started";
  const buttonUrl  = (props.buttonUrl  as string) || "/";
  const bgColor     = (props.bgColor     as string) || "#0d2b3e";
  const bgImage     = (props.bgImage     as string) || "";
  const bgSize      = (props.bgSize      as string) || "cover";
  const bgPos       = (props.bgPos       as string) || "center";
  const bgOverlay   = (props.bgOverlay   as number) ?? 50;
  const align       = (props.align       as string) || "center";
  const buttonStyle = (props.buttonStyle as string) || "ghost";
  const buttonColor = (props.buttonColor as string) || "";
  const textAlign   = align === "left" ? "text-left" : "text-center";

  const btnClass =
    buttonStyle === "solid"
      ? "bg-white text-gray-900 hover:brightness-110"
      : buttonStyle === "outline"
      ? "border-2 border-white/60 text-white hover:bg-white/10"
      : "bg-white/10 backdrop-blur border border-white/25 text-white hover:bg-white/20";

  return (
    <section
      style={{
        background: bgColor,
        ...(bgImage ? {
          backgroundImage: `url(${bgImage})`,
          backgroundSize: bgSize,
          backgroundPosition: bgPos,
        } : {}),
      }}
      className={`relative w-full px-8 py-16 ${textAlign} overflow-hidden`}
    >
      {bgImage && bgOverlay > 0 && (
        <div className="pointer-events-none absolute inset-0" style={{ background: `rgba(0,0,0,${bgOverlay / 100})` }} />
      )}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC43NSIgbnVtT2N0YXZlcz0iNCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNuKSIvPjwvc3ZnPg==')]" />
      <div className="relative mx-auto max-w-2xl">
        {editing ? (
          <input
            autoFocus
            className={`w-full bg-transparent text-3xl font-bold text-white ${textAlign} outline-none
              border-b-2 border-white/30 focus:border-white/60 transition-colors pb-1`}
            value={heading}
            onChange={(e) => onEdit?.("heading", e.target.value)}
            placeholder="Heading..."
          />
        ) : (
          <h2 className="text-3xl font-bold text-white tracking-tight">{heading}</h2>
        )}
        {body && !editing && (
          <p className="mt-3 text-lg text-white/65">{body}</p>
        )}
        {!editing && (
          <a href={buttonUrl}
            className={`mt-8 inline-block rounded-full px-8 py-3 text-base font-semibold transition-all ${btnClass}`}
            style={buttonColor ? { background: buttonColor, borderColor: buttonColor } : {}}>
            {buttonText}
          </a>
        )}
      </div>
    </section>
  );
}
