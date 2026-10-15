-- H19: datos ficticios editables por perfil; catálogo de nombres tomado de Bancoagrícola.
-- Carga aleatoria reproducible preparada el 14 de octubre de 2026, semilla 19141026.
alter table public.cuentas add column numero_completo text;
alter table public.cuentas add constraint cuentas_numero_completo_valido check (numero_completo is null or numero_completo ~ '^[0-9]{12}$');
create unique index cuentas_numero_completo_idx on public.cuentas(numero_completo) where numero_completo is not null;

create table public.productos_tarjeta (
  id text primary key, nombre text not null, modalidad text not null check(modalidad in ('débito','crédito')),
  red text not null check(red in ('Visa','Mastercard')), descripcion text not null, orden integer not null default 0
);
create table public.tarjetas_usuario (
  id text primary key, perfil_id text not null references public.perfiles(id) on delete cascade,
  producto_id text not null references public.productos_tarjeta(id), numero_enmascarado text not null,
  saldo numeric(12,2) not null default 0 check(saldo >= 0), moneda text not null default 'USD', orden integer not null default 0
);
create index tarjetas_usuario_perfil_idx on public.tarjetas_usuario(perfil_id,orden);
create index tarjetas_usuario_producto_idx on public.tarjetas_usuario(producto_id);
create table public.puntos_usuario (
  perfil_id text primary key references public.perfiles(id) on delete cascade,
  acumulados integer not null default 0 check(acumulados >= 0)
);
create table public.mensajes_usuario (
  id text primary key, perfil_id text not null references public.perfiles(id) on delete cascade,
  titulo text not null, texto text not null, fecha timestamptz not null default now(), leido boolean not null default false
);
create index mensajes_usuario_perfil_fecha_idx on public.mensajes_usuario(perfil_id,fecha desc);
create table public.metas_usuario (
  id text primary key, perfil_id text not null references public.perfiles(id) on delete cascade,
  nombre text not null check(char_length(btrim(nombre)) between 1 and 60),
  objetivo numeric(12,2) not null check(objetivo > 0), ahorrado numeric(12,2) not null default 0 check(ahorrado >= 0 and ahorrado <= objetivo),
  moneda text not null default 'USD' check(moneda='USD'), creada_en timestamptz not null default now()
);
create index metas_usuario_perfil_idx on public.metas_usuario(perfil_id,creada_en);
alter table public.productos_tarjeta enable row level security;
revoke all on table public.productos_tarjeta from public,anon,authenticated,service_role;
alter table public.tarjetas_usuario enable row level security;
revoke all on table public.tarjetas_usuario from public,anon,authenticated,service_role;
alter table public.puntos_usuario enable row level security;
revoke all on table public.puntos_usuario from public,anon,authenticated,service_role;
alter table public.mensajes_usuario enable row level security;
revoke all on table public.mensajes_usuario from public,anon,authenticated,service_role;
alter table public.metas_usuario enable row level security;
revoke all on table public.metas_usuario from public,anon,authenticated,service_role;
grant select on public.productos_tarjeta,public.tarjetas_usuario,public.puntos_usuario to service_role;
grant select,update on public.mensajes_usuario to service_role;
grant select,insert,update,delete on public.metas_usuario to service_role;
insert into public.productos_tarjeta (id,nombre,modalidad,red,descripcion,orden) values
('credito-clasica-visa','Clásica','crédito','Visa','Tarjeta de crédito Clásica Visa.',0),
('debito-joven-mastercard','Joven','débito','Mastercard','Tarjeta de débito Joven Mastercard.',1),
('debito-clasica-mastercard','Clásica','débito','Mastercard','Tarjeta de débito Clásica Mastercard.',2),
('debito-platinum-mastercard','Platinum','débito','Mastercard','Tarjeta de débito Platinum Mastercard.',3),
('debito-black-mastercard','Black','débito','Mastercard','Tarjeta de débito Black Mastercard.',4),
('credito-dorada-visa','Dorada','crédito','Visa','Tarjeta de crédito Dorada Visa.',5),
('credito-platinum-visa','Platinum','crédito','Visa','Tarjeta de crédito Platinum Visa.',6),
('credito-black-mastercard','Black','crédito','Mastercard','Tarjeta de crédito Black Mastercard.',7),
('credito-infinite-visa','Infinite','crédito','Visa','Tarjeta de crédito Infinite Visa.',8);
insert into public.perfiles (id,nombre,tipo_tarjeta,usuario_acceso,contrasena_hash) values
('h19-usuario-001','Ana López','basica','h19.usuario.001','scrypt$ymh7EOSPr14IPFHAFvBLqA$sTHYiIJkEGxeOCkQf2nXEMdRLPIAbp3f7l6jaboOgw4'),
('h19-usuario-002','Luis Pérez','black','h19.usuario.002','scrypt$sXT8t8mUa-VXH2Ga5DthUw$sDas-hM2VLZacwxIcCnk_sCXsMMLb5HWnO3p8kuzyq0'),
('h19-usuario-003','Marta García','basica','h19.usuario.003','scrypt$tumeC8qceiG_R3ZG2KYWog$cilWXamZ4_Fs1mewKcdwjaiVoyiUXd9nfjisnLgvNdI');
insert into public.cuentas (id,perfil_id,nombre,tipo,numero_enmascarado,numero_completo,saldo,moneda,segmento,orden) values
('h19-cuenta-1-1','h19-usuario-001','CUENTA DIGITAL','Cuenta de ahorro','•••• 4652','400000004652',3314.02,'USD','Básica',0),
('h19-cuenta-1-2','h19-usuario-001','Max Electrónico','Cuenta de ahorro','•••• 4169','400000014169',3845.96,'USD','Básica',1),
('h19-cuenta-2-1','h19-usuario-002','CUENTA DIGITAL','Cuenta de ahorro','•••• 9681','400001009681',3736.74,'USD','Black',0),
('h19-cuenta-2-2','h19-usuario-002','Max Electrónico','Cuenta de ahorro','•••• 3886','400001013886',2335.25,'USD','Black',1),
('h19-cuenta-3-1','h19-usuario-003','CUENTA DIGITAL','Cuenta de ahorro','•••• 7892','400002007892',2928.34,'USD','Básica',0),
('h19-cuenta-3-2','h19-usuario-003','Max Electrónico','Cuenta de ahorro','•••• 4472','400002014472',4898.74,'USD','Básica',1);
update public.cuentas set numero_completo='100000001320' where id='cta-a-1' and numero_completo is null;
update public.cuentas set numero_completo='100000005376' where id='cta-a-2' and numero_completo is null;
update public.cuentas set numero_completo='200000004120' where id='cta-b-1' and numero_completo is null;
update public.cuentas set numero_completo='200000000341' where id='cta-b-2' and numero_completo is null;
update public.cuentas set numero_completo='300000001320' where id='cta-demo-1' and numero_completo is null;
update public.cuentas set numero_completo='300000005376' where id='cta-demo-2' and numero_completo is null;
insert into public.tarjetas_usuario (id,perfil_id,producto_id,numero_enmascarado,saldo,moneda,orden) values
('h19-tarjeta-a','A','credito-clasica-visa','•••• 8426',30,'USD',0),
('h19-tarjeta-b','B','credito-black-mastercard','•••• 0341',1200,'USD',0),
('h19-tarjeta-demo','demo','credito-clasica-visa','•••• 6917',30,'USD',0),
('h19-tarjeta-1-1','h19-usuario-001','debito-joven-mastercard','•••• 3713',515.39,'USD',0),
('h19-tarjeta-1-2','h19-usuario-001','debito-clasica-mastercard','•••• 7214',1142.86,'USD',1),
('h19-tarjeta-2-1','h19-usuario-002','debito-black-mastercard','•••• 6076',3067.36,'USD',0),
('h19-tarjeta-2-2','h19-usuario-002','credito-dorada-visa','•••• 5166',4740.07,'USD',1),
('h19-tarjeta-2-3','h19-usuario-002','credito-platinum-visa','•••• 8061',315.84,'USD',2),
('h19-tarjeta-3-1','h19-usuario-003','credito-black-mastercard','•••• 2746',2269.19,'USD',0),
('h19-tarjeta-3-2','h19-usuario-003','credito-infinite-visa','•••• 1726',3295.23,'USD',1),
('h19-tarjeta-3-3','h19-usuario-003','credito-clasica-visa','•••• 2037',3189.87,'USD',2),
('h19-tarjeta-3-4','h19-usuario-003','debito-joven-mastercard','•••• 5950',1913.09,'USD',3);
insert into public.puntos_usuario (perfil_id,acumulados) values
('A',3593),
('B',5000),
('demo',3593),
('h19-usuario-001',2864),
('h19-usuario-002',5308),
('h19-usuario-003',6616);
insert into public.mensajes_usuario (id,perfil_id,titulo,texto,fecha,leido) values
('h19-mensaje-1-1','A','Tus productos','Consulta tus cuentas y tarjetas en Mis Productos.','2026-10-14T15:00:00.000Z',false),
('h19-mensaje-1-2','A','Tus intereses','Puedes revisar tus categorías en Mis preferencias.','2026-10-13T15:00:00.000Z',false),
('h19-mensaje-2-1','B','Tus productos','Consulta tus cuentas y tarjetas en Mis Productos.','2026-10-14T15:00:00.000Z',false),
('h19-mensaje-2-2','B','Tus intereses','Puedes revisar tus categorías en Mis preferencias.','2026-10-13T15:00:00.000Z',false),
('h19-mensaje-3-1','demo','Tus productos','Consulta tus cuentas y tarjetas en Mis Productos.','2026-10-14T15:00:00.000Z',false),
('h19-mensaje-4-1','h19-usuario-001','Tus productos','Consulta tus cuentas y tarjetas en Mis Productos.','2026-10-14T15:00:00.000Z',false),
('h19-mensaje-4-2','h19-usuario-001','Tus intereses','Puedes revisar tus categorías en Mis preferencias.','2026-10-13T15:00:00.000Z',false),
('h19-mensaje-5-1','h19-usuario-002','Tus productos','Consulta tus cuentas y tarjetas en Mis Productos.','2026-10-14T15:00:00.000Z',false),
('h19-mensaje-5-2','h19-usuario-002','Tus intereses','Puedes revisar tus categorías en Mis preferencias.','2026-10-13T15:00:00.000Z',true),
('h19-mensaje-5-3','h19-usuario-002','Tus intereses','Puedes revisar tus categorías en Mis preferencias.','2026-10-12T15:00:00.000Z',true),
('h19-mensaje-6-1','h19-usuario-003','Tus productos','Consulta tus cuentas y tarjetas en Mis Productos.','2026-10-14T15:00:00.000Z',false);
insert into public.metas_usuario (id,perfil_id,nombre,objetivo,ahorrado,moneda) values
('h19-meta-4','h19-usuario-001','Viaje',366,171,'USD'),
('h19-meta-5','h19-usuario-002','Estudios',1438,1171,'USD'),
('h19-meta-6','h19-usuario-003','Ahorro',226,198,'USD');
insert into public.preferencias_usuario(usuario_id,categorias,encuesta_completada) values
('h19-usuario-001',array[]::text[],false),
('h19-usuario-002',array['Restaurantes']::text[],true),
('h19-usuario-003',array['Compras']::text[],true);
