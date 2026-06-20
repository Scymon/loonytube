// Renders 1–4 attached post images in a responsive rounded grid.
export default function PostImages({ images }: { images?: string[] | null }) {
  if (!images || images.length === 0) return null;
  const imgs = images.slice(0, 4);
  const n = imgs.length;
  const cols = n === 1 ? "grid-cols-1" : "grid-cols-2";
  return (
    <div className={`mt-3 grid ${cols} gap-1 overflow-hidden rounded-2xl border border-edge`}>
      {imgs.map((src, i) => (
        <a key={i} href={src} target="_blank" rel="noreferrer"
          className={`block ${n === 3 && i === 0 ? "row-span-2" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" loading="lazy"
            className={`w-full object-cover ${n === 1 ? "max-h-[520px]" : "h-full max-h-[260px]"}`} />
        </a>
      ))}
    </div>
  );
}
