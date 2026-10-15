-- Estado efímero de la sesión: no impide retirar un perfil desde Midi.
alter table public.sesiones_actividad drop constraint sesiones_actividad_usuario_id_fkey;
alter table public.sesiones_actividad add constraint sesiones_actividad_usuario_id_fkey
  foreign key (usuario_id) references public.perfiles(id) on delete cascade;
