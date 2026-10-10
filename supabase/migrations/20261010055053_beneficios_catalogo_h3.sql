-- Acuerdo del 9 de octubre: conservar los beneficios actuales para ambas tarjetas.
-- H4 definirá sus diferencias; no sobrescribir registros que ya se hayan configurado.
insert into public.beneficios_tarjeta (promocion_id, tipo_tarjeta, beneficio, medio_pago, restricciones)
select p.id, tarjetas.tipo_tarjeta, p.benefit, p.payment, p.restrictions
from public.promociones p
cross join (values ('basica'), ('black')) as tarjetas(tipo_tarjeta)
on conflict (promocion_id, tipo_tarjeta) do nothing;
