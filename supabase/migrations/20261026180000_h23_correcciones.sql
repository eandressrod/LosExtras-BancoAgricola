-- H23 (SCRUM-117): correcciones desde la tarjeta de Para ti y pregunta en contexto.
-- Migración aditiva (ADR-005). Las señales siguen en senales_usuario: quitar = desactivar, deshacer = reactivar.
-- No se registran aperturas, impresiones ni analítica.

-- «Menos de este comercio» sobre un comercio elegido solo quita su interés (pierde M) y no multiplica su R.
alter table public.senales_usuario
  add column quito_eleccion boolean not null default false;

-- Última respuesta a cada pregunta en contexto, para no repetir en 30 días una pregunta rechazada.
-- «Ahora no» no se guarda: solo cierra la pregunta en esa visita.
create table public.respuestas_pregunta (
  usuario_id text not null references public.perfiles(id) on delete cascade,
  pregunta text not null check (pregunta in ('excluir-categoria')),
  valor text not null check (char_length(btrim(valor)) between 1 and 100),
  respuesta text not null check (respuesta in ('si', 'no')),
  respondida_en timestamptz not null default now(),
  primary key (usuario_id, pregunta, valor)
);

-- Igual que el resto de tablas protegidas: el navegador nunca accede; solo el backend con service_role.
alter table public.respuestas_pregunta enable row level security;
revoke all on table public.respuestas_pregunta from public, anon, authenticated;
grant select, insert, update, delete on table public.respuestas_pregunta to service_role;
