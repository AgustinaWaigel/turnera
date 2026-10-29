import "server-only";
import { serverEnv } from "@/lib/env";
import { clientIp } from "./rate-limit";

export function turnstileEnabled() {
  const env = serverEnv();
  return Boolean(env.TURNSTILE_SECRET_KEY && env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

/** Verifica el captcha de Cloudflare Turnstile, si está configurado. */
export async function verifyTurnstile(token: string | null | undefined): Promise<boolean> {
  const env = serverEnv();
  if (!turnstileEnabled()) return true;
  if (!token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY!,
      response: token,
      remoteip: await clientIp(),
    });
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}
