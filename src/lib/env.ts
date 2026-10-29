import "server-only";
import { z } from "zod";

/**
 * Variables de entorno privadas. Se validan al primer uso: si falta algo o
 * tiene un formato inválido, el servidor falla con un mensaje claro en vez de
 * comportarse de forma impredecible.
 */
const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SUPABASE_SECRET_KEY: z.string().min(20),
  RATE_LIMIT_SECRET: z.string().min(32, "RATE_LIMIT_SECRET debe tener al menos 32 caracteres"),

  BUSINESS_TIMEZONE: z.string().default("America/Argentina/Buenos_Aires"),
  SLOT_INTERVAL_MINUTES: z.coerce.number().int().min(5).max(240).default(30),
  BOOKING_MIN_NOTICE_HOURS: z.coerce.number().min(0).max(720).default(2),
  BOOKING_MAX_DAYS_AHEAD: z.coerce.number().int().min(1).max(365).default(45),
  CANCELLATION_MIN_HOURS: z.coerce.number().min(0).max(720).default(24),
  MAX_ACTIVE_BOOKINGS_PER_PHONE: z.coerce.number().int().min(1).max(20).default(3),
  BOOKING_REQUIRES_CONFIRMATION: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),

  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  TRUST_PROXY_HEADERS: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  · ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Variables de entorno inválidas:\n${issues}`);
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: parsed.data.BUSINESS_TIMEZONE });
  } catch {
    throw new Error(`BUSINESS_TIMEZONE inválida: ${parsed.data.BUSINESS_TIMEZONE}`);
  }
  cached = parsed.data;
  return cached;
}
