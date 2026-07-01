export function DividerBlock({ props = {} }: { props?: Record<string, unknown> }) {
  const color       = (props.color       as string) || "";
  const thickness   = (props.thickness   as number) || 1;
  const divStyle    = (props.dividerStyle as string) || "solid";
  const padY        = (props.padY        as number) ?? 8;
  return (
    <div className="px-8" style={{ paddingTop: padY, paddingBottom: padY }}>
      <hr style={{
        borderColor:    color || undefined,
        borderTopWidth: thickness,
        borderTopStyle: divStyle as "solid" | "dashed" | "dotted",
        borderBottomWidth: 0,
        borderLeftWidth:   0,
        borderRightWidth:  0,
      }} />
    </div>
  );
}

export function SpacerBlock({ props }: { props: Record<string, unknown> }) {
  const height = (props.height as number) || 48;
  return <div style={{ height }} aria-hidden />;
}
