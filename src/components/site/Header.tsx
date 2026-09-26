import Link from "next/link";
import { CairinLogo } from "@/components/brand/Logo";

const links = [
  { href: "/cairkan", label: "Cairkan" },
  { href: "/cara-kerja", label: "Cara kerja" },
  { href: "/biaya", label: "Biaya" },
  { href: "/legal", label: "Batasan" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5">
        <Link href="/" aria-label="Cairin, ke beranda">
          <CairinLogo animated />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/cairkan"
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          Mulai cairkan
        </Link>
      </div>
    </header>
  );
}
