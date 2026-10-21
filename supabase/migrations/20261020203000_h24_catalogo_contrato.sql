-- H24 · Entrega 1 (SCRUM-123): esquema del contrato del catálogo.
-- Solo agrega: tablas nuevas y columnas opcionales. Midi crea filas sin conocer estas columnas,
-- así que la forma completa la exige la fuente única (catalogo/esquema.json) y no NOT NULL aquí.
-- La carga de datos está en la migración generada siguiente (npm run catalogo:generar).

-- Las 11 ocasiones de la rúbrica (0, 0.5 o 1 por comercio o promoción).
create table public.ocasiones (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre text not null check (btrim(nombre) <> ''),
  ejemplos text not null default '',
  orden integer not null default 0
);

-- Lista fija de zonas con su centro (H8 Cerca de ti y H26 A domicilio).
create table public.zonas (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre text not null check (btrim(nombre) <> ''),
  latitud double precision not null check (latitud between -90 and 90),
  longitud double precision not null check (longitud between -180 and 180),
  orden integer not null default 0
);

create table public.subcategorias (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre text not null check (btrim(nombre) <> ''),
  categoria_id text not null references public.categorias(id) on delete cascade,
  unique (id, categoria_id)
);
create index subcategorias_categoria_idx on public.subcategorias (categoria_id);

alter table public.categorias add column icono_url text check (icono_url ~ '^/recursos/');

alter table public.comercios
  add column categoria_id text references public.categorias(id),
  add column subcategoria_id text,
  add column ocasiones jsonb,
  add column nivel_precio smallint check (nivel_precio between 1 and 3),
  add column reconocible boolean,
  add column sensible boolean,
  add column afinar_por text check (afinar_por in ('comercio', 'subcategoria', 'no')),
  add constraint comercios_subcategoria_fkey foreign key (subcategoria_id, categoria_id)
    references public.subcategorias (id, categoria_id);
create index comercios_subcategoria_idx on public.comercios (subcategoria_id, categoria_id);

alter table public.promociones
  add column titulo text,
  add column condiciones text,
  add column canales text[] check (cardinality(canales) > 0 and canales <@ array['presencial', 'delivery', 'en-linea']
    and array_position(canales, null) is null),
  add column tipo_beneficio text check (tipo_beneficio in ('descuento', '2x1-combo', 'cuotas-sin-intereses', 'cashback-puntos')),
  add column condicion_decisiva text,
  add column etiquetas_intencion text[] check (etiquetas_intencion <@ array['regalo'] and array_position(etiquetas_intencion, null) is null),
  add column fecha_alta date,
  add column ocasiones jsonb,
  add column nivel_precio smallint check (nivel_precio between 1 and 3);

alter table public.sucursales add column zona_id text references public.zonas(id);
create index sucursales_zona_idx on public.sucursales (zona_id);

-- Sucursales donde participa cada promoción; la carga incluye todas las del comercio salvo exclusión (H8).
create table public.promocion_sucursales (
  promocion_id text not null references public.promociones(id) on delete cascade,
  sucursal_id text not null references public.sucursales(id) on delete cascade,
  primary key (promocion_id, sucursal_id)
);
create index promocion_sucursales_sucursal_idx on public.promocion_sucursales (sucursal_id);

create table public.cobertura (
  comercio_id text not null references public.comercios(id) on delete cascade,
  zona_id text not null references public.zonas(id) on delete cascade,
  estado text not null check (estado in ('si', 'no', 'desconocida')),
  primary key (comercio_id, zona_id)
);
create index cobertura_zona_idx on public.cobertura (zona_id);

-- Puentes de H27: se crea vacía en esta historia.
create table public.relaciones_intereses (
  interes_a text not null check (btrim(interes_a) <> ''),
  interes_b text not null check (btrim(interes_b) <> ''),
  ocasion_id text not null references public.ocasiones(id) on delete cascade,
  nota text not null default '',
  primary key (interes_a, interes_b, ocasion_id),
  check (interes_a <> interes_b)
);
create index relaciones_intereses_ocasion_idx on public.relaciones_intereses (ocasion_id);

-- Las ocasiones de comercios y promociones son un objeto con valores de la rúbrica y claves del vocabulario.
create function public.validar_ocasiones_catalogo()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.ocasiones is null then return new; end if;
  if jsonb_typeof(new.ocasiones) <> 'object' or exists (
    select 1 from jsonb_each(new.ocasiones) o
    where not exists (select 1 from public.ocasiones v where v.id = o.key)
       or case when jsonb_typeof(o.value) = 'number' then (o.value::numeric) not in (0, 0.5, 1) else true end
  ) then
    raise exception 'Ocasiones fuera de la rúbrica' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger comercios_ocasiones_validas before insert or update of ocasiones on public.comercios
for each row execute function public.validar_ocasiones_catalogo();
create trigger promociones_ocasiones_validas before insert or update of ocasiones on public.promociones
for each row execute function public.validar_ocasiones_catalogo();

alter table public.ocasiones enable row level security;
alter table public.zonas enable row level security;
alter table public.subcategorias enable row level security;
alter table public.promocion_sucursales enable row level security;
alter table public.cobertura enable row level security;
alter table public.relaciones_intereses enable row level security;
revoke all on table public.ocasiones, public.zonas, public.subcategorias, public.promocion_sucursales, public.cobertura,
  public.relaciones_intereses from public, anon, authenticated;
grant select on table public.ocasiones, public.zonas, public.subcategorias, public.promocion_sucursales, public.cobertura,
  public.relaciones_intereses to service_role;
revoke execute on function public.validar_ocasiones_catalogo() from public, anon, authenticated;
grant execute on function public.validar_ocasiones_catalogo() to service_role;
