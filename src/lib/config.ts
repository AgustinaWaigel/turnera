/**
 * Configuración pública del negocio. Todo sale de variables NEXT_PUBLIC_*, así
 * el mismo código sirve para una manicura, una barbería o un consultorio:
 * cambiás el .env y listo.
 */
function str(value: string | undefined, fallback: string) {
  const v = value?.trim();
  return v ? v : fallback;
}

function num(value: string | undefined, fallback: number, min: number, max: number) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

/** Solo dígitos: evita que un valor raro termine inyectado en un link. */
function digits(value: string | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

/** Usuario de Instagram sin @ ni caracteres fuera de los permitidos. */
function handle(value: string | undefined) {
  return (value ?? "").replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "");
}

export const business = {
  name: str(process.env.NEXT_PUBLIC_BUSINESS_NAME, "Estudio de Uñas"),
  owner: str(process.env.NEXT_PUBLIC_BUSINESS_OWNER, ""),
  tagline: str(
    process.env.NEXT_PUBLIC_BUSINESS_TAGLINE,
    "Semipermanente, kapping y esculpidas. Reservá tu turno en un minuto."
  ),
  address: str(process.env.NEXT_PUBLIC_BUSINESS_ADDRESS, ""),
  mapsUrl: str(process.env.NEXT_PUBLIC_BUSINESS_MAPS_URL, ""),
  whatsapp: digits(process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP),
  instagram: handle(process.env.NEXT_PUBLIC_BUSINESS_INSTAGRAM),
  siteUrl: str(process.env.NEXT_PUBLIC_SITE_URL, "http://localhost:3000").replace(/\/$/, ""),
  locale: str(process.env.NEXT_PUBLIC_LOCALE, "es-AR"),
  currency: str(process.env.NEXT_PUBLIC_CURRENCY, "ARS"),
  /** Palabras que cambian según el rubro. */
  copy: {
    appointment: str(process.env.NEXT_PUBLIC_COPY_APPOINTMENT, "turno"),
    professional: str(process.env.NEXT_PUBLIC_COPY_PROFESSIONAL, "tu manicura"),
    policy: str(
      process.env.NEXT_PUBLIC_COPY_POLICY,
      "Si no podés venir, cancelá con al menos 24 h de anticipación así otra persona puede usar el horario."
    ),
  },
  theme: {
    hue: num(process.env.NEXT_PUBLIC_BRAND_HUE, 4, 0, 360),
    chroma: num(process.env.NEXT_PUBLIC_BRAND_CHROMA, 0.19, 0, 0.37),
  },
} as const;

export function whatsappLink(message?: string) {
  if (!business.whatsapp) return null;
  const q = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${business.whatsapp}${q}`;
}
