# Modelo de seguridad

## Capas

| Capa | Qué protege |
| --- | --- |
| **Postgres / RLS** | `anon` no tiene permisos en ninguna tabla ni función. `authenticated` solo ve datos si figura en `public.admins` (`is_admin()`), y en `appointments` solo puede leer y cambiar `status`. RLS está forzado (`force row level security`). |
| **Funciones `SECURITY DEFINER`** | `available_slots`, `book_appointment`, `get_appointment_by_token`, `cancel_appointment_by_token` y `hit_rate_limit` tienen `search_path = ''` y solo las puede ejecutar `service_role`. `book_appointment` vuelve a validar el horario contra la agenda real, así que no se puede reservar fuera de horario, en un bloqueo, en el pasado ni fuera de la grilla. |
| **Constraint de exclusión** | `appointments_no_overlap` impide dos turnos activos superpuestos, incluso con requests simultáneos. |
| **Servidor Next.js** | La clave secreta vive en `src/lib/supabase/admin.ts` con `import "server-only"`. Las variables de entorno se validan con Zod al arrancar. Todas las Server Actions validan su entrada con Zod; Next.js verifica `Origin` contra `Host` (CSRF) y el body está limitado a 32 KB. |
| **Panel** | `requireAdmin()` valida la firma del JWT (`getClaims`) y la pertenencia a `admins` en el layout, en cada página y en cada acción. El proxy solo hace una redirección optimista. El registro de usuarios está desactivado. |
| **Abuso** | Rate limit de ventana fija en Postgres (falla cerrado). Login limitado por IP y por email. Honeypot y Turnstile opcional. Máximo de turnos activos por teléfono. |
| **Navegador** | CSP con nonce por request y `strict-dynamic`, sin `unsafe-inline`; `frame-ancestors 'none'`, `base-uri 'none'`, `form-action 'self'`. HSTS con preload, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP. `/turno/*` y `/admin/*` van con `no-store` y `noindex`. |
| **Datos personales** | El link de gestión usa un token aleatorio de 256 bits y en la base solo se guarda su SHA-256. Las IPs del rate limit se guardan hasheadas con HMAC. La página de gestión muestra solo lo mínimo (sin teléfono ni email). |

## Checklist de producción

- [ ] Registro desactivado en Supabase Auth y contraseña fuerte para la cuenta admin (ideal: activar MFA).
- [ ] `SUPABASE_SECRET_KEY` y `RATE_LIMIT_SECRET` cargadas solo en el entorno de producción, nunca con prefijo `NEXT_PUBLIC_`.
- [ ] Turnstile configurado (`NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`).
- [ ] `TRUST_PROXY_HEADERS=true` solo detrás de un proxy confiable (Vercel, Cloudflare).
- [ ] `NEXT_PUBLIC_SITE_URL` con el dominio HTTPS final.
- [ ] Backups automáticos activados en Supabase.

## Reportar una vulnerabilidad

Escribí en privado a la persona que mantiene el repositorio. No abras un issue público.
