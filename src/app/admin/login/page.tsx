import type { Metadata } from "next";
import { business } from "@/lib/config";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden bg-lacquer p-12 text-on-lacquer lg:flex lg:flex-col lg:justify-end">
        <p className="font-display text-[clamp(3rem,6vw,5rem)] leading-[0.92] font-bold tracking-[-0.035em] [font-stretch:88%]">
          {business.name}
        </p>
      </div>
      <div className="flex flex-col justify-center px-5 py-16 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="font-display text-4xl font-bold tracking-[-0.03em]">Tu agenda</h1>
          <p className="mt-2 text-ink-soft">Ingresá para ver y gestionar los turnos.</p>
          {error === "forbidden" && (
            <p role="alert" className="mt-6 rounded-xl bg-danger-wash px-4 py-3 text-sm font-medium text-danger">
              Esta cuenta no tiene acceso al panel.
            </p>
          )}
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
