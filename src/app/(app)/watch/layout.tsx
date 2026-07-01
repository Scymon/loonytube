// AppShell already handles watch-page spacing via its isWatch branch
// (pt-[57px] px-4 pb-24 sm:px-6 + sidebar offset). No negative margins needed.
export default function WatchRouteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
