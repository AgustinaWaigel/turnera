-- Datos de ejemplo para un estudio de uñas. Editá o borrá a gusto.
insert into public.services (name, description, duration_minutes, price_cents, sort_order) values
  ('Esmaltado semipermanente', 'Manos. Limpieza de cutículas, limado y color a elección.', 60, 1800000, 1),
  ('Kapping gel', 'Refuerzo de la uña natural con gel. Incluye color.', 90, 2400000, 2),
  ('Esculpidas en gel', 'Extensión con molde, forma y largo a elección.', 120, 3200000, 3),
  ('Service de esculpidas', 'Relleno y mantenimiento de esculpidas existentes.', 90, 2600000, 4),
  ('Nail art', 'Diseño por uña: francesita, líneas, foil, piedritas.', 30, 600000, 5),
  ('Retiro', 'Retiro de semipermanente o gel sin dañar la uña.', 30, 700000, 6);

-- Martes a viernes 10–13 y 15–20; sábados 10–15.
insert into public.working_hours (weekday, start_time, end_time) values
  (2, '10:00', '13:00'), (2, '15:00', '20:00'),
  (3, '10:00', '13:00'), (3, '15:00', '20:00'),
  (4, '10:00', '13:00'), (4, '15:00', '20:00'),
  (5, '10:00', '13:00'), (5, '15:00', '20:00'),
  (6, '10:00', '15:00');
