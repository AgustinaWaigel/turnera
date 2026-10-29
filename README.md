# Turnera

App de turnos online, pensada originalmente para un estudio de uñas y adaptable a cualquier rubro (peluquería, barbería, pestañas, consultorio, clases) **solo cambiando variables de entorno**.

**Stack:** Next.js 16 (App Router) · Supabase (Postgres + Auth) · Tailwind CSS 4 · TypeScript · Zod

## Qué hace

**Para clientas** (`/`)
- Eligen servicio → día → horario → completan nombre y WhatsApp. Sin crear cuenta.
- Al reservar reciben una tarjeta de turno, un botón para avisar por WhatsApp y un link privado para ver o cancelar (`/turno/<token>`).
- Solo se ofrecen horarios realmente libres según duración del servicio, franjas de atención, bloqueos y turnos tomados.

**Para la dueña** (`/admin`)
- **Agenda:** turnos del día, navegación por días y lista de "por confirmar". Confirmar, cancelar, marcar realizado o "no vino". WhatsApp al cliente con un toque.
- **Servicios:** nombre, descripción, duración, precio (vacío = "Consultar"), orden y visibilidad.
- **Horarios:** varias franjas por día (ej. 10–13 y 15–20).
- **Bloqueos:** vacaciones, feriados o ratos sueltos.

## Puesta en marcha

### 1. Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. Aplicá la migración: con la CLI (`npx supabase link` + `npx supabase db push`) o pegando `supabase/migrations/*.sql` en el SQL Editor.
3. (Opcional) Cargá datos de ejemplo con `supabase/seed.sql`.
4. **Authentication → Sign In / Providers:** desactivá *Allow new users to sign up*. El panel no tiene registro: las cuentas se crean a mano.
5. **Authentication → Users → Add user:** creá la cuenta de la dueña (contraseña larga) y después, en el SQL Editor:

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'la-duena@ejemplo.com';
   ```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Completá las claves de Supabase (*Project Settings → API Keys*) y generá el secreto del rate limit:

```bash
openssl rand -base64 48
```

### 3. Correr

```bash
npm install
```

```bash
npm run dev
```

### Desarrollo local con Supabase en Docker

```bash
npx supabase start
```

Aplica la migración y el seed solo. La CLI imprime la URL y las claves para el `.env.local`.

### Deploy (Vercel)

Importá el repo, cargá las mismas variables en *Settings → Environment Variables* y deployá. Poné `NEXT_PUBLIC_SITE_URL` con el dominio final.

## Adaptarla a otro negocio

Todo lo que cambia entre proyectos está en `.env.example`:

| Qué | Variables |
| --- | --- |
| Nombre, frase, dirección, WhatsApp, Instagram | `NEXT_PUBLIC_BUSINESS_*` |
| Color de marca | `NEXT_PUBLIC_BRAND_HUE` (0–360) y `NEXT_PUBLIC_BRAND_CHROMA` |
| Palabras del rubro ("turno", "sesión", "cita"…) | `NEXT_PUBLIC_COPY_*` |
| Idioma y moneda | `NEXT_PUBLIC_LOCALE`, `NEXT_PUBLIC_CURRENCY` |
| Zona horaria, intervalo de turnos, anticipación, ventana de reserva | `BUSINESS_TIMEZONE`, `SLOT_INTERVAL_MINUTES`, `BOOKING_*`, `CANCELLATION_MIN_HOURS` |
| Confirmación manual o automática | `BOOKING_REQUIRES_CONFIRMATION` |

Los servicios, horarios y bloqueos se cargan desde el panel, no del código.

Paleta según el tono: `4` frambuesa · `350` rosa chicle · `25` coral · `60` ocre · `160` verde · `250` azul · `300` violeta. Con `CHROMA` en `0.08` queda apagada y sobria. Toda la paleta (fondos, textos y bordes) se deriva de esos dos números en OKLCH, así el contraste se mantiene.

> Las variables `NEXT_PUBLIC_*` se fijan en el build: si las cambiás, volvé a deployar.

## Seguridad

Ver [SECURITY.md](./SECURITY.md). En resumen:

- **RLS en todas las tablas y cero permisos para `anon`.** La clave pública de Supabase no lee ni escribe nada; ni siquiera se manda al navegador.
- **Las reservas pasan solo por el servidor**, mediante funciones `SECURITY DEFINER` que solo puede ejecutar `service_role`. No se puede saltear la validación llamando a la API de Supabase directo.
- **Sin turnos superpuestos, garantizado por Postgres** (constraint de exclusión), aun con dos reservas simultáneas.
- **El panel verifica que seas admin** en cada página y en cada acción, no solo en el proxy.
- **Rate limiting** de consultas, reservas, links de gestión y login (por IP y por cuenta), con IPs hasheadas con HMAC.
- **CSP estricta con nonce por request**, HSTS, `X-Frame-Options: DENY`, `Referrer-Policy` y `Permissions-Policy`.
- **Validación con Zod** de todo lo que entra; honeypot anti-bots y **Cloudflare Turnstile** opcional.
- **Link de gestión con token de 256 bits**; en la base solo se guarda su hash SHA-256.
- Límite de turnos activos por teléfono y mensajes de error que no filtran información.

## Estructura

```
src/
  app/
    page.tsx               reserva pública
    turno/[token]/         ver o cancelar un turno
    admin/login/           ingreso al panel
    admin/(panel)/         agenda, servicios, horarios, bloqueos
    actions/booking.ts     server actions públicas
    admin/actions.ts       server actions del panel
  components/              UI de reserva y del panel
  lib/
    env.ts                 variables privadas validadas con Zod
    config.ts              configuración pública del negocio
    auth.ts                requireAdmin()
    security/              rate limit, tokens, Turnstile
    supabase/              clientes (con sesión y de servicio)
  proxy.ts                 CSP + refresco de sesión
supabase/
  migrations/              esquema, RLS y funciones
  seed.sql                 datos de ejemplo
```

## Limitaciones conocidas

- Una sola agenda (una profesional). Varias profesionales en paralelo requieren agregar `staff_id` a turnos y horarios.
- Los avisos son por WhatsApp manual (link con el mensaje armado). No hay emails ni recordatorios automáticos.
