"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Agenda" },
  { href: "/admin/servicios", label: "Servicios" },
  { href: "/admin/horarios", label: "Horarios" },
  { href: "/admin/bloqueos", label: "Bloqueos" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones" className="no-scrollbar mx-auto max-w-5xl overflow-x-auto px-5 sm:px-8">
      <ul className="flex gap-6">
        {items.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="relative block py-3.5 text-sm font-semibold whitespace-nowrap text-ink-soft transition-colors hover:text-ink aria-[current=page]:text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-lacquer after:opacity-0 after:transition-opacity aria-[current=page]:after:opacity-100"
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
