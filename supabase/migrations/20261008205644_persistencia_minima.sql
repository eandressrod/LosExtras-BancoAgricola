-- Preparación de datos persistentes; las funciones y autorización por sesión
-- se implementan en sus historias. Se conserva el contrato de la API existente.

alter table public.perfiles
  add column tipo_tarjeta text not null default 'basica'
  check (tipo_tarjeta in ('basica', 'black'));

insert into public.perfiles (id, nombre, tipo_tarjeta)
values ('A', 'Usuario A', 'basica'), ('B', 'Usuario B', 'black');

create table public.comercios (
  id text primary key,
  nombre text not null
);

insert into public.comercios (id, nombre)
select id, merchant from public.promociones;

alter table public.promociones
  add column comercio_id text references public.comercios(id),
  add column vigencia_hasta date,
  add column instrucciones text not null default '';

update public.promociones set comercio_id = id;
alter table public.promociones alter column comercio_id set not null;
alter table public.promociones add constraint promociones_categoria_valida
  check (category in ('Restaurantes', 'Compras', 'Entretenimiento'));
create index promociones_comercio_idx on public.promociones (comercio_id);

-- merchant y los campos de beneficio anteriores se conservan por compatibilidad.
-- H4/H7 resolverán comercio/beneficio según perfil mediante el contrato API.
create table public.beneficios_tarjeta (
  promocion_id text not null references public.promociones(id),
  tipo_tarjeta text not null check (tipo_tarjeta in ('basica', 'black')),
  beneficio text not null,
  medio_pago text not null,
  restricciones text not null,
  primary key (promocion_id, tipo_tarjeta)
);

create table public.sucursales (
  id text primary key,
  comercio_id text not null references public.comercios(id),
  nombre text not null,
  direccion text not null,
  latitud double precision not null check (latitud between -90 and 90),
  longitud double precision not null check (longitud between -180 and 180)
);
create index sucursales_comercio_idx on public.sucursales (comercio_id);

-- Tres categorías fijas: no requieren una tabla ni un editor de categorías.
create table public.preferencias_usuario (
  usuario_id text primary key references public.perfiles(id),
  categorias text[] not null default '{}',
  encuesta_completada boolean not null default false,
  check (categorias <@ array['Restaurantes', 'Compras', 'Entretenimiento']::text[]),
  check (array_position(categorias, null) is null),
  check (not encuesta_completada or cardinality(categorias) > 0)
);

create table public.promociones_guardadas (
  usuario_id text not null references public.perfiles(id),
  promocion_id text not null references public.promociones(id),
  primary key (usuario_id, promocion_id)
);
create index guardadas_promocion_idx on public.promociones_guardadas (promocion_id);

alter table public.comercios enable row level security;
alter table public.beneficios_tarjeta enable row level security;
alter table public.sucursales enable row level security;
alter table public.preferencias_usuario enable row level security;
alter table public.promociones_guardadas enable row level security;

-- Datos de aplicación solo mediante nuestra API; los integrantes trabajan
-- con sus cuentas del Dashboard, no abriendo privilegios a visitantes.
revoke all on table public.perfiles, public.promociones, public.comercios,
  public.beneficios_tarjeta, public.sucursales, public.preferencias_usuario,
  public.promociones_guardadas from public, anon, authenticated;
grant usage on schema public to service_role;
grant select on table public.perfiles, public.promociones, public.comercios,
  public.beneficios_tarjeta, public.sucursales to service_role;
grant select, insert, update, delete on table public.preferencias_usuario,
  public.promociones_guardadas to service_role;
