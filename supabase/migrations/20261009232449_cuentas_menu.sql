-- H2: registra también la tabla ya creada manualmente, sin sobrescribir sus datos.
create table if not exists public.cuentas (
  id text primary key,
  perfil_id text not null references public.perfiles(id) on delete cascade,
  nombre text not null,
  tipo text not null,
  numero_enmascarado text not null,
  saldo numeric not null default 0,
  moneda text not null default 'USD',
  segmento text not null default 'Básica',
  orden integer not null default 0
);
create index if not exists cuentas_perfil_orden_idx on public.cuentas(perfil_id, orden);
alter table public.cuentas enable row level security;
revoke all on table public.cuentas from public, anon, authenticated, service_role;
grant select on table public.cuentas to service_role;

insert into public.cuentas (id, perfil_id, nombre, tipo, numero_enmascarado, saldo, moneda, segmento, orden) values
('cta-a-1', 'A', 'Max Electrónico', 'Cuenta de ahorro', '•••• 1320', 30, 'USD', 'Básica', 1),
('cta-a-2', 'A', 'CUENTA DIGITAL', 'Cuenta de ahorro', '•••• 5376', 0, 'USD', 'Básica', 2),
('cta-b-1', 'B', 'Cuenta Corriente Premium', 'Corriente', '•••• 4120', 3450.75, 'USD', 'Black', 1),
('cta-b-2', 'B', 'Tarjeta de Crédito Black', 'Tarjeta de Crédito', '•••• 0341', 1200, 'USD', 'Black', 2),
('cta-demo-1', 'demo', 'Max Electrónico', 'Cuenta de ahorro', '•••• 1320', 30, 'USD', 'Básica', 1),
('cta-demo-2', 'demo', 'CUENTA DIGITAL', 'Cuenta de ahorro', '•••• 5376', 0, 'USD', 'Básica', 2)
on conflict (id) do nothing;
