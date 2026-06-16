import SplitShell from "@/components/auth/SplitShell";
import AuthHero from "@/components/auth/AuthHero";
import SignupForm from "@/components/auth/SignupForm";

export const metadata = { title: "Sign Up · LoonyTube" };

export default function SignupPage() {
  return (
    <SplitShell hero={<AuthHero tone="teal" image="/onboarding/signup-hero.jpg" />}>
      <SignupForm />
    </SplitShell>
  );
}
