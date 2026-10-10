// Catálogo ficticio equivalente a catalogo_promociones_h4.sql para desarrollo sin claves.
const beneficio = (tipo_tarjeta, texto, restricciones = '', compra_minima = null, tope_descuento = null) => ({
  tipo_tarjeta, beneficio: texto, medio_pago: tipo_tarjeta === 'black' ? 'Tarjeta Black' : 'Tarjeta Básica',
  restricciones, compra_minima, tope_descuento
});
const promocion = (id, merchant, category, image, description, detailDescription, beneficios, usageDays = null) => ({
  id, merchant, category, description, detailDescription, imageUrl: `/recursos/promociones/${image}.jpg`,
  imageAlt: { hamburguesa: 'Hamburguesa con papas', compras: 'Ropa en una tienda', cine: 'Palomitas para una película', cafe: 'Una taza de café' }[image],
  validFrom: '2026-10-09', validUntil: '2026-11-06', usageDays,
  comercio: { nombre: merchant, logoUrl: `/recursos/comercios/${id === 'siman-black' ? 'tienda' : id}.svg` },
  beneficios
});
export const catalogoPromociones = [
  promocion('restaurante', "McDonald's", 'Restaurantes', 'hamburguesa', 'Un descuento para tu próxima comida.', 'Disfruta una hamburguesa y tus acompañamientos favoritos pagando con tu tarjeta. Consulta el beneficio antes de ordenar.', [
    beneficio('basica', '10 % de descuento'), beneficio('black', '20 % de descuento')
  ]),
  promocion('tienda', 'Siman', 'Compras', 'compras', 'Renueva tus favoritos con descuento.', 'Encuentra ropa y artículos seleccionados para renovar tus favoritos. El descuento se aplica al pagar con tu tarjeta y cumplir la compra mínima.', [
    beneficio('basica', '15 % de descuento', 'Solo artículos seleccionados.', 30, 15),
    beneficio('black', '25 % de descuento', 'Solo artículos seleccionados.', 30, 25)
  ]),
  promocion('cine', 'Cinemark', 'Entretenimiento', 'cine', 'Comparte una película con un 2×1.', 'Elige una película y comparte la función: paga una entrada y recibe otra de igual precio. El beneficio está disponible de lunes a jueves.', [
    beneficio('basica', '2×1 en entradas', 'Entradas de igual precio. No aplica a funciones especiales.'),
    beneficio('black', '2×1 en entradas y 20 % en combo', 'Entradas de igual precio. No aplica a funciones especiales.')
  ], [1, 2, 3, 4]),
  promocion('starbucks', 'Starbucks', 'Restaurantes', 'cafe', 'Tu pausa de café, con descuento.', 'Haz una pausa y disfruta tu bebida favorita. Paga con tu tarjeta para recibir el descuento correspondiente a tu perfil.', [
    beneficio('basica', '10 % de descuento'), beneficio('black', '20 % de descuento')
  ]),
  promocion('siman-black', 'Siman', 'Compras', 'compras', 'Un beneficio exclusivo para tu Black.', 'Aprovecha un descuento exclusivo Black en artículos seleccionados. Esta oferta tiene su propia compra mínima y no se combina con otras promociones.', [
    beneficio('black', '30 % de descuento', 'Solo artículos seleccionados. No acumulable con otras ofertas.', 50, 30)
  ])
];
