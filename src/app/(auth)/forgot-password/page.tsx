import SplitShell from "@/components/auth/SplitShell";
import AuthHero from "@/components/auth/AuthHero";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata = { title: "Reset Password · LoonyTube" };

export default function ForgotPasswordPage() {
  return (
    <SplitShell hero={<AuthHero tone="teal" image="/onboarding/reset-hero.jpg" />}>
      <ForgotPasswordForm />
    </SplitShell>
  );
}
