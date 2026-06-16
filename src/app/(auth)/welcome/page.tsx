import Link from "next/link";
import SplitShell from "@/components/auth/SplitShell";
import AuthHero from "@/components/auth/AuthHero";

export const metadata = { title: "Welcome · LoonyTube" };

export default function WelcomePage() {
  return (
    <SplitShell
      hero={
        <AuthHero tone="arena" showLogo>
          <div className="absolute bottom-12 left-10">
            <h2 className="text-6xl font-black tracking-tight text-foam">LoonyTube</h2>
            <p className="mt-2 text-lg font-semibold text-teal">Watch. Post. Stream. All in one.</p>
          </div>
        </AuthHero>
      }
    >
      <h1 className="text-4xl font-extrabold tracking-tight text-foam">The world is watching</h1>
      <p className="mt-3 text-mist">Join millions of creators and fans.</p>

      <div className="mt-8 space-y-3">
        <Link href="/signup" className="lt-btn-primary block">
          Get Started
        </Link>
        <Link href="/login" className="lt-btn-outline block">
          Log In
        </Link>
      </div>

      <div className="mt-5 text-center">
        <Link href="/" className="text-[13px] text-mist underline underline-offset-4 hover:text-foam">
          Continue as Guest
        </Link>
      </div>

      <p className="mt-12 text-center text-[11px] text-mist/70">
        Redefining Video Entertainment for the Next Generation. © 2026 LoonyTube.
      </p>
    </SplitShell>
  );
}
