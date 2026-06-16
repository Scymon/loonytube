import Logo from "@/components/Logo";

type Tone = "cyan" | "teal" | "violet" | "arena";

const TONES: Record<Tone, { from: string; via: string; glow: string }> = {
  cyan:   { from: "#0a1822", via: "#0b2330", glow: "rgba(98,184,230,0.22)" },
  teal:   { from: "#08201c", via: "#0a2a25", glow: "rgba(45,212,180,0.20)" },
  violet: { from: "#140e22", via: "#1c1130", glow: "rgba(139,92,246,0.20)" },
  arena:  { from: "#081016", via: "#0a1a24", glow: "rgba(45,212,180,0.18)" },
};

/**
 * Left-hand hero. Drop a real Figma export at /public/onboarding/<name>.jpg and pass
 * `image="/onboarding/<name>.jpg"`; otherwise a themed Loonatic gradient is used.
 */
export default function AuthHero({
  tone = "cyan",
  image,
  showLogo = false,
  children,
}: {
  tone?: Tone;
  image?: string;
  showLogo?: boolean;
  children?: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <div className="relative hidden overflow-hidden lg:block">
      {/* gradient base */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(120% 90% at 50% 0%, ${t.glow}, transparent 60%), linear-gradient(180deg, ${t.from}, ${t.via} 55%, #060a10 100%)`,
        }}
      />
      {/* optional real image */}
      {image && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-90"
          style={{ backgroundImage: `url(${image})` }}
        />
      )}
      {/* faint grid texture */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      {/* right-edge fade into the panel */}
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-panel to-transparent" />

      {showLogo && (
        <div className="absolute left-8 top-8 z-10">
          <Logo size="md" />
        </div>
      )}
      {children && <div className="absolute inset-0 z-10">{children}</div>}
    </div>
  );
}
