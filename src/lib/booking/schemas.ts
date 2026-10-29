import { z } from "zod";
import { isIsoDate } from "@/lib/format";

const clean = (max: number) =>
  z
    .string()
    .transform((s) => s.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max));

export const slotQuerySchema = z.object({
  serviceId: z.uuid(),
  date: z.string().refine(isIsoDate, "Fecha inválida"),
});

export const bookingSchema = z.object({
  serviceId: z.uuid({ message: "Elegí un servicio." }),
  startsAt: z.iso.datetime({ offset: true, message: "Elegí un horario." }),
  name: clean(80).pipe(z.string().min(2, "Escribí tu nombre.")),
  phone: z
    .string()
    .max(30)
    .transform((s) => {
      const plus = s.trim().startsWith("+") ? "+" : "";
      return plus + s.replace(/\D/g, "");
    })
    .pipe(z.string().regex(/^\+?[0-9]{8,20}$/, "Revisá el número: tiene que tener código de área.")),
  email: z
    .union([z.literal(""), z.email({ message: "Revisá el email." }).max(254)])
    .transform((s) => s.toLowerCase()),
  notes: clean(500),
  // Honeypot: un campo invisible que solo completan los bots.
  website: z.string().max(0),
  turnstileToken: z.string().max(2048).optional(),
});

export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
