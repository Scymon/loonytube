/**
 * Split-screen shell: hero on the left (lg+), content panel on the right.
 * On mobile the hero is hidden and the panel fills the screen.
 */
export default function SplitShell({
  hero,
  children,
  panelClassName = "",
}: {
  hero: React.ReactNode;
  children: React.ReactNode;
  panelClassName?: string;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {hero}
      <div className="relative flex flex-col bg-panel">
        <div className={`flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 ${panelClassName}`}>
          <div className="mx-auto w-full max-w-[440px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
