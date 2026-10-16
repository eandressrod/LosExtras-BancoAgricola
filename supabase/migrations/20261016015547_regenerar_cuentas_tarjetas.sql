-- Regeneración autorizada de cuentas y tarjetas de prueba; no toca otras entidades.
-- Aplicar una sola vez, coordinada con el backend que usa tarjetas_usuario.
begin;
lock table public.cuentas,public.tarjetas_usuario in access exclusive mode;
delete from public.tarjetas_usuario;
delete from public.cuentas;
alter table public.cuentas alter column numero_completo set not null;
alter table public.cuentas add constraint cuentas_solo_bancarias check(tipo !~* 'tarjeta');
alter table public.cuentas add constraint cuentas_id_propietario_unique unique(id,perfil_id);
alter table public.tarjetas_usuario add column cuenta_id text not null;
alter table public.tarjetas_usuario add column tipo_tarjeta text not null check(tipo_tarjeta in ('basica','black'));
alter table public.tarjetas_usuario add constraint tarjetas_numero_enmascarado_valido check(numero_enmascarado ~ '^•••• [0-9]{4}$');
alter table public.tarjetas_usuario add constraint tarjetas_usuario_cuenta_propietario_fkey foreign key(cuenta_id,perfil_id) references public.cuentas(id,perfil_id) on delete cascade;
create index tarjetas_usuario_cuenta_propietario_idx on public.tarjetas_usuario(cuenta_id,perfil_id);
-- Alias legado para lectores anteriores; las cuentas nunca se ocultan.
create function public.sincronizar_numero_cuenta() returns trigger language plpgsql security invoker set search_path=public as $$
begin
  new.numero_enmascarado := new.numero_completo;
  return new;
end;
$$;
revoke all on function public.sincronizar_numero_cuenta() from public,anon,authenticated;
create trigger cuentas_numero_visible before insert or update on public.cuentas for each row execute function public.sincronizar_numero_cuenta();
with perfiles_ordenados as (
 select id,tipo_tarjeta,row_number() over(order by id)::integer as n from public.perfiles
), filas as (
 select p.*,i,case when id in ('A','B','demo') then 'cta-'||lower(id)||'-'||i
 when id ~ '^h19-usuario-[0-9]+$' then 'h19-cuenta-'||right(id,3)::integer||'-'||i
 else 'cuenta-'||id||'-'||i end as cuenta_id,
 ((('x'||substr(md5('cuenta:'||id||':'||i),1,12))::bit(48)::bigint % 9000000000)+1000000000)::text as numero
 from perfiles_ordenados p cross join lateral generate_series(1,case when id='B' then 1 else 2 end) i
)
insert into public.cuentas(id,perfil_id,nombre,tipo,numero_completo,numero_enmascarado,saldo,moneda,segmento,orden)
select cuenta_id,id,case when id='B' then 'Cuenta Corriente Premium' when i=1 then 'Max Electrónico' else 'CUENTA DIGITAL' end,
case when id='B' then 'Corriente' else 'Cuenta de ahorro' end,numero,numero,round(n*537.41+i*93.72,2),'USD',case when tipo_tarjeta='black' then 'Black' else 'Básica' end,i from filas;
with perfiles_ordenados as (
 select id,tipo_tarjeta,row_number() over(order by id)::integer as n from public.perfiles
), filas as (
 select p.*,i,
 case when id='A' then 'cta-a-'||(i+2) when id='B' then 'cta-b-2' when id='demo' then 'cta-demo-3'
 when id ~ '^h19-usuario-[0-9]+$' then 'h19-tarjeta-'||right(id,3)::integer||'-'||i else 'tarjeta-'||id||'-'||i end as tarjeta_id,
 case when id='A' and i=2 then 'credito-black-mastercard' when id='A' or id='demo' then 'credito-clasica-visa'
 when id='h19-usuario-001' then (array['debito-joven-mastercard','debito-clasica-mastercard'])[i]
 when id='h19-usuario-002' then (array['debito-black-mastercard','credito-dorada-visa','credito-platinum-visa'])[i]
 when id='h19-usuario-003' then (array['credito-black-mastercard','credito-infinite-visa','credito-clasica-visa','debito-joven-mastercard'])[i]
 when tipo_tarjeta='black' then 'credito-black-mastercard' else 'credito-clasica-visa' end as producto_id
 from perfiles_ordenados p cross join lateral generate_series(1,case when id in ('A','h19-usuario-001') then 2 when id='h19-usuario-002' then 3 when id='h19-usuario-003' then 4 else 1 end) i
)
insert into public.tarjetas_usuario(id,perfil_id,cuenta_id,producto_id,tipo_tarjeta,numero_enmascarado,saldo,moneda,orden)
select f.tarjeta_id,f.id,c.id,f.producto_id,case when f.producto_id ~ 'black|infinite' then 'black' else 'basica' end,
'•••• '||(6400+f.n*10+f.i),case when f.producto_id like 'debito%' then c.saldo else round(1000+f.n*230.5+f.i*71.25,2) end,'USD',f.i
from filas f join public.cuentas c on c.perfil_id=f.id and c.orden=(f.i-1)%(case when f.id='B' then 1 else 2 end)+1;
commit;
