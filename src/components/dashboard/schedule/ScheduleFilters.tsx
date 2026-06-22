"use client";

type Filter = "all" | "live" | "tonight";

type Props = {
  active: Filter;
  onChange: (f: Filter) => void;
};

const OPTIONS: { key: Filter; label: string }[] = [
  { key: "all",     label: "All Channels" },
  { key: "live",    label: "Live Now"     },
  { key: "tonight", label: "Tonight"      },
];

export default function ScheduleFilters({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {OPTIONS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            active === key
              ? "bg-teal text-ink"
              : "border border-edge text-mist hover:border-hair hover:text-foam"
          }`}
        >
          {label}
        </button>
      ))}
      <button className="ml-1 text-xs text-mist hover:text-foam transition">
        Manage &rsaquo;
      </button>
    </div>
  );
}
