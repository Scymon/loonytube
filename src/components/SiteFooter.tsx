import Link from "next/link";
import type { FooterSection } from "@/components/admin/NavLinksEditor";

type Props = {
  sections: FooterSection[];
  siteName: string;
};

export default function SiteFooter({ sections, siteName }: Props) {
  if (sections.length === 0) return null;

  return (
    <footer className="mt-auto border-t border-edge/50 bg-panel/60">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className={`grid gap-8 ${
          sections.length === 1 ? "sm:grid-cols-1" :
          sections.length === 2 ? "sm:grid-cols-2" :
          sections.length === 3 ? "sm:grid-cols-3" :
          "sm:grid-cols-2 md:grid-cols-4"
        }`}>
          {sections.map(section => (
            <div key={section.id}>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-mist/60">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map(link => (
                  <li key={link.id}>
                    {link.href.startsWith("http") ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-mist hover:text-foam transition-colors">
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href}
                        className="text-sm text-mist hover:text-foam transition-colors">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 border-t border-edge/30 pt-6 flex items-center justify-between">
          <p className="text-xs text-mist/40">
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
          <p className="text-xs text-mist/25">Powered by LoonyTube</p>
        </div>
      </div>
    </footer>
  );
}
