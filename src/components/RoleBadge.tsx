const STYLE: Record<string, string> = {
  superadmin: "bg-loonred/15 text-loonred",
  admin: "bg-sky/15 text-sky",
  creator: "bg-teal/15 text-teal",
  guest: "bg-edge text-mist",
};
export default function RoleBadge({ role }: { role: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${STYLE[role] ?? STYLE.guest}`}>{role}</span>;
}
