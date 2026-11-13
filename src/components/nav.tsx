"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV_ITEMS = [
  { href: "/", label: "hoje" },
  { href: "/habitos", label: "hábitos" },
  { href: "/codigo", label: "código" },
  { href: "/projetos", label: "projetos" },
  { href: "/agenda", label: "agenda" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Barra inferior no celular, coluna lateral no desktop. */
export function Nav() {
  return <NavList pathname={usePathname()} />;
}

/** Mesma navegação sem item ativo: fallback enquanto a rota (dinâmica) resolve. */
export function NavFallback() {
  return <NavList pathname={null} />;
}

function NavList({ pathname }: { pathname: string | null }) {

  return (
    <nav
      aria-label="Principal"
      className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-seam bg-ink/95 backdrop-blur md:static md:border-t-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
    >
      <ul className="mx-auto flex max-w-md justify-between px-3 pt-2 md:max-w-none md:flex-col md:gap-1 md:px-0 md:pt-0">
        {NAV_ITEMS.map((item) => {
          const active = pathname !== null && isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 flex-col items-center justify-center gap-1 px-2 font-mono text-[12px] md:min-h-0 md:flex-row md:justify-start md:gap-2.5 md:py-1.5 md:text-[13px] ${
                  active ? "text-chalk" : "text-dust hover:text-chalk"
                }`}
              >
                <span
                  aria-hidden
                  className={`block size-2 rounded-[2px] ${active ? "bg-heat-4" : "bg-heat-0"}`}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
