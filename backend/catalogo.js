// H24: adaptación de la fuente única (catalogo/catalogo.json) a la forma que devuelve la consulta de Supabase,
// para que el mock y la base sirvan el mismo catálogo.

const porId = (a, b) => a.id.localeCompare(b.id);

/** Sucursales donde participa la promoción: las de su lista o, si no hay lista, todas las del comercio (regla de H8). */
export function sucursalesParticipantes(promocion, sucursales) {
  if (!promocion.canales.includes('presencial')) return [];
  const participa = promocion.sucursales
    ? sucursal => promocion.sucursales.includes(sucursal.id)
    : sucursal => sucursal.comercio === promocion.comercio;
  return sucursales.filter(participa).sort(porId);
}

/** Beneficio que llenan las columnas anteriores de promociones (benefit, payment): el de Básica si existe. */
export const beneficioPrincipal = beneficios => beneficios.find(beneficio => beneficio.tarjeta === 'basica') ?? beneficios[0];

/** @returns {Array<object>} promociones con comercio, sucursales y beneficios, como en la consulta del adaptador Supabase */
export function promocionesDeFuente(fuente) {
  const comercios = new Map(fuente.comercios.map(comercio => [comercio.id, comercio]));
  const subcategorias = new Map(fuente.subcategorias.map(subcategoria => [subcategoria.id, subcategoria]));
  const categorias = new Map(fuente.categorias.map(categoria => [categoria.id, categoria]));
  return structuredClone(fuente.promociones.map(promocion => {
    const comercio = comercios.get(promocion.comercio);
    const subcategoria = subcategorias.get(comercio.subcategoria);
    const principal = beneficioPrincipal(promocion.beneficios);
    return {
      id: promocion.id, merchant: comercio.nombre, category: comercio.categoria, benefit: principal.beneficio,
      description: promocion.descripcion, payment: principal.medioPago, restrictions: promocion.restricciones,
      imageUrl: promocion.imagen, imageAlt: promocion.textoAlternativo, detailDescription: promocion.descripcionDetalle,
      validFrom: promocion.vigencia.desde, validUntil: promocion.vigencia.hasta, usageDays: promocion.dias,
      title: promocion.titulo, conditions: promocion.condiciones, instructions: promocion.instrucciones, channels: promocion.canales,
      benefitType: promocion.tipoBeneficio, decisiveCondition: promocion.condicionDecisiva, intentTags: promocion.etiquetasIntencion,
      addedOn: promocion.alta, occasions: promocion.ocasiones ?? null, priceLevel: promocion.nivelPrecio ?? null,
      categoria: { nombre: categorias.get(comercio.categoria).nombre },
      comercio: {
        id: comercio.id, nombre: comercio.nombre, logoUrl: comercio.logo, priceLevel: comercio.nivelPrecio, occasions: comercio.ocasiones,
        recognizable: comercio.reconocible, sensitive: comercio.sensible, refineBy: comercio.afinarPor,
        subcategoria: subcategoria ? { id: subcategoria.id, nombre: subcategoria.nombre } : null,
        cobertura: fuente.cobertura.filter(cobertura => cobertura.comercio === comercio.id)
          .map(cobertura => ({ zonaId: cobertura.zona, estado: cobertura.estado }))
          .sort((a, b) => a.zonaId.localeCompare(b.zonaId))
      },
      sucursales: sucursalesParticipantes(promocion, fuente.sucursales).map(sucursal => ({ sucursal: {
        id: sucursal.id, nombre: sucursal.nombre, direccion: sucursal.direccion,
        latitud: sucursal.coordenadas.latitud, longitud: sucursal.coordenadas.longitud, zonaId: sucursal.zona
      } })),
      beneficios: promocion.beneficios.map(beneficio => ({
        tipo_tarjeta: beneficio.tarjeta, beneficio: beneficio.beneficio, medio_pago: beneficio.medioPago,
        restricciones: beneficio.restricciones, compra_minima: beneficio.compraMinima, tope_descuento: beneficio.tope
      }))
    };
  }));
}

/** @returns {Array<object>} categorías como las entrega /api/categorias, con subcategorías ordenadas por nombre */
export function categoriasDeFuente(fuente) {
  return structuredClone(fuente.categorias.map(categoria => ({
    id: categoria.id, nombre: categoria.nombre, icono_url: categoria.icono, imagen_url: categoria.imagen, orden: categoria.orden,
    subcategorias: fuente.subcategorias.filter(subcategoria => subcategoria.categoria === categoria.id)
      .map(({ id, nombre }) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  })));
}

// Catálogo ficticio equivalente a catalogo_promociones_h4.sql para desarrollo sin claves.
const beneficio =(tipo_tarjeta, texto, restricciones = '', compra_minima = null, tope_descuento = null) => ({
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
