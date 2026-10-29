import Link from "next/link";
import { business } from "@/lib/config";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-5 py-16 sm:px-8">
      <h1 className="font-display text-5xl font-bold tracking-[-0.03em]">No encontramos esta página</h1>
      <p className="mt-4 max-w-[50ch] text-lg text-ink-soft">
        Si llegaste desde el link de tu {business.copy.appointment}, revisá que esté completo.
      </p>
      <Link href="/" className="mt-8 w-fit font-display font-semibold text-lacquer underline decoration-lacquer/40">
        Ir a reservar
      </Link>
    </main>
  );
}
