// Watch pages cancel AppShell's generic py-6 px-4 sm:px-6 so the player
// can sit flush against the nav bar with its own tighter spacing.
export default function WatchRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 -mt-6 sm:-mx-6">
      {children}
    </div>
  );
}
