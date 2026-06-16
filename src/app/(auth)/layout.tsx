// Full-bleed shell for splash, auth, and onboarding. No Nav, no max-width.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-panel">{children}</div>;
}
