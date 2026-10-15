-- Numeración ficticia asignada una sola vez; conserva propietario, saldo y tarjetas.
alter table public.cuentas drop constraint cuentas_numero_completo_valido;
with nuevos(id,perfil_id,anterior,numero) as (values
('cta-a-1','A','100000001320','8122104944'),
('cta-a-2','A','100000005376','5309675603'),
('cta-b-1','B','200000004120','8801687756'),
('cta-b-2','B','200000000341','3896681744'),
('cta-demo-1','demo','300000001320','5491829232'),
('cta-demo-2','demo','300000005376','9263005274'),
('h19-cuenta-1-1','h19-usuario-001','400000004652','9091699164'),
('h19-cuenta-1-2','h19-usuario-001','400000014169','9013507949'),
('h19-cuenta-2-1','h19-usuario-002','400001009681','4043426960'),
('h19-cuenta-2-2','h19-usuario-002','400001013886','3236105986'),
('h19-cuenta-3-1','h19-usuario-003','400002007892','1579515730'),
('h19-cuenta-3-2','h19-usuario-003','400002014472','8006028682')
)
update public.cuentas c
set numero_completo=n.numero, numero_enmascarado='•••• ' || right(n.numero,4)
from nuevos n
where c.id=n.id and c.perfil_id=n.perfil_id and c.numero_completo=n.anterior;
alter table public.cuentas add constraint cuentas_numero_completo_valido
check (numero_completo is null or numero_completo ~ '^[0-9]{10}$');
