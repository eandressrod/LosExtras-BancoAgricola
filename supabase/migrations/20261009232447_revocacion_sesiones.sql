-- H1: la revocación debe sobrevivir entre instancias de Vercel.
-- Solo se almacena el identificador firmado de la sesión, nunca la cookie.
create table public.sesiones_revocadas (
  id uuid primary key,
  usuario_id text not null references public.perfiles(id),
  expira_en timestamptz not null
);
create index sesiones_revocadas_usuario_idx on public.sesiones_revocadas(usuario_id);

alter table public.sesiones_revocadas enable row level security;
revoke all on table public.sesiones_revocadas from public, anon, authenticated, service_role;
grant select, insert on table public.sesiones_revocadas to service_role;
