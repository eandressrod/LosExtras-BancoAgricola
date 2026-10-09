-- H1: acceso simulado con dos perfiles fijos de prueba. No es autenticación bancaria.
-- Credenciales ficticias y públicas (se muestran en el login); aquí solo se guarda su hash scrypt.
-- Cambio aditivo: la API existente sigue leyendo solo id y nombre.

alter table public.perfiles
  add column usuario_acceso text unique,
  add column contrasena_hash text,
  add constraint perfiles_acceso_completo
    check ((usuario_acceso is null) = (contrasena_hash is null));

-- A: demo.basica (tarjeta básica). B: demo.black (tarjeta Black). El perfil demo queda sin acceso.
update public.perfiles
set usuario_acceso = 'demo.basica',
    contrasena_hash = 'scrypt$VW3bG4vYSj3byjANg1dRfw$jqBaaGdi3tPIScvjLFHTy8vMfktpLmCbRhjxMlPBcIE'
where id = 'A';

update public.perfiles
set usuario_acceso = 'demo.black',
    contrasena_hash = 'scrypt$_19-BdYxD0xaRE5syARVuQ$6rEmOsgu4UhK7kq2oJbz3anp2elDiUrX93jY8Um9B2k'
where id = 'B';
