export default function ImageBlock({ props }: { props: Record<string, unknown> }) {
  const url     = (props.url     as string) || "";
  const alt     = (props.alt     as string) || "";
  const caption = (props.caption as string) || "";
  const size         = (props.size         as string) || "full";
  const borderRadius = (props.borderRadius as string) || "xl";
  const aspectRatio  = (props.aspectRatio  as string) || "";
  const objectFit    = (props.objectFit    as string) || "cover";
  const wClass       = size === "medium" ? "max-w-md" : size === "large" ? "max-w-2xl" : "max-w-full";
  const radiusClass  = borderRadius === "none" ? "" : borderRadius === "sm" ? "rounded-lg" : borderRadius === "full" ? "rounded-full" : "rounded-2xl";
  const fitClass     = objectFit === "contain" ? "object-contain" : "object-cover";

  if (!url) {
    return (
      <div className="mx-auto my-8 flex h-48 max-w-2xl items-center justify-center gap-3
        rounded-2xl border-2 border-dashed border-edge bg-panel/40 text-sm text-mist">
        <span className="text-2xl opacity-40">Image</span>
        <span>Add an image URL in the properties panel</span>
      </div>
    );
  }

  return (
    <figure className={`mx-auto my-8 px-4 ${wClass}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className={`w-full ${radiusClass} ${fitClass} shadow-xl shadow-black/20`}
        style={aspectRatio ? { aspectRatio } : undefined}
      />
      {caption && (
        <figcaption className="mt-3 text-center text-sm text-mist">{caption}</figcaption>
      )}
    </figure>
  );
}
