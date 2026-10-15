-- H13/H1: plazos por sesión. Nunca se almacenan tokens, cookies ni eventos de navegación.
create table public.sesiones_actividad (
  id uuid primary key,
  usuario_id text not null references public.perfiles(id),
  ultima_actividad timestamptz not null,
  expira_en timestamptz not null
);
alter table public.sesiones_actividad enable row level security;
revoke all on public.sesiones_actividad from public, anon, authenticated, service_role;
grant select, insert, update on public.sesiones_actividad to service_role;

-- El backend valida la firma antes de llamar. El reloj y el bloqueo son de PostgreSQL.
create function public.estado_actividad_sesion(
  p_id uuid, p_usuario text, p_creada timestamptz, p_expira timestamptz, p_renovar boolean default false
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_fila public.sesiones_actividad;
  v_ahora timestamptz;
begin
  if p_creada is null or p_expira is null or p_creada > clock_timestamp() or p_creada >= p_expira then return null; end if;
  insert into public.sesiones_actividad (id, usuario_id, ultima_actividad, expira_en)
    values (p_id, p_usuario, p_creada, p_expira) on conflict (id) do nothing;
  select * into v_fila from public.sesiones_actividad where id = p_id for update;
  v_ahora := clock_timestamp();
  if v_fila.usuario_id <> p_usuario or v_ahora >= v_fila.expira_en
    or v_ahora >= v_fila.ultima_actividad + interval '120 seconds'
    or exists (select 1 from public.sesiones_revocadas where id = p_id) then return null; end if;
  if p_renovar then
    update public.sesiones_actividad set ultima_actividad = v_ahora where id = p_id;
    v_fila.ultima_actividad := v_ahora;
  end if;
  return jsonb_build_object(
    'ahora', floor(extract(epoch from v_ahora) * 1000),
    'inactivaEn', floor(extract(epoch from least(v_fila.expira_en, v_fila.ultima_actividad + interval '120 seconds')) * 1000)
  );
end;
$$;
revoke all on function public.estado_actividad_sesion(uuid,text,timestamptz,timestamptz,boolean) from public, anon, authenticated;
grant execute on function public.estado_actividad_sesion(uuid,text,timestamptz,timestamptz,boolean) to service_role;
