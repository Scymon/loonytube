import SplitShell from "@/components/auth/SplitShell";
import AuthHero from "@/components/auth/AuthHero";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "New Password · LoonyTube" };

export default function ResetPasswordPage() {
  return (
    <SplitShell hero={<AuthHero tone="teal" image="/onboarding/reset-hero.jpg" />}>
      <ResetPasswordForm />
    </SplitShell>
  );
}
