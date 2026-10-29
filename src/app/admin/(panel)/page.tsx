import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { addDays, formatDateTime, formatLongDate, formatPrice, formatTime, isIsoDate, todayIn, zonedToUtc } from "@/lib/format";
import type { Appointment, AppointmentStatus } from "@/lib/types";
import { ChevronLeft, ChevronRight, MessageCircle } from "@/components/ui/icons";
import { PageTitle, StatusBadge, quietButton } from "@/components/admin/ui";
import { setAppointmentStatus } from "../actions";

const columns =
  "id, service_id, service_name, price_cents, starts_at, ends_at, customer_name, customer_phone, customer_email, notes, status, created_at";

export default async function AgendaPage({ searchParams }: PageProps<"/admin">) {
  const { supabase } = await requireAdmin();
  const tz = serverEnv().BUSINESS_TIMEZONE;
  const today = todayIn(tz);
  const { d } = await searchParams;
  const day = typeof d === "string" && isIsoDate(d) ? d : today;

  const from = zonedToUtc(day, "00:00", tz).toISOString();
  const to = zonedToUtc(addDays(day, 1), "00:00", tz).toISOString();

  const [{ data: dayData }, { data: pendingData }] = await Promise.all([
    supabase.from("appointments").select(columns).gte("starts_at", from).lt("starts_at", to).order("starts_at"),
    supabase
      .from("appointments")
      .select(columns)
      .eq("status", "pending")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(50),
  ]);
  const appointments = (dayData ?? []) as Appointment[];
  const pending = (pendingData ?? []) as Appointment[];
  const active = appointments.filter((a) => a.status === "pending" || a.status === "confirmed");

  return (
    <>
      <PageTitle title="Agenda" />

      {pending.length > 0 && (
        <section aria-labelledby="pending-title" className="mb-14">
          <h2 id="pending-title" className="font-display text-2xl font-bold tracking-[-0.02em]">
            Por confirmar <span className="tabular text-ink-soft">({pending.length})</span>
          </h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {pending.map((a) => (
              <AppointmentRow key={a.id} appt={a} tz={tz} when={formatDateTime(a.starts_at, tz)} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="day-title">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <h2 id="day-title" className="font-display text-2xl font-bold tracking-[-0.02em] first-letter:uppercase">
            {formatLongDate(day)}
          </h2>
          <p className="text-ink-soft">
            {active.length === 0 ? "Sin turnos" : `${active.length} ${active.length === 1 ? "turno" : "turnos"}`}
          </p>
          <nav aria-label="Cambiar de día" className="ml-auto flex items-center gap-1">
            <Link href={`/admin?d=${addDays(day, -1)}`} className={quietButton} aria-label="Día anterior">
              <ChevronLeft aria-hidden className="size-4" />
            </Link>
            {day !== today && (
              <Link href="/admin" className={quietButton}>
                Hoy
              </Link>
            )}
            <Link href={`/admin?d=${addDays(day, 1)}`} className={quietButton} aria-label="Día siguiente">
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          </nav>
        </div>

        {appointments.length === 0 ? (
          <p className="mt-6 border-y border-line py-10 text-center text-ink-soft">No hay turnos para este día.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {appointments.map((a) => (
              <AppointmentRow
                key={a.id}
                appt={a}
                tz={tz}
                when={`${formatTime(a.starts_at, tz)}–${formatTime(a.ends_at, tz)}`}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

const nextActions: Record<AppointmentStatus, Array<{ status: AppointmentStatus; label: string }>> = {
  pending: [
    { status: "confirmed", label: "Confirmar" },
    { status: "cancelled", label: "Cancelar" },
  ],
  confirmed: [
    { status: "completed", label: "Realizado" },
    { status: "no_show", label: "No vino" },
    { status: "cancelled", label: "Cancelar" },
  ],
  cancelled: [{ status: "pending", label: "Reactivar" }],
  completed: [{ status: "confirmed", label: "Deshacer" }],
  no_show: [{ status: "confirmed", label: "Deshacer" }],
};

function AppointmentRow({ appt, tz, when }: { appt: Appointment; tz: string; when: string }) {
  const muted = appt.status === "cancelled" || appt.status === "no_show";
  const phone = appt.customer_phone.replace(/\D/g, "");
  const wa = `https://wa.me/${phone}?text=${encodeURIComponent(
    `Hola ${appt.customer_name.split(" ")[0]}! Te escribo por tu turno de ${appt.service_name} el ${formatDateTime(appt.starts_at, tz)}.`
  )}`;

  return (
    <li className={`grid gap-x-6 gap-y-2 py-5 sm:grid-cols-[9rem_minmax(0,1fr)_auto] ${muted ? "opacity-60" : ""}`}>
      <p className="tabular font-display text-lg leading-tight font-bold first-letter:uppercase">{when}</p>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold">{appt.customer_name}</span>
          <StatusBadge status={appt.status} />
        </p>
        <p className="mt-0.5 text-ink-soft">
          {appt.service_name} · <span className="tabular">{formatPrice(appt.price_cents)}</span>
        </p>
        <p className="mt-1 flex flex-wrap gap-x-4 text-sm">
          <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-lacquer">
            <MessageCircle aria-hidden className="size-4" />
            <span className="tabular">{appt.customer_phone}</span>
          </a>
          {appt.customer_email && (
            <a href={`mailto:${appt.customer_email}`} className="text-ink-soft underline decoration-line-strong">
              {appt.customer_email}
            </a>
          )}
        </p>
        {appt.notes && <p className="mt-2 max-w-[60ch] text-sm text-ink-soft">“{appt.notes}”</p>}
      </div>
      <div className="flex flex-wrap items-start gap-2 sm:justify-end">
        {nextActions[appt.status].map((action) => (
          <form key={action.status} action={setAppointmentStatus}>
            <input type="hidden" name="id" value={appt.id} />
            <input type="hidden" name="status" value={action.status} />
            <button
              type="submit"
              className={
                action.status === "confirmed" && appt.status === "pending"
                  ? "inline-flex items-center rounded-full bg-lacquer px-3.5 py-1.5 text-sm font-semibold text-on-lacquer transition-colors hover:bg-lacquer-strong"
                  : quietButton
              }
            >
              {action.label}
            </button>
          </form>
        ))}
      </div>
    </li>
  );
}
