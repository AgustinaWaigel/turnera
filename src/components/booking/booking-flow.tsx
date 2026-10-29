"use client";

import { useActionState, useId, useRef, useState, useTransition } from "react";
import { bookAppointment, getSlots, type BookingState } from "@/app/actions/booking";
import { business } from "@/lib/config";
import { formatDuration, formatLongDate, formatPrice } from "@/lib/format";
import type { Day, Service, Slot } from "@/lib/types";
import { ArrowRight } from "@/components/ui/icons";
import { Field } from "@/components/ui/field";
import { AppointmentCard } from "./appointment-card";

type Props = {
  services: Service[];
  days: Day[];
  captchaSiteKey: string | null;
};

type SlotsView =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; slots: Slot[] }
  | { state: "error"; message: string };

const initial: BookingState = { status: "idle" };

export function BookingFlow({ services, days, captchaSiteKey }: Props) {
  const [serviceId, setServiceId] = useState<string | null>(services.length === 1 ? services[0].id : null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [slotsView, setSlotsView] = useState<SlotsView>({ state: "idle" });
  const [, startTransition] = useTransition();
  const request = useRef(0);
  const service = services.find((s) => s.id === serviceId) ?? null;

  function loadSlots(nextService: string | null, nextDate: string | null, keepView = false) {
    if (!nextService || !nextDate) return;
    const id = ++request.current;
    setSlot(null);
    if (!keepView) setSlotsView({ state: "loading" });
    startTransition(async () => {
      const res = await getSlots(nextService, nextDate);
      if (id !== request.current) return;
      setSlotsView(res.ok ? { state: "ready", slots: res.slots } : { state: "error", message: res.error });
    });
  }

  const [result, formAction, submitting] = useActionState(async (prev: BookingState, formData: FormData) => {
    const res = await bookAppointment(prev, formData);
    // Si el horario se ocupó mientras completaba el formulario, refrescamos.
    if (res.status === "error" && res.code === "SLOT_UNAVAILABLE") loadSlots(serviceId, date, true);
    return res;
  }, initial);
  const [values, setValues] = useState({ name: "", phone: "", email: "", notes: "" });

  if (result.status === "booked" && service && date && slot) {
    return (
      <AppointmentCard
        token={result.token}
        confirmed={result.confirmed}
        serviceName={service.name}
        priceCents={service.price_cents}
        durationMinutes={service.duration_minutes}
        dateLabel={formatLongDate(date)}
        timeLabel={slot.label}
        customerName={values.name}
      />
    );
  }

  const fieldErrors = result.status === "error" ? result.fields ?? {} : {};

  return (
    <form action={formAction} className="flex flex-col gap-14" noValidate>
      <Step title="¿Qué te hacés?" hint={services.length ? undefined : "Todavía no hay servicios cargados."}>
        <fieldset>
          <legend className="sr-only">Servicio</legend>
          <ul className="-mx-3 flex flex-col">
            {services.map((s) => (
              <li key={s.id}>
                <label className="group relative flex cursor-pointer items-start gap-4 rounded-2xl px-3 py-4 transition-colors duration-200 hover:bg-paper has-checked:bg-lacquer-wash">
                  <input
                    type="radio"
                    name="serviceId"
                    value={s.id}
                    checked={serviceId === s.id}
                    onChange={() => {
                      setServiceId(s.id);
                      loadSlots(s.id, date);
                    }}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className="mt-1 size-4 shrink-0 rounded-full border-2 border-line-strong transition-colors duration-200 peer-checked:border-lacquer peer-checked:bg-lacquer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lacquer"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-3">
                      <span className="font-display text-lg leading-tight font-semibold">{s.name}</span>
                      <span aria-hidden className="mb-1 hidden flex-1 border-b border-dotted border-line-strong sm:block" />
                      <span className="tabular ml-auto shrink-0 font-display text-lg font-semibold">
                        {formatPrice(s.price_cents)}
                      </span>
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-3 text-sm text-ink-soft">
                      <span className="tabular">{formatDuration(s.duration_minutes)}</span>
                      {s.description && <span className="max-w-[52ch]">{s.description}</span>}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        {fieldErrors.serviceId && <ErrorText>{fieldErrors.serviceId}</ErrorText>}
      </Step>

      <Step title="¿Qué día?" hint={days.length ? undefined : "No hay días disponibles por ahora. Escribinos para coordinar."}>
        <fieldset>
          <legend className="sr-only">Día</legend>
          <div className="no-scrollbar -mx-5 overflow-x-auto px-5 pt-2 pb-3 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
            <ul className="flex w-max gap-2.5 lg:w-auto lg:flex-wrap">
              {days.map((d) => (
                <li key={d.date}>
                  <label className="block cursor-pointer">
                    <input
                      type="radio"
                      name="date"
                      value={d.date}
                      checked={date === d.date}
                      onChange={() => {
                        setDate(d.date);
                        loadSlots(serviceId, d.date);
                      }}
                      disabled={!serviceId}
                      className="peer sr-only"
                    />
                    <span className="tip flex h-28 w-[3.75rem] flex-col items-center justify-end border border-line bg-paper pb-3 hover:border-line-strong peer-disabled:cursor-not-allowed peer-disabled:opacity-45">
                      <span className="text-xs font-medium capitalize">{d.weekday}</span>
                      <span className="tabular font-display text-2xl leading-none font-bold">{d.day}</span>
                      <span className="mt-0.5 text-[0.7rem] capitalize opacity-80">{d.month}</span>
                    </span>
                    <span className="sr-only">{formatLongDate(d.date)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </fieldset>
        {!serviceId && days.length > 0 && <p className="text-sm text-ink-soft">Primero elegí el servicio.</p>}
      </Step>

      <Step title="¿A qué hora?">
        <SlotPicker view={slotsView} selected={slot} onSelect={setSlot} waiting={!date} />
        <input type="hidden" name="startsAt" value={slot?.iso ?? ""} />
        {fieldErrors.startsAt && <ErrorText>{fieldErrors.startsAt}</ErrorText>}
      </Step>

      <Step title="Tus datos">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Nombre y apellido"
            name="name"
            autoComplete="name"
            required
            maxLength={80}
            value={values.name}
            onChange={(v) => setValues((s) => ({ ...s, name: v }))}
            error={fieldErrors.name}
          />
          <Field
            label="WhatsApp"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            maxLength={30}
            placeholder="11 2345 6789"
            hint="Te escribimos por acá si hay algún cambio."
            value={values.phone}
            onChange={(v) => setValues((s) => ({ ...s, phone: v }))}
            error={fieldErrors.phone}
          />
          <Field
            label="Email"
            optional
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={values.email}
            onChange={(v) => setValues((s) => ({ ...s, email: v }))}
            error={fieldErrors.email}
          />
          <Field
            label="Algo que debamos saber"
            optional
            name="notes"
            multiline
            maxLength={500}
            placeholder="Diseño que querés, alergias, si venís con esmalte…"
            value={values.notes}
            onChange={(v) => setValues((s) => ({ ...s, notes: v }))}
            error={fieldErrors.notes}
            className="sm:col-span-2"
          />
        </div>

        {/* Honeypot: invisible para personas, tentador para bots. */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Sitio web
            <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>

        {captchaSiteKey && <div className="cf-turnstile mt-6" data-sitekey={captchaSiteKey} data-language="es" />}
      </Step>

      <div className="border-t border-line pt-8">
        <Summary service={service} date={date} slot={slot} />
        {result.status === "error" && (
          <p role="alert" className="mt-5 rounded-xl bg-danger-wash px-4 py-3 text-sm font-medium text-danger">
            {result.message}
          </p>
        )}
        <button
          type="submit"
          disabled={!service || !slot || submitting}
          className="group mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-lacquer px-7 py-4 font-display text-lg font-semibold text-on-lacquer shadow-[0_12px_24px_-14px_var(--lacquer-strong)] transition-[background-color,transform,opacity] duration-200 hover:bg-lacquer-strong active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {submitting ? "Reservando…" : `Pedir ${business.copy.appointment}`}
          {!submitting && (
            <ArrowRight aria-hidden className="size-5 transition-transform duration-300 ease-out-expo group-hover:translate-x-1" />
          )}
        </button>
      </div>
    </form>
  );
}

function Step({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="relative flex flex-col gap-4">
      <h2 id={id} className="font-display text-[1.75rem] leading-tight font-bold tracking-[-0.02em] sm:text-3xl">
        {title}
      </h2>
      {hint && <p className="text-ink-soft">{hint}</p>}
      {children}
    </section>
  );
}

function SlotPicker({
  view,
  selected,
  onSelect,
  waiting,
}: {
  view: SlotsView;
  selected: Slot | null;
  onSelect: (s: Slot) => void;
  waiting: boolean;
}) {
  if (waiting || view.state === "idle") {
    return <p className="text-ink-soft">Elegí un día para ver los horarios libres.</p>;
  }
  if (view.state === "loading") {
    return (
      <div aria-live="polite" className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        <span className="sr-only">Buscando horarios…</span>
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className="h-12 animate-pulse rounded-xl bg-line/60" />
        ))}
      </div>
    );
  }
  if (view.state === "error") {
    return (
      <p role="alert" className="text-danger">
        {view.message}
      </p>
    );
  }
  if (!view.slots.length) {
    return <p className="text-ink-soft">Ese día ya está completo. Probá con otro.</p>;
  }
  return (
    <fieldset>
      <legend className="sr-only">Horario</legend>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {view.slots.map((s) => (
          <li key={s.iso}>
            <label className="block cursor-pointer">
              <input
                type="radio"
                name="slot"
                value={s.iso}
                checked={selected?.iso === s.iso}
                onChange={() => onSelect(s)}
                className="peer sr-only"
              />
              <span className="tabular flex h-12 items-center justify-center rounded-xl border border-line bg-paper font-medium transition-colors duration-200 hover:border-line-strong peer-checked:border-lacquer peer-checked:bg-lacquer peer-checked:text-on-lacquer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lacquer">
                {s.label}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

function Summary({ service, date, slot }: { service: Service | null; date: string | null; slot: Slot | null }) {
  if (!service || !date || !slot) {
    return <p className="text-ink-soft">Elegí servicio, día y horario para pedir tu {business.copy.appointment}.</p>;
  }
  return (
    <p className="text-lg leading-snug">
      <span className="font-semibold">{service.name}</span>
      <span className="text-ink-soft"> · </span>
      <span className="first-letter:uppercase">{formatLongDate(date)}</span>
      <span className="text-ink-soft"> a las </span>
      <span className="tabular font-semibold">{slot.label} h</span>
    </p>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-danger">{children}</p>;
}
