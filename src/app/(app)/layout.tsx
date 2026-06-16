import AppShell from "@/components/AppShell";

// Chrome for the main, signed-in app surface. The full-width top bar lives in
// Nav; the Loon logo opens the customizable left ribbon (AppShell wires them).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
