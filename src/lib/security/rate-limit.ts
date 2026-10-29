import "server-only";
import { headers } from "next/headers";
import { serverEnv } from "@/lib/env";
import { supabaseService } from "@/lib/supabase/admin";
import { hmac } from "./tokens";

export async function clientIp(): Promise<string> {
  const env = serverEnv();
  const h = await headers();
  if (env.TRUST_PROXY_HEADERS) {
    const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return forwarded;
    const real = h.get("x-real-ip")?.trim();
    if (real) return real;
  }
  return "unknown";
}

type Bucket = { name: string; limit: number; windowSeconds: number };

export const buckets = {
  slots: { name: "slots", limit: 120, windowSeconds: 600 },
  booking: { name: "booking", limit: 6, windowSeconds: 3600 },
  manage: { name: "manage", limit: 30, windowSeconds: 600 },
  login: { name: "login", limit: 8, windowSeconds: 900 },
} satisfies Record<string, Bucket>;

/**
 * Devuelve true si la acción está permitida. Si la base no responde, falla
 * cerrado: preferimos rechazar un pedido a dejar la puerta abierta.
 */
export async function rateLimit(bucket: Bucket, subject?: string): Promise<boolean> {
  const env = serverEnv();
  const ip = await clientIp();
  const key = hmac(env.RATE_LIMIT_SECRET, `${bucket.name}:${subject ?? ip}`);
  const { data, error } = await supabaseService().rpc("hit_rate_limit", {
    p_key: key,
    p_limit: bucket.limit,
    p_window_seconds: bucket.windowSeconds,
  });
  if (error) {
    console.error("[rate-limit]", error.message);
    return false;
  }
  return data === true;
}
