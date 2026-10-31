// H24: adaptación de la fuente única (catalogo/catalogo.json) a la forma que devuelve la consulta de Supabase,
// para que el mock y la base sirvan el mismo catálogo.
import fuente from '../catalogo/catalogo.json' with { type: 'json' };

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

/** H8: zonas con su centro, en el orden de la fuente (columna orden de la base). */
export function zonasDeFuente(fuente) {
  return fuente.zonas.map(({ id, nombre, centro }) => ({ id, nombre, latitud: centro.latitud, longitud: centro.longitud }));
}

// El mock sirve la misma fuente que carga la migración generada.
export const catalogoPromociones = promocionesDeFuente(fuente);
export const categoriasCatalogo = categoriasDeFuente(fuente);
export const zonasCatalogo = zonasDeFuente(fuente);
