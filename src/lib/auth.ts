import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Capa de acceso a datos del panel. Verifica el JWT (getClaims valida la
 * firma) y que el usuario figure en `public.admins`. Se llama en el layout del
 * panel, en cada página y en cada Server Action: nunca confiamos solo en el
 * proxy.
 */
export const requireAdmin = cache(async () => {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) redirect("/admin/login");

  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=forbidden");
  }

  return { supabase, userId, email: (data.claims.email as string | undefined) ?? null };
});
