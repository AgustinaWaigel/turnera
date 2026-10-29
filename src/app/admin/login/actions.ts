"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { buckets, rateLimit } from "@/lib/security/rate-limit";
import { supabaseServer } from "@/lib/supabase/server";

const schema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(200),
});

export type LoginState = { error?: string; email?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const generic = "Email o contraseña incorrectos.";
  const email = String(formData.get("email") ?? "").slice(0, 254);
  if (!parsed.success) return { error: generic, email };

  // Límite por IP y por cuenta, para frenar fuerza bruta y credential stuffing.
  const okIp = await rateLimit(buckets.login);
  const okUser = await rateLimit(buckets.login, `user:${parsed.data.email.toLowerCase()}`);
  if (!okIp || !okUser) return { error: "Demasiados intentos. Esperá 15 minutos y volvé a probar.", email };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: generic, email };

  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return { error: generic, email };
  }

  redirect("/admin");
}

export async function logout() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
