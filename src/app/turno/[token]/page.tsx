import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { business, whatsappLink } from "@/lib/config";
import { serverEnv } from "@/lib/env";
import { formatDateTime, formatPrice } from "@/lib/format";
import { tokenSchema } from "@/lib/booking/schemas";
import { buckets, rateLimit } from "@/lib/security/rate-limit";
import { sha256 } from "@/lib/security/tokens";
import { supabaseService } from "@/lib/supabase/admin";
import type { AppointmentStatus } from "@/lib/types";
import { ArrowLeft } from "@/components/ui/icons";
import { CancelForm } from "./cancel-form";

export const metadata: Metadata = {
  title: "Tu turno",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const statusCopy: Record<AppointmentStatus, { label: string; tone: string }> = {
  pending: { label: "Esperando confirmación", tone: "bg-warn-wash text-warn" },
  confirmed: { label: "Confirmado", tone: "bg-ok-wash text-ok" },
  cancelled: { label: "Cancelado", tone: "bg-danger-wash text-danger" },
  completed: { label: "Realizado", tone: "bg-lacquer-wash text-lacquer-strong" },
  no_show: { label: "No asististe", tone: "bg-danger-wash text-danger" },
};

export default async function ManagePage({ params }: PageProps<"/turno/[token]">) {
  const { token } = await params;
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) notFound();

  if (!(await rateLimit(buckets.manage))) {
    return (
      <Shell>
        <p className="text-lg">Demasiados intentos seguidos. Esperá unos minutos y volvé a abrir el link.</p>
      </Shell>
    );
  }

  const env = serverEnv();
  const { data, error } = await supabaseService().rpc("get_appointment_by_token", {
    p_cancel_token_hash: sha256(parsed.data),
  });
  if (error) throw new Error("No se pudo cargar el turno");
  const appt = (data as Array<{
    service_name: string;
    price_cents: number | null;
    starts_at: string;
    customer_name: string;
    status: AppointmentStatus;
  }>)[0];
  if (!appt) notFound();

  const status = statusCopy[appt.status];
  const when = formatDateTime(appt.starts_at, env.BUSINESS_TIMEZONE);
  const active = appt.status === "pending" || appt.status === "confirmed";
  const cancellable = active && hoursUntil(appt.starts_at) > env.CANCELLATION_MIN_HOURS;
  const wa = whatsappLink(`Hola! Soy ${appt.customer_name}, te escribo por mi ${business.copy.appointment} del ${when}.`);

  return (
    <Shell>
      <span className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold ${status.tone}`}>{status.label}</span>
      <h1 className="mt-4 font-display text-4xl leading-[1.02] font-bold tracking-[-0.03em] first-letter:uppercase sm:text-5xl">
        {when}
      </h1>
      <p className="mt-3 text-lg">
        {appt.service_name} <span className="text-ink-soft">·</span>{" "}
        <span className="tabular">{formatPrice(appt.price_cents)}</span>
      </p>
      {business.address && <p className="mt-1 text-ink-soft">{business.address}</p>}

      <div className="mt-10 border-t border-line pt-8">
        {cancellable ? (
          <CancelForm token={parsed.data} />
        ) : active ? (
          <p className="max-w-[55ch] text-ink-soft">
            Faltan menos de {env.CANCELLATION_MIN_HOURS} h para el {business.copy.appointment}, así que ya no se puede
            cancelar desde acá. {wa ? "Escribinos por WhatsApp." : ""}
          </p>
        ) : null}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex font-semibold text-lacquer underline decoration-lacquer/40 hover:decoration-lacquer"
          >
            Escribir por WhatsApp
          </a>
        )}
      </div>
    </Shell>
  );
}

function hoursUntil(iso: string) {
  return (Date.parse(iso) - Date.now()) / 36e5;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-10 sm:px-8 sm:py-16">
      <Link href="/" className="mb-12 inline-flex w-fit items-center gap-2 font-display font-semibold text-lacquer">
        <ArrowLeft aria-hidden className="size-4" />
        {business.name}
      </Link>
      {children}
    </main>
  );
}
