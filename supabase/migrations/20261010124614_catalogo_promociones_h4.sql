-- H4: catálogo compartido, imágenes y condiciones. No modifica preferencias ni sesiones.
alter table public.comercios add column logo_url text;
alter table public.promociones
  add column imagen_url text,
  add column imagen_alt text,
  add column descripcion_detalle text not null default '',
  add column vigencia_desde date,
  add column dias_uso smallint[],
  add constraint promociones_fechas_validas check (vigencia_desde is null or vigencia_hasta is null or vigencia_desde <= vigencia_hasta),
  add constraint promociones_dias_validos check (dias_uso is null or (cardinality(dias_uso) > 0 and dias_uso <@ array[0,1,2,3,4,5,6]::smallint[] and array_position(dias_uso, null) is null));
alter table public.beneficios_tarjeta
  add column compra_minima numeric(10,2) check (compra_minima >= 0),
  add column tope_descuento numeric(10,2) check (tope_descuento >= 0);

insert into public.comercios (id, nombre, logo_url) values
  ('restaurante', 'McDonald''s', '/recursos/comercios/restaurante.svg'),
  ('tienda', 'Siman', '/recursos/comercios/tienda.svg'),
  ('cine', 'Cinemark', '/recursos/comercios/cine.svg'),
  ('starbucks', 'Starbucks', '/recursos/comercios/starbucks.svg')
on conflict (id) do update set nombre=excluded.nombre, logo_url=excluded.logo_url;

insert into public.promociones (id, merchant, category, benefit, description, payment, restrictions, orden, comercio_id, imagen_url, imagen_alt, descripcion_detalle, vigencia_desde, vigencia_hasta, dias_uso) values
  ('restaurante', 'McDonald''s', 'Restaurantes', '10 % de descuento', 'Un descuento para tu próxima comida.', 'Tarjeta Básica', '', 1, 'restaurante', '/recursos/promociones/hamburguesa.jpg', 'Hamburguesa con papas', 'Disfruta una hamburguesa y tus acompañamientos favoritos pagando con tu tarjeta. Consulta el beneficio antes de ordenar.', '2026-10-09', '2026-11-06', null),
  ('tienda', 'Siman', 'Compras', '15 % de descuento', 'Renueva tus favoritos con descuento.', 'Tarjeta Básica', 'Solo artículos seleccionados.', 2, 'tienda', '/recursos/promociones/compras.jpg', 'Ropa en una tienda', 'Encuentra ropa y artículos seleccionados para renovar tus favoritos. El descuento se aplica al pagar con tu tarjeta y cumplir la compra mínima.', '2026-10-09', '2026-11-06', null),
  ('cine', 'Cinemark', 'Entretenimiento', '2×1 en entradas', 'Comparte una película con un 2×1.', 'Tarjeta Básica', 'Entradas de igual precio. No aplica a funciones especiales.', 3, 'cine', '/recursos/promociones/cine.jpg', 'Palomitas para una película', 'Elige una película y comparte la función: paga una entrada y recibe otra de igual precio. El beneficio está disponible de lunes a jueves.', '2026-10-09', '2026-11-06', array[1,2,3,4]::smallint[]),
  ('starbucks', 'Starbucks', 'Restaurantes', '10 % de descuento', 'Tu pausa de café, con descuento.', 'Tarjeta Básica', '', 4, 'starbucks', '/recursos/promociones/cafe.jpg', 'Una taza de café', 'Haz una pausa y disfruta tu bebida favorita. Paga con tu tarjeta para recibir el descuento correspondiente a tu perfil.', '2026-10-09', '2026-11-06', null),
  ('siman-black', 'Siman', 'Compras', '30 % de descuento', 'Un beneficio exclusivo para tu Black.', 'Tarjeta Black', 'Solo artículos seleccionados. No acumulable con otras ofertas.', 5, 'tienda', '/recursos/promociones/compras.jpg', 'Ropa en una tienda', 'Aprovecha un descuento exclusivo Black en artículos seleccionados. Esta oferta tiene su propia compra mínima y no se combina con otras promociones.', '2026-10-09', '2026-11-06', null)
on conflict (id) do update set merchant=excluded.merchant, category=excluded.category, benefit=excluded.benefit, description=excluded.description, payment=excluded.payment, restrictions=excluded.restrictions, orden=excluded.orden, comercio_id=excluded.comercio_id, imagen_url=excluded.imagen_url, imagen_alt=excluded.imagen_alt, descripcion_detalle=excluded.descripcion_detalle, vigencia_desde=excluded.vigencia_desde, vigencia_hasta=excluded.vigencia_hasta, dias_uso=excluded.dias_uso;

insert into public.beneficios_tarjeta (promocion_id, tipo_tarjeta, beneficio, medio_pago, restricciones, compra_minima, tope_descuento) values
  ('restaurante', 'basica', '10 % de descuento', 'Tarjeta Básica', '', null, null),
  ('restaurante', 'black', '20 % de descuento', 'Tarjeta Black', '', null, null),
  ('tienda', 'basica', '15 % de descuento', 'Tarjeta Básica', 'Solo artículos seleccionados.', 30, 15),
  ('tienda', 'black', '25 % de descuento', 'Tarjeta Black', 'Solo artículos seleccionados.', 30, 25),
  ('cine', 'basica', '2×1 en entradas', 'Tarjeta Básica', 'Entradas de igual precio. No aplica a funciones especiales.', null, null),
  ('cine', 'black', '2×1 en entradas y 20 % en combo', 'Tarjeta Black', 'Entradas de igual precio. No aplica a funciones especiales.', null, null),
  ('starbucks', 'basica', '10 % de descuento', 'Tarjeta Básica', '', null, null),
  ('starbucks', 'black', '20 % de descuento', 'Tarjeta Black', '', null, null),
  ('siman-black', 'black', '30 % de descuento', 'Tarjeta Black', 'Solo artículos seleccionados. No acumulable con otras ofertas.', 50, 30)
on conflict (promocion_id, tipo_tarjeta) do update set beneficio=excluded.beneficio, medio_pago=excluded.medio_pago, restricciones=excluded.restricciones, compra_minima=excluded.compra_minima, tope_descuento=excluded.tope_descuento;
