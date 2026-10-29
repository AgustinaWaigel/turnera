import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

let client: SupabaseClient | null = null;

/**
 * Cliente con la clave secreta. Saltea RLS, así que vive solo en el servidor
 * (`server-only` rompe el build si alguien lo importa desde el cliente) y se
 * usa únicamente para llamar a las funciones de reserva.
 */
export function supabaseService(): SupabaseClient {
  if (client) return client;
  const env = serverEnv();
  client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
