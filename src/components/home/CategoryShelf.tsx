// Placeholder. Renders sample data until videos carry a `category`/tag and
// these become real per-category queries.
import type { Shelf } from "./placeholders";

export default function CategoryShelf({ shelf }: { shelf: Shelf }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foam">
          <span>{shelf.icon}</span> {shelf.title}
        </h2>
        <button className="text-sm font-semibold text-link hover:underline">View All ›</button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {shelf.cards.map((c, i) => (
          <div key={i} className="group cursor-pointer">
            <div className="relative aspect-video overflow-hidden rounded-lg border border-edge">
              <div
                className="h-full w-full transition group-hover:scale-[1.03]"
                style={{
                  backgroundImage:
                    "radial-gradient(120% 120% at 30% 0%, rgba(98,184,230,0.25), transparent 60%), linear-gradient(160deg,#13202c,#0a0f15)",
                }}
              />
              <span className="absolute right-1.5 top-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-foam">
                {c.duration}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-teal">{c.channel}</p>
            <p className="truncate text-sm font-semibold text-foam">{c.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
