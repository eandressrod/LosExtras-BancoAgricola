-- Midi se ejecuta únicamente en el servidor local con la clave privada existente.
-- Sin nuevos campos de producto; las funciones de lectura/guardado evitan consultas por celda.
create function public.midi_dependencias(tabla text, identificador text)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare contenido jsonb; conteos jsonb;
begin
  if tabla = 'perfiles' then
    contenido := jsonb_build_object(
      'cuentas', (select coalesce(jsonb_agg(to_jsonb(t) order by t.id), '[]') from public.cuentas t where t.perfil_id = identificador),
      'preferencias', (select coalesce(jsonb_agg(to_jsonb(t) order by t.usuario_id), '[]') from public.preferencias_usuario t where t.usuario_id = identificador),
      'guardadas', (select coalesce(jsonb_agg(to_jsonb(t) order by t.promocion_id), '[]') from public.promociones_guardadas t where t.usuario_id = identificador),
      'revocaciones', (select coalesce(jsonb_agg(to_jsonb(t) order by t.id), '[]') from public.sesiones_revocadas t where t.usuario_id = identificador));
  elsif tabla = 'promociones' then
    contenido := jsonb_build_object(
      'beneficios', (select coalesce(jsonb_agg(to_jsonb(t) order by t.tipo_tarjeta), '[]') from public.beneficios_tarjeta t where t.promocion_id = identificador),
      'guardadas', (select coalesce(jsonb_agg(to_jsonb(t) order by t.usuario_id), '[]') from public.promociones_guardadas t where t.promocion_id = identificador));
  else
    raise exception 'Tabla de dependencias no permitida' using errcode = '22023';
  end if;
  select jsonb_object_agg(key, jsonb_array_length(value)) into conteos from jsonb_each(contenido);
  return jsonb_build_object('huella', md5(contenido::text), 'conteos', conteos);
end;
$$;

create function public.midi_leer_datos()
returns jsonb language sql stable security invoker set search_path = '' as $$
select jsonb_build_object(
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

create function public.midi_guardar_cambios(cambios jsonb)
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
    if tabla is null or not tabla = any(array['perfiles','cuentas','preferencias_usuario','comercios','promociones','beneficios_tarjeta'])
      or accion is null or not accion = any(array['crear','editar','eliminar']) then
      raise exception 'Tabla u operación no permitida' using errcode='22023';
    end if;
    claves := case tabla when 'preferencias_usuario' then array['usuario_id'] when 'beneficios_tarjeta' then array['promocion_id','tipo_tarjeta'] else array['id'] end;
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
      perform 1 from public.sesiones_revocadas where usuario_id=clave->>'id' order by id for update;
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
      array_position(array['perfiles','comercios','cuentas','preferencias_usuario','promociones','beneficios_tarjeta'], value->>'tabla') loop
    tabla := c->>'tabla'; accion := c->>'operacion'; clave := c->'clave'; datos := c->'datos';
    claves := case tabla when 'preferencias_usuario' then array['usuario_id'] when 'beneficios_tarjeta' then array['promocion_id','tipo_tarjeta'] else array['id'] end;
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

grant select, insert, update, delete on public.perfiles, public.cuentas, public.preferencias_usuario,
  public.comercios, public.promociones, public.beneficios_tarjeta to service_role;
grant delete on public.sesiones_revocadas to service_role;
revoke execute on function public.midi_dependencias(text,text), public.midi_leer_datos(), public.midi_guardar_cambios(jsonb) from public, anon, authenticated;
grant execute on function public.midi_dependencias(text,text), public.midi_leer_datos(), public.midi_guardar_cambios(jsonb) to service_role;
