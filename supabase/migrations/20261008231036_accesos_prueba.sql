-- H1: usuarios de prueba guardados en la base; el backend valida usuario y clave contra esta tabla.
-- Acceso simulado, no es autenticación bancaria. Credenciales ficticias que el login muestra en
-- "Usuarios de prueba"; aquí solo se guarda su hash scrypt (npm run hash -- "Clave").
-- Cambio aditivo: la API existente sigue leyendo solo id y nombre.

alter table public.perfiles
  add column usuario_acceso text unique,
  add column contrasena_hash text,
  add constraint perfiles_acceso_completo
    check ((usuario_acceso is null) = (contrasena_hash is null));

-- A: tarjeta básica.
update public.perfiles
set usuario_acceso = 'demo.basica',
    contrasena_hash = 'scrypt$VW3bG4vYSj3byjANg1dRfw$jqBaaGdi3tPIScvjLFHTy8vMfktpLmCbRhjxMlPBcIE'
where id = 'A';

-- B: tarjeta Black.
update public.perfiles
set usuario_acceso = 'demo.black',
    contrasena_hash = 'scrypt$_19-BdYxD0xaRE5syARVuQ$6rEmOsgu4UhK7kq2oJbz3anp2elDiUrX93jY8Um9B2k'
where id = 'B';

-- Usuario general que se conserva del esqueleto: demo / demo123 (tarjeta básica).
update public.perfiles
set usuario_acceso = 'demo',
    contrasena_hash = 'scrypt$M_MND_a1ICaA2pU6QnSwzA$BNLN7do9LjccyV3SmkWh7skSGfQrAhi_BVL7zD4nlFo'
where id = 'demo';
