import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { business } from "@/lib/config";
import { LogOut } from "@/components/ui/icons";
import { AdminNav } from "@/components/admin/nav";
import { logout } from "../login/actions";

export const metadata: Metadata = {
  title: { default: "Agenda", template: `%s · Panel` },
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const { email } = await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-ground/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 pt-4 sm:px-8">
          <Link href="/admin" className="font-display text-xl font-bold tracking-[-0.02em] text-lacquer">
            {business.name}
          </Link>
          <form action={logout} className="ml-auto">
            <button
              type="submit"
              title={email ?? undefined}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              <LogOut aria-hidden className="size-4" />
              Salir
            </button>
          </form>
        </div>
        <AdminNav />
      </header>
      <main className="mx-auto max-w-5xl px-5 pt-8 pb-24 sm:px-8 sm:pt-12">{children}</main>
    </div>
  );
}
