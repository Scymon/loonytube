// template.tsx re-mounts on every navigation, giving each page a fresh fade-in.
// (layout.tsx persists across navigations; template.tsx does not.)
export default function PageTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-fade-in">{children}</div>;
}
