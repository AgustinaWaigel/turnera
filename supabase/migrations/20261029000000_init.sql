-- =============================================================================
-- Turnera · esquema inicial
--
-- Modelo de seguridad:
--   * Ninguna tabla es accesible para el rol `anon`. La clave pública de
--     Supabase, si se filtra, no permite leer ni escribir nada.
--   * El panel usa el rol `authenticated` y RLS: solo los usuarios presentes en
--     `public.admins` pueden ver o modificar datos.
--   * Las reservas públicas pasan por funciones SECURITY DEFINER que solo puede
--     ejecutar `service_role` (el servidor de Next.js). Así el rate limit, el
--     captcha y la validación del servidor no se pueden saltear llamando a la
--     API de Supabase directamente.
--   * Un constraint de exclusión impide, a nivel base de datos, que dos turnos
--     activos se superpongan (sin condiciones de carrera).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------

create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.services (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(name) between 2 and 80),
  description      text check (char_length(description) <= 300),
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  price_cents      bigint check (price_cents >= 0),
  active           boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Franjas semanales de atención. Puede haber varias por día (ej. 9–13 y 15–20).
-- weekday: 0 = domingo … 6 = sábado (igual que extract(dow)).
create table public.working_hours (
  id         uuid primary key default gen_random_uuid(),
  weekday    smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time   time not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

-- Bloqueos puntuales: vacaciones, feriados, trámites.
create table public.time_off (
  id         uuid primary key default gen_random_uuid(),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text check (char_length(reason) <= 120),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create type public.appointment_status as enum (
  'pending', 'confirmed', 'cancelled', 'completed', 'no_show'
);

create table public.appointments (
  id                uuid primary key default gen_random_uuid(),
  service_id        uuid references public.services (id) on delete set null,
  -- Copia del servicio al momento de reservar: si después cambia el precio
  -- o el nombre, el turno conserva lo que se acordó.
  service_name      text not null,
  price_cents       bigint,
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  customer_name     text not null check (char_length(customer_name) between 2 and 80),
  customer_phone    text not null check (customer_phone ~ '^\+?[0-9]{6,20}$'),
  customer_email    text check (
    customer_email is null
    or (char_length(customer_email) <= 254 and customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  ),
  notes             text check (char_length(notes) <= 500),
  status            public.appointment_status not null default 'pending',
  -- Solo guardamos el hash SHA-256 del token del link de gestión.
  cancel_token_hash text not null unique check (char_length(cancel_token_hash) = 64),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (ends_at > starts_at),
  constraint appointments_no_overlap exclude using gist (
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending', 'confirmed'))
);

create index appointments_starts_at_idx on public.appointments (starts_at);
create index appointments_phone_idx on public.appointments (customer_phone);
create index time_off_range_idx on public.time_off using gist (tstzrange(starts_at, ends_at, '[)'));

-- Rate limiting de ventana fija. La clave llega ya hasheada (HMAC) desde el
-- servidor: nunca se guardan IPs en claro.
create table public.rate_limits (
  key          text not null,
  window_start timestamptz not null,
  hits         integer not null default 1,
  primary key (key, window_start)
);

-- -----------------------------------------------------------------------------
-- updated_at automático
-- -----------------------------------------------------------------------------

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger services_touch before update on public.services
  for each row execute function public.touch_updated_at();
create trigger appointments_touch before update on public.appointments
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Autorización
-- -----------------------------------------------------------------------------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- Privilegios: cerramos todo y abrimos lo mínimo.
-- -----------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant execute on function public.is_admin() to authenticated;

grant select on public.admins to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.working_hours to authenticated;
grant select, insert, update, delete on public.time_off to authenticated;
-- El panel puede ver turnos y cambiar su estado, nada más.
grant select on public.appointments to authenticated;
grant update (status) on public.appointments to authenticated;

alter table public.admins        enable row level security;
alter table public.services      enable row level security;
alter table public.working_hours enable row level security;
alter table public.time_off      enable row level security;
alter table public.appointments  enable row level security;
alter table public.rate_limits   enable row level security;

alter table public.admins        force row level security;
alter table public.services      force row level security;
alter table public.working_hours force row level security;
alter table public.time_off      force row level security;
alter table public.appointments  force row level security;
alter table public.rate_limits   force row level security;

create policy "admins: ver la propia fila" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

create policy "services: admin" on public.services
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "working_hours: admin" on public.working_hours
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "time_off: admin" on public.time_off
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "appointments: admin lee" on public.appointments
  for select to authenticated using ((select public.is_admin()));

create policy "appointments: admin actualiza" on public.appointments
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- rate_limits no tiene políticas: solo service_role (que saltea RLS) la toca.

-- -----------------------------------------------------------------------------
-- Funciones de reserva (solo service_role)
-- -----------------------------------------------------------------------------

-- Horarios libres de un servicio para un día local del negocio.
create function public.available_slots(
  p_service_id       uuid,
  p_date             date,
  p_tz               text,
  p_step_minutes     integer,
  p_min_notice       interval,
  p_max_days_ahead   integer
) returns table (slot_start timestamptz)
language sql stable security definer set search_path = '' as $$
  with svc as (
    select make_interval(mins => s.duration_minutes) as duration
    from public.services s
    where s.id = p_service_id and s.active
  ),
  bounds as (
    select (now() at time zone p_tz)::date as today
  ),
  windows as (
    select
      (p_date + wh.start_time) at time zone p_tz as opens,
      (p_date + wh.end_time)   at time zone p_tz as closes
    from public.working_hours wh, bounds b
    where wh.weekday = extract(dow from p_date)
      and p_date between b.today and b.today + p_max_days_ahead
      and p_step_minutes between 5 and 240
  ),
  candidates as (
    select gs as slot_start, gs + svc.duration as slot_end
    from windows w
    cross join svc
    cross join lateral generate_series(
      w.opens, w.closes - svc.duration, make_interval(mins => p_step_minutes)
    ) gs
  )
  select c.slot_start
  from candidates c
  where c.slot_start >= now() + p_min_notice
    and not exists (
      select 1 from public.appointments a
      where a.status in ('pending', 'confirmed')
        and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(c.slot_start, c.slot_end, '[)')
    )
    and not exists (
      select 1 from public.time_off t
      where tstzrange(t.starts_at, t.ends_at, '[)') && tstzrange(c.slot_start, c.slot_end, '[)')
    )
  order by c.slot_start;
$$;

-- Crea un turno validando que el horario siga libre y dentro de la agenda.
-- Errores (SQLSTATE P0001, mensaje en el campo message):
--   SLOT_UNAVAILABLE · TOO_MANY_ACTIVE · SERVICE_NOT_FOUND
create function public.book_appointment(
  p_service_id         uuid,
  p_starts_at          timestamptz,
  p_customer_name      text,
  p_customer_phone     text,
  p_customer_email     text,
  p_notes              text,
  p_cancel_token_hash  text,
  p_tz                 text,
  p_step_minutes       integer,
  p_min_notice         interval,
  p_max_days_ahead     integer,
  p_max_active_per_phone integer,
  p_initial_status     public.appointment_status
) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_service public.services%rowtype;
  v_id uuid;
  v_active integer;
begin
  select * into v_service from public.services where id = p_service_id and active;
  if not found then
    raise exception 'SERVICE_NOT_FOUND';
  end if;

  if p_initial_status not in ('pending', 'confirmed') then
    raise exception 'INVALID_STATUS';
  end if;

  if not exists (
    select 1 from public.available_slots(
      p_service_id, (p_starts_at at time zone p_tz)::date, p_tz,
      p_step_minutes, p_min_notice, p_max_days_ahead
    ) s where s.slot_start = p_starts_at
  ) then
    raise exception 'SLOT_UNAVAILABLE';
  end if;

  select count(*) into v_active
  from public.appointments
  where customer_phone = p_customer_phone
    and status in ('pending', 'confirmed')
    and starts_at > now();
  if v_active >= p_max_active_per_phone then
    raise exception 'TOO_MANY_ACTIVE';
  end if;

  begin
    insert into public.appointments (
      service_id, service_name, price_cents, starts_at, ends_at,
      customer_name, customer_phone, customer_email, notes, status, cancel_token_hash
    ) values (
      v_service.id, v_service.name, v_service.price_cents, p_starts_at,
      p_starts_at + make_interval(mins => v_service.duration_minutes),
      p_customer_name, p_customer_phone, nullif(p_customer_email, ''), nullif(p_notes, ''),
      p_initial_status, p_cancel_token_hash
    ) returning id into v_id;
  exception when exclusion_violation then
    -- Otra persona reservó el mismo horario en paralelo.
    raise exception 'SLOT_UNAVAILABLE';
  end;

  return v_id;
end;
$$;

-- Datos mínimos del turno para la página de gestión del cliente.
create function public.get_appointment_by_token(p_cancel_token_hash text)
returns table (
  id uuid, service_name text, price_cents bigint, starts_at timestamptz,
  ends_at timestamptz, customer_name text, status public.appointment_status
)
language sql stable security definer set search_path = '' as $$
  select a.id, a.service_name, a.price_cents, a.starts_at, a.ends_at, a.customer_name, a.status
  from public.appointments a
  where a.cancel_token_hash = p_cancel_token_hash;
$$;

-- Cancelación por parte del cliente. Devuelve el nuevo estado o lanza
-- NOT_FOUND · NOT_CANCELLABLE · TOO_LATE.
create function public.cancel_appointment_by_token(
  p_cancel_token_hash text,
  p_min_notice        interval
) returns public.appointment_status
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_appt public.appointments%rowtype;
begin
  select * into v_appt from public.appointments
  where cancel_token_hash = p_cancel_token_hash
  for update;

  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_appt.status not in ('pending', 'confirmed') then
    raise exception 'NOT_CANCELLABLE';
  end if;
  if v_appt.starts_at < now() + p_min_notice then
    raise exception 'TOO_LATE';
  end if;

  update public.appointments set status = 'cancelled' where id = v_appt.id;
  return 'cancelled';
end;
$$;

-- Devuelve true si la acción está permitida y suma un hit a la ventana actual.
create function public.hit_rate_limit(
  p_key            text,
  p_limit          integer,
  p_window_seconds integer
) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  v_hits integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;

  -- Limpieza oportunista de ventanas viejas.
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.available_slots(uuid, date, text, integer, interval, integer) from public, anon, authenticated;
revoke all on function public.book_appointment(uuid, timestamptz, text, text, text, text, text, text, integer, interval, integer, integer, public.appointment_status) from public, anon, authenticated;
revoke all on function public.get_appointment_by_token(text) from public, anon, authenticated;
revoke all on function public.cancel_appointment_by_token(text, interval) from public, anon, authenticated;
revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

grant execute on function public.available_slots(uuid, date, text, integer, interval, integer) to service_role;
grant execute on function public.book_appointment(uuid, timestamptz, text, text, text, text, text, text, integer, interval, integer, integer, public.appointment_status) to service_role;
grant execute on function public.get_appointment_by_token(text) to service_role;
grant execute on function public.cancel_appointment_by_token(text, interval) to service_role;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
