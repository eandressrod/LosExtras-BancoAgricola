-- Accesos ficticios de prueba autorizados para el selector del login.
alter table public.perfiles add column clave_prueba text
  check (clave_prueba is null or char_length(clave_prueba) between 1 and 100);
alter table public.perfiles add column promociones_abiertas boolean not null default false;
update public.perfiles set clave_prueba=case usuario_acceso
  when 'demo.basica' then 'Basica2026' when 'demo.black' then 'Black2026'
  when 'demo' then 'demo123' when '123' then '123'
  else 'H19Prueba2026' end
where usuario_acceso in ('demo.basica','demo.black','demo','123','h19.usuario.001','h19.usuario.002','h19.usuario.003');

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
      if tabla='perfiles' then datos := jsonb_build_object('promociones_abiertas',false) || datos; end if;
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
