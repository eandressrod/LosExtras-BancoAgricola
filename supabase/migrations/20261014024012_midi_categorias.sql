-- Categorías administrables sin cambiar las selecciones ya guardadas.
create table public.categorias (
  id text primary key check (btrim(id) <> ''),
  nombre text not null check (btrim(nombre) <> ''),
  imagen_url text,
  orden integer not null default 0
);
insert into public.categorias (id,nombre,orden)
select categoria,categoria,row_number() over(order by categoria)::integer
from (select distinct category as categoria from public.promociones
      union select unnest(categorias) from public.preferencias_usuario
      union select unnest(array['Restaurantes','Compras','Entretenimiento'])) t;

create table public.categoria_comercios (
  categoria_id text not null references public.categorias(id),
  comercio_id text not null references public.comercios(id) on delete cascade,
  primary key (categoria_id,comercio_id)
);
create index categoria_comercios_comercio_idx on public.categoria_comercios(comercio_id);
insert into public.categoria_comercios select distinct category,comercio_id from public.promociones;
alter table public.promociones drop constraint promociones_categoria_valida;
alter table public.promociones add constraint promociones_categoria_fkey foreign key (category) references public.categorias(id);
alter table public.promociones add constraint promociones_categoria_comercio_fkey foreign key (category,comercio_id) references public.categoria_comercios(categoria_id,comercio_id);
create index promociones_categoria_comercio_idx on public.promociones(category,comercio_id);
alter table public.preferencias_usuario drop constraint preferencias_usuario_categorias_check;
create index preferencias_categorias_idx on public.preferencias_usuario using gin(categorias);

create function public.validar_categorias_preferencias()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  -- Conserva bloqueos de referencia hasta el commit, igual que una FK.
  perform 1 from public.categorias where id=any(new.categorias) order by id for key share;
  if exists(select 1 from unnest(new.categorias) c where not exists(select 1 from public.categorias t where t.id=c)) then
    raise exception 'Categoría inexistente' using errcode='23503';
  end if;
  return new;
end;
$$;
create trigger preferencias_categorias_validas before insert or update of categorias on public.preferencias_usuario
for each row execute function public.validar_categorias_preferencias();

create function public.proteger_categoria_en_uso()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='UPDATE' and new.id is not distinct from old.id then return new; end if;
  if exists(select 1 from public.preferencias_usuario where categorias @> array[old.id]) then
    raise exception 'Categoría referenciada por preferencias' using errcode='23503';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
create trigger categorias_en_uso before delete or update of id on public.categorias
for each row execute function public.proteger_categoria_en_uso();

alter table public.categorias enable row level security;
alter table public.categoria_comercios enable row level security;
revoke all on public.categorias, public.categoria_comercios from public,anon,authenticated;
grant select,insert,update,delete on public.categorias,public.categoria_comercios to service_role;
revoke execute on function public.validar_categorias_preferencias(), public.proteger_categoria_en_uso() from public,anon,authenticated;
grant execute on function public.validar_categorias_preferencias(), public.proteger_categoria_en_uso() to service_role;

create or replace function public.midi_leer_datos()
returns jsonb language sql stable security invoker set search_path = '' as $$
select jsonb_build_object(
  'categorias', (select coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object('_version',t.xmin::text, '_conteos',jsonb_build_object(
    'comercios',(select count(*) from public.categoria_comercios cc where cc.categoria_id=t.id),
    'promociones',(select count(*) from public.promociones p where p.category=t.id),
    'preferencias',(select count(*) from public.preferencias_usuario pu where pu.categorias @> array[t.id]))) order by t.orden,t.id),'[]') from public.categorias t),
  'categoria_comercios', (select coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object('_version',t.xmin::text) order by t.categoria_id,t.comercio_id),'[]') from public.categoria_comercios t),
  'perfiles', (select coalesce(jsonb_agg((to_jsonb(p) - 'contrasena_hash') || jsonb_build_object(
    '_version', p.xmin::text, 'tiene_contrasena', p.contrasena_hash is not null,
    '_dependencias', public.midi_dependencias('perfiles', p.id)->>'huella', '_conteos', public.midi_dependencias('perfiles', p.id)->'conteos') order by p.id), '[]') from public.perfiles p),
  'cuentas', (select coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object('_version', t.xmin::text) order by t.perfil_id, t.orden, t.id), '[]') from public.cuentas t),
  'preferencias_usuario', (select coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object('_version', t.xmin::text) order by t.usuario_id), '[]') from public.preferencias_usuario t),
  'comercios', (select coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object('_version', t.xmin::text, '_conteos', jsonb_build_object(
    'promociones', (select count(*) from public.promociones p where p.comercio_id=t.id), 'sucursales', (select count(*) from public.sucursales s where s.comercio_id=t.id))) order by t.id), '[]') from public.comercios t),
  'promociones', (select coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object('_version', t.xmin::text,
    '_dependencias', public.midi_dependencias('promociones', t.id)->>'huella', '_conteos', public.midi_dependencias('promociones', t.id)->'conteos') order by t.orden, t.id), '[]') from public.promociones t),
  'beneficios_tarjeta', (select coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object('_version', t.xmin::text) order by t.promocion_id, t.tipo_tarjeta), '[]') from public.beneficios_tarjeta t));
$$;


create or replace function public.midi_guardar_cambios(cambios jsonb)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare c jsonb; tabla text; accion text; clave jsonb; datos jsonb; actual jsonb;
  claves text[]; columnas text; predicado text; k text; dependencia text;
begin
  if jsonb_typeof(cambios) is distinct from 'array' or jsonb_array_length(cambios) > 200 then
    raise exception 'Lote no válido; máximo 200 cambios' using errcode='22023';
  end if;
  -- Validar y bloquear antes de cambiar cualquier fila: cambios del propio lote no generan conflictos.
  for c in select value from jsonb_array_elements(cambios) order by value->>'tabla', (value->'clave')::text loop
    tabla := c->>'tabla'; accion := c->>'operacion'; clave := c->'clave'; datos := c->'datos';
    if tabla is null or not tabla = any(array['categorias','categoria_comercios','perfiles','cuentas','preferencias_usuario','comercios','promociones','beneficios_tarjeta'])
      or accion is null or not accion = any(array['crear','editar','eliminar']) then
      raise exception 'Tabla u operación no permitida' using errcode='22023';
    end if;
    claves := case tabla when 'categoria_comercios' then array['categoria_id','comercio_id'] when 'preferencias_usuario' then array['usuario_id'] when 'beneficios_tarjeta' then array['promocion_id','tipo_tarjeta'] else array['id'] end;
    if jsonb_typeof(clave) is distinct from 'object' or (select count(*) from jsonb_object_keys(clave)) <> cardinality(claves) then
      raise exception 'Identificador incompleto' using errcode='22023';
    end if;
    foreach k in array claves loop
      if jsonb_typeof(clave->k) is distinct from 'string' or btrim(clave->>k) = '' then
        raise exception 'Identificador incompleto' using errcode='22023';
      end if;
    end loop;
    if accion <> 'eliminar' then
      if jsonb_typeof(datos) is distinct from 'object' or not datos @> clave then
        raise exception 'Datos o identificador no válidos' using errcode='22023';
      end if;
      for k in select jsonb_object_keys(datos) loop
        if not exists(select 1 from pg_catalog.pg_attribute a where a.attrelid = ('public.' || tabla)::regclass and a.attname=k and a.attnum > 0 and not a.attisdropped) then
          raise exception 'Campo no permitido' using errcode='22023';
        end if;
      end loop;
    end if;
    select string_agg(format('t.%I = ($1 ->> %L)', v,v), ' and ') into predicado from unnest(claves) v;
    execute format('select to_jsonb(t) || jsonb_build_object(''_version'', t.xmin::text) from public.%I t where %s for update', tabla, predicado) into actual using clave;
    if accion = 'crear' then
      if actual is not null then raise exception 'Identificador existente' using errcode='23505'; end if;
    elsif actual is null or actual->>'_version' is distinct from c->>'version' then
      raise exception 'Registro cambiado; actualiza los datos' using errcode='PT409';
    end if;
    if accion = 'eliminar' and tabla = 'perfiles' then
      perform 1 from public.cuentas where perfil_id=clave->>'id' order by id for update;
      perform 1 from public.preferencias_usuario where usuario_id=clave->>'id' for update;
      perform 1 from public.promociones_guardadas where usuario_id=clave->>'id' order by promocion_id for update;
      -- La fila padre ya está bloqueada: las nuevas revocaciones quedan protegidas por su FK.
      -- Las revocaciones no se editan en la app; SELECT FOR UPDATE requería UPDATE innecesario.
    elsif accion = 'eliminar' and tabla = 'promociones' then
      perform 1 from public.beneficios_tarjeta where promocion_id=clave->>'id' order by tipo_tarjeta for update;
      perform 1 from public.promociones_guardadas where promocion_id=clave->>'id' order by usuario_id for update;
    end if;
    if accion = 'eliminar' and tabla = any(array['perfiles','promociones']) then
      dependencia := public.midi_dependencias(tabla, clave->>'id')->>'huella';
      if dependencia is distinct from c->>'dependencias' then
        raise exception 'Dependencias cambiadas; revisa el borrado' using errcode='PT409';
      end if;
    end if;
  end loop;

  for c in select value from jsonb_array_elements(cambios)
    order by case when value->>'operacion'='eliminar' then 1 else 0 end,
      case when value->>'operacion'='eliminar' then -1 else 1 end *
      array_position(array['categorias','perfiles','comercios','categoria_comercios','cuentas','preferencias_usuario','promociones','beneficios_tarjeta'], value->>'tabla') loop
    tabla := c->>'tabla'; accion := c->>'operacion'; clave := c->'clave'; datos := c->'datos';
    claves := case tabla when 'categoria_comercios' then array['categoria_id','comercio_id'] when 'preferencias_usuario' then array['usuario_id'] when 'beneficios_tarjeta' then array['promocion_id','tipo_tarjeta'] else array['id'] end;
    select string_agg(format('t.%I = ($1 ->> %L)', v,v), ' and ') into predicado from unnest(claves) v;
    if accion = 'eliminar' then
      if tabla='perfiles' then
        delete from public.cuentas where perfil_id=clave->>'id';
        delete from public.preferencias_usuario where usuario_id=clave->>'id';
        delete from public.promociones_guardadas where usuario_id=clave->>'id';
        delete from public.sesiones_revocadas where usuario_id=clave->>'id';
      elsif tabla='promociones' then
        delete from public.beneficios_tarjeta where promocion_id=clave->>'id';
        delete from public.promociones_guardadas where promocion_id=clave->>'id';
      end if;
      execute format('delete from public.%I t where %s', tabla, predicado) using clave;
    elsif accion='crear' then
      execute format('insert into public.%I select (jsonb_populate_record(null::public.%I, $1)).*', tabla, tabla) using datos;
    else
      execute format('select to_jsonb(t) from public.%I t where %s', tabla, predicado) into actual using clave;
      select string_agg(format('%I = v.%I', a.attname,a.attname), ', ' order by a.attnum) into columnas
        from pg_catalog.pg_attribute a where a.attrelid=('public.'||tabla)::regclass and a.attnum>0 and not a.attisdropped and not a.attname=any(claves);
      select string_agg(format('t.%I = ($2 ->> %L)', v,v), ' and ') into predicado from unnest(claves) v;
      execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I, $1) v where %s', tabla,columnas,tabla,predicado) using actual || datos, clave;
    end if;
  end loop;
  return public.midi_leer_datos();
end;
$$;
