"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { isIsoDate, zonedToUtc } from "@/lib/format";

export type ActionResult = { ok?: boolean; error?: string };

const text = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max));

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida");

// --- Turnos ------------------------------------------------------------------

const statusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["confirmed", "cancelled", "completed", "no_show", "pending"]),
});

export async function setAppointmentStatus(formData: FormData) {
  const { supabase } = await requireAdmin();
  const parsed = statusSchema.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) return;
  const { error } = await supabase.from("appointments").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) console.error("[admin:status]", error.message);
  revalidatePath("/admin");
}

// --- Servicios ---------------------------------------------------------------

const serviceSchema = z.object({
  id: z.union([z.literal(""), z.uuid()]),
  name: text(80).pipe(z.string().min(2, "El nombre es muy corto")),
  description: text(300),
  duration_minutes: z.coerce.number().int().min(5, "Mínimo 5 minutos").max(480, "Máximo 8 horas"),
  price: z
    .string()
    .trim()
    .transform((s) => s.replace(/\./g, "").replace(",", "."))
    .pipe(z.union([z.literal(""), z.string().regex(/^\d{1,9}(\.\d{1,2})?$/, "Precio inválido")])),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  active: z.boolean(),
});

export async function saveService(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = serviceSchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    duration_minutes: formData.get("duration_minutes"),
    price: formData.get("price") ?? "",
    sort_order: formData.get("sort_order") || 0,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { id, price, description, ...rest } = parsed.data;
  const row = {
    ...rest,
    description: description || null,
    price_cents: price === "" ? null : Math.round(Number(price) * 100),
  };
  const { error } = id
    ? await supabase.from("services").update(row).eq("id", id)
    : await supabase.from("services").insert(row);
  if (error) {
    console.error("[admin:service]", error.message);
    return { error: "No se pudo guardar el servicio." };
  }
  revalidatePath("/admin/servicios");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteService(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  // Los turnos guardan una copia del nombre y precio, así que borrar es seguro.
  const { error } = await supabase.from("services").delete().eq("id", id.data);
  if (error) console.error("[admin:service:delete]", error.message);
  revalidatePath("/admin/servicios");
  revalidatePath("/");
}

// --- Horarios ----------------------------------------------------------------

const hourSchema = z
  .object({ weekday: z.coerce.number().int().min(0).max(6), start_time: time, end_time: time })
  .refine((v) => v.end_time > v.start_time, "La hora de cierre tiene que ser posterior a la de apertura");

export async function addWorkingHour(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = hourSchema.safeParse({
    weekday: formData.get("weekday"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { data: existing } = await supabase
    .from("working_hours")
    .select("start_time, end_time")
    .eq("weekday", parsed.data.weekday);
  const overlaps = (existing ?? []).some(
    (h) => parsed.data.start_time < String(h.end_time).slice(0, 5) && parsed.data.end_time > String(h.start_time).slice(0, 5)
  );
  if (overlaps) return { error: "Esa franja se superpone con otra del mismo día." };

  const { error } = await supabase.from("working_hours").insert(parsed.data);
  if (error) return { error: "No se pudo guardar la franja." };
  revalidatePath("/admin/horarios");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteWorkingHour(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  await supabase.from("working_hours").delete().eq("id", id.data);
  revalidatePath("/admin/horarios");
  revalidatePath("/");
}

// --- Bloqueos ----------------------------------------------------------------

const timeOffSchema = z
  .object({
    from_date: z.string().refine(isIsoDate, "Fecha inválida"),
    from_time: z.union([z.literal(""), time]),
    to_date: z.string().refine(isIsoDate, "Fecha inválida"),
    to_time: z.union([z.literal(""), time]),
    reason: text(120),
  })
  .transform((v) => ({ ...v, from_time: v.from_time || "00:00", to_time: v.to_time || "24:00" }));

export async function addTimeOff(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = timeOffSchema.safeParse({
    from_date: formData.get("from_date"),
    from_time: formData.get("from_time") ?? "",
    to_date: formData.get("to_date") || formData.get("from_date"),
    to_time: formData.get("to_time") ?? "",
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const tz = serverEnv().BUSINESS_TIMEZONE;
  const v = parsed.data;
  const starts = zonedToUtc(v.from_date, v.from_time, tz);
  const ends =
    v.to_time === "24:00"
      ? new Date(zonedToUtc(v.to_date, "00:00", tz).getTime() + 864e5)
      : zonedToUtc(v.to_date, v.to_time, tz);
  if (ends <= starts) return { error: "El final del bloqueo tiene que ser posterior al inicio." };

  const { error } = await supabase
    .from("time_off")
    .insert({ starts_at: starts.toISOString(), ends_at: ends.toISOString(), reason: v.reason || null });
  if (error) return { error: "No se pudo guardar el bloqueo." };
  revalidatePath("/admin/bloqueos");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteTimeOff(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  await supabase.from("time_off").delete().eq("id", id.data);
  revalidatePath("/admin/bloqueos");
  revalidatePath("/");
}
