import { business } from "@/lib/config";

/** "YYYY-MM-DD" del día actual en la zona horaria del negocio. */
export function todayIn(timeZone: string, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function weekdayOf(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function dateOnly(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function dayParts(date: string) {
  const dt = dateOnly(date);
  const fmt = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(business.locale, { timeZone: "UTC", ...o }).format(dt).replace(".", "");
  return {
    date,
    weekday: fmt({ weekday: "short" }),
    day: fmt({ day: "numeric" }),
    month: fmt({ month: "short" }),
  };
}

export function formatLongDate(date: string) {
  return new Intl.DateTimeFormat(business.locale, {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(dateOnly(date));
}

export function formatTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat(business.locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function localDateOf(iso: string, timeZone: string) {
  return todayIn(timeZone, new Date(iso));
}

export function formatDateTime(iso: string, timeZone: string) {
  return `${formatLongDate(localDateOf(iso, timeZone))} · ${formatTime(iso, timeZone)} h`;
}

export function formatPrice(cents: number | null) {
  if (cents === null) return "Consultar";
  return new Intl.NumberFormat(business.locale, {
    style: "currency",
    currency: business.currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Convierte "YYYY-MM-DD" + "HH:MM" locales del negocio a un instante UTC. */
export function zonedToUtc(date: string, time: string, timeZone: string) {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  // Diferencia entre lo que marca el reloj local y UTC para ese instante.
  const offsetAt = (ts: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date(ts));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) - ts;
  };
  const first = guess - offsetAt(guess);
  return new Date(guess - offsetAt(first));
}
