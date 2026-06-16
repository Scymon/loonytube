export default function Stepper({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-baseline justify-between text-[12px]">
        <span className="text-mist">Setup Progress</span>
        <span className="font-semibold text-teal">
          Step {step} of {total}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-edge">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundImage: "linear-gradient(90deg, #2dd4b4, #62b8e6)",
          }}
        />
      </div>
    </div>
  );
}
