import type { FeatureItem } from "../types";

export default function FeaturesBlock({ props }: { props: Record<string, unknown> }) {
  const heading   = (props.heading   as string) || "";
  const cols      = (props.columns   as number) || 3;
  const items     = (props.items     as FeatureItem[]) || [];
  const bgColor   = (props.bgColor   as string) || "";
  const textColor = (props.textColor as string) || "";
  const bgImage   = (props.bgImage   as string) || "";
  const bgSize    = (props.bgSize    as string) || "cover";
  const bgPos     = (props.bgPos     as string) || "center";
  const bgOverlay = (props.bgOverlay as number) ?? 50;

  const gridClass =
    cols === 2 ? "grid-cols-1 sm:grid-cols-2" :
    cols === 4 ? "grid-cols-2 sm:grid-cols-4" :
    "grid-cols-1 sm:grid-cols-3";

  return (
    <section
      className="relative mx-auto max-w-5xl px-6 py-16 overflow-hidden"
      style={{
        ...(bgColor   ? { background: bgColor } : {}),
        ...(textColor ? { color: textColor }     : {}),
        ...(bgImage   ? {
          backgroundImage:    `url(${bgImage})`,
          backgroundSize:     bgSize,
          backgroundPosition: bgPos,
        } : {}),
      }}
    >
      {bgImage && bgOverlay > 0 && (
        <div className="pointer-events-none absolute inset-0" style={{ background: `rgba(0,0,0,${bgOverlay / 100})` }} />
      )}
      <div className="relative">
      {heading && (
        <h2 className="mb-12 text-center text-3xl font-bold text-foam tracking-tight">{heading}</h2>
      )}
      <div className={`grid gap-6 ${gridClass}`}>
        {items.map((item, i) => (
          <div key={i}
            className="group flex flex-col rounded-2xl border border-edge/60 bg-surface/50
              p-6 hover:border-teal/30 hover:bg-surface transition-all duration-200">
            {item.emoji && (
              <span className="mb-4 text-3xl leading-none" role="img" aria-hidden>{item.emoji}</span>
            )}
            <h3 className="text-base font-semibold text-foam">{item.title}</h3>
            {item.desc && (
              <p className="mt-1.5 text-sm text-mist leading-relaxed">{item.desc}</p>
            )}
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}
