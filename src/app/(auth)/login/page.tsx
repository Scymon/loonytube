import SplitShell from "@/components/auth/SplitShell";
import AuthHero from "@/components/auth/AuthHero";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = { title: "Log In · LoonyTube" };

export default function LoginPage() {
  return (
    <SplitShell hero={<AuthHero tone="cyan" image="/onboarding/login-hero.jpg" />}>
      <LoginForm />
    </SplitShell>
  );
}
