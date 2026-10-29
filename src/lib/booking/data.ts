import "server-only";
import { serverEnv } from "@/lib/env";
import { addDays, dayParts, todayIn, weekdayOf, zonedToUtc } from "@/lib/format";
import { supabaseService } from "@/lib/supabase/admin";
import type { Day, Service } from "@/lib/types";

export async function getActiveServices(): Promise<Service[]> {
  const { data, error } = await supabaseService()
    .from("services")
    .select("id, name, description, duration_minutes, price_cents, active, sort_order")
    .eq("active", true)
    .order("sort_order")
    .order("name");
  if (error) throw new Error("No se pudieron cargar los servicios");
  return data as Service[];
}

/** Días con agenda abierta dentro de la ventana de reservas. */
export async function getBookableDays(limit = 28): Promise<Day[]> {
  const env = serverEnv();
  const db = supabaseService();
  const today = todayIn(env.BUSINESS_TIMEZONE);
  const last = addDays(today, env.BOOKING_MAX_DAYS_AHEAD);

  const [{ data: hours, error }, { data: off }] = await Promise.all([
    db.from("working_hours").select("weekday"),
    db
      .from("time_off")
      .select("starts_at, ends_at")
      .gte("ends_at", new Date().toISOString())
      .lte("starts_at", new Date(Date.now() + (env.BOOKING_MAX_DAYS_AHEAD + 2) * 864e5).toISOString()),
  ]);
  if (error) throw new Error("No se pudo cargar la agenda");

  const openWeekdays = new Set((hours ?? []).map((h) => h.weekday as number));
  const blocks = (off ?? []).map((b) => [Date.parse(b.starts_at), Date.parse(b.ends_at)] as const);

  const days: Day[] = [];
  for (let date = today; date <= last && days.length < limit; date = addDays(date, 1)) {
    if (!openWeekdays.has(weekdayOf(date))) continue;
    // Descarta días completamente bloqueados (vacaciones, feriados).
    const start = zonedToUtc(date, "00:00", env.BUSINESS_TIMEZONE).getTime();
    const end = zonedToUtc(addDays(date, 1), "00:00", env.BUSINESS_TIMEZONE).getTime();
    if (blocks.some(([s, e]) => s <= start && e >= end)) continue;
    days.push(dayParts(date));
  }
  return days;
}
