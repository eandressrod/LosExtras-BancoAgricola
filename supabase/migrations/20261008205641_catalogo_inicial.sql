-- Migración inicial del catálogo; la CLI o integración GitHub aplica este archivo.
-- Base mínima compatible con la API actual; no implementa cuentas ni autenticación.

create table if not exists public.perfiles (
  id text primary key,
  nombre text not null
);

create table if not exists public.promociones (
  id text primary key,
  merchant text not null,
  category text not null,
  benefit text not null,
  description text not null,
  payment text not null,
  restrictions text not null,
  orden integer not null default 0
);

-- Solo el backend con clave secreta consulta estas tablas.
alter table public.perfiles enable row level security;
alter table public.promociones enable row level security;
revoke all on table public.perfiles, public.promociones from anon, authenticated;
grant select on table public.perfiles, public.promociones to service_role;

insert into public.perfiles (id, nombre) values ('demo', 'Usuario')
on conflict (id) do nothing;

insert into public.promociones (id, merchant, category, benefit, description, payment, restrictions, orden)
values
  ('restaurante', 'Restaurante', 'Restaurantes', '10 % de descuento', 'Descuento en una comida.', 'Tarjeta de débito', 'Una compra por usuario. No acumulable con otras ofertas.', 1),
  ('tienda', 'Tienda', 'Compras', '15 % de descuento', 'Descuento en artículos seleccionados.', 'Tarjeta de crédito', 'Solo artículos seleccionados. No incluye envío.', 2),
  ('cine', 'Cine', 'Entretenimiento', '2 entradas por el precio de 1', 'Beneficio para una función.', 'Tarjeta de débito o crédito', 'Sujeto a disponibilidad. No aplica a funciones especiales.', 3)
on conflict (id) do nothing;
