// Placeholder. Renders sample data until live streaming (Phase 5) exists.
import Avatar from "@/components/Avatar";
import { nfmt } from "@/lib/format";
import type { LiveChannel } from "./placeholders";

export default function LiveNowRail({ channels }: { channels: LiveChannel[] }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-foam">Live Now</h2>
      <div className="grid grid-cols-3 gap-3">
        {channels.map((c) => (
          <div key={c.name} className="rounded-xl border border-edge bg-surface p-3">
            <div className="relative w-fit">
              <Avatar name={c.name} size={34} />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-teal" />
            </div>
            <p className="mt-2 truncate text-sm font-semibold text-foam">{c.name}</p>
            <p className="truncate text-xs text-teal">{nfmt(c.watching)} watching</p>
          </div>
        ))}
      </div>
    </section>
  );
}
