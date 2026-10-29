"use server";

import { serverEnv } from "@/lib/env";
import { bookingSchema, slotQuerySchema, tokenSchema } from "@/lib/booking/schemas";
import { formatTime } from "@/lib/format";
import { buckets, rateLimit } from "@/lib/security/rate-limit";
import { createManageToken, sha256 } from "@/lib/security/tokens";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { supabaseService } from "@/lib/supabase/admin";
import type { Slot } from "@/lib/types";

type SlotsResult = { ok: true; slots: Slot[] } | { ok: false; error: string };

export async function getSlots(serviceId: string, date: string): Promise<SlotsResult> {
  const parsed = slotQuerySchema.safeParse({ serviceId, date });
  if (!parsed.success) return { ok: false, error: "Elegí un servicio y un día." };

  if (!(await rateLimit(buckets.slots))) {
    return { ok: false, error: "Demasiadas consultas seguidas. Esperá unos minutos y volvé a probar." };
  }

  const env = serverEnv();
  const { data, error } = await supabaseService().rpc("available_slots", {
    p_service_id: parsed.data.serviceId,
    p_date: parsed.data.date,
    p_tz: env.BUSINESS_TIMEZONE,
    p_step_minutes: env.SLOT_INTERVAL_MINUTES,
    p_min_notice: `${env.BOOKING_MIN_NOTICE_HOURS} hours`,
    p_max_days_ahead: env.BOOKING_MAX_DAYS_AHEAD,
  });
  if (error) {
    console.error("[slots]", error.message);
    return { ok: false, error: "No pudimos cargar los horarios. Probá de nuevo en un momento." };
  }

  const slots = (data as { slot_start: string }[]).map(({ slot_start }) => {
    const iso = new Date(slot_start).toISOString();
    return { iso, label: formatTime(iso, env.BUSINESS_TIMEZONE) };
  });
  return { ok: true, slots };
}

export type BookingState =
  | { status: "idle" }
  | { status: "error"; message: string; code?: string; fields?: Record<string, string> }
  | { status: "booked"; token: string; confirmed: boolean };

const bookingErrors: Record<string, string> = {
  SLOT_UNAVAILABLE: "Ese horario se acaba de ocupar. Elegí otro, por favor.",
  TOO_MANY_ACTIVE: "Ya tenés varios turnos pedidos con este número. Escribinos si necesitás otro.",
  SERVICE_NOT_FOUND: "Ese servicio ya no está disponible. Elegí otro.",
};

export async function bookAppointment(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const raw = {
    serviceId: formData.get("serviceId") ?? "",
    startsAt: formData.get("startsAt") ?? "",
    name: formData.get("name") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    notes: formData.get("notes") ?? "",
    website: formData.get("website") ?? "",
    turnstileToken: formData.get("cf-turnstile-response") ?? undefined,
  };

  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (key === "website") continue;
      fields[key] ??= issue.message;
    }
    if (parsed.error.issues.some((i) => i.path[0] === "website")) {
      // Bot: respondemos genérico, sin dar pistas.
      return { status: "error", message: "No pudimos tomar la reserva." };
    }
    return { status: "error", message: "Revisá los datos marcados.", fields };
  }

  if (!(await verifyTurnstile(parsed.data.turnstileToken))) {
    return { status: "error", message: "No pudimos verificar que no seas un robot. Recargá la página y probá de nuevo." };
  }

  if (!(await rateLimit(buckets.booking))) {
    return { status: "error", message: "Hiciste muchas reservas seguidas. Esperá un rato o escribinos por WhatsApp." };
  }

  const env = serverEnv();
  const { token, hash } = createManageToken();
  const { error } = await supabaseService().rpc("book_appointment", {
    p_service_id: parsed.data.serviceId,
    p_starts_at: parsed.data.startsAt,
    p_customer_name: parsed.data.name,
    p_customer_phone: parsed.data.phone,
    p_customer_email: parsed.data.email,
    p_notes: parsed.data.notes,
    p_cancel_token_hash: hash,
    p_tz: env.BUSINESS_TIMEZONE,
    p_step_minutes: env.SLOT_INTERVAL_MINUTES,
    p_min_notice: `${env.BOOKING_MIN_NOTICE_HOURS} hours`,
    p_max_days_ahead: env.BOOKING_MAX_DAYS_AHEAD,
    p_max_active_per_phone: env.MAX_ACTIVE_BOOKINGS_PER_PHONE,
    p_initial_status: env.BOOKING_REQUIRES_CONFIRMATION ? "pending" : "confirmed",
  });

  if (error) {
    const known = bookingErrors[error.message];
    if (!known) console.error("[booking]", error.message);
    return {
      status: "error",
      code: known ? error.message : undefined,
      message: known ?? "No pudimos tomar la reserva. Probá de nuevo en un momento.",
    };
  }

  return { status: "booked", token, confirmed: !env.BOOKING_REQUIRES_CONFIRMATION };
}

export type CancelState = { status: "idle" } | { status: "error"; message: string } | { status: "cancelled" };

const cancelErrors: Record<string, string> = {
  NOT_FOUND: "No encontramos este turno.",
  NOT_CANCELLABLE: "Este turno ya no se puede cancelar.",
  TOO_LATE: "Falta muy poco para el turno: para cancelarlo escribinos por WhatsApp.",
};

export async function cancelAppointment(_prev: CancelState, formData: FormData): Promise<CancelState> {
  const token = tokenSchema.safeParse(formData.get("token"));
  if (!token.success) return { status: "error", message: cancelErrors.NOT_FOUND };

  if (!(await rateLimit(buckets.manage))) {
    return { status: "error", message: "Demasiados intentos. Esperá unos minutos." };
  }

  const env = serverEnv();
  const { error } = await supabaseService().rpc("cancel_appointment_by_token", {
    p_cancel_token_hash: sha256(token.data),
    p_min_notice: `${env.CANCELLATION_MIN_HOURS} hours`,
  });
  if (error) {
    const known = cancelErrors[error.message];
    if (!known) console.error("[cancel]", error.message);
    return { status: "error", message: known ?? "No pudimos cancelar el turno. Probá de nuevo." };
  }
  return { status: "cancelled" };
}
