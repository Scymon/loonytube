import SplitShell from "@/components/auth/SplitShell";
import AuthHero from "@/components/auth/AuthHero";
import AllSet from "@/components/onboarding/AllSet";

export const metadata = { title: "All Set · LoonyTube" };

export default function DonePage() {
  return (
    <SplitShell hero={<AuthHero tone="cyan" image="/onboarding/done-hero.jpg" />}>
      <AllSet />
    </SplitShell>
  );
}
