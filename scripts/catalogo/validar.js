// Validación de la fuente única del catálogo (H24): la forma según catalogo/esquema.json y las reglas entre entidades.
// Las reglas de cantidades, variedad y vocabulario de ocasiones se completan en SCRUM-126.
import Ajv2020 from 'ajv/dist/2020.js';
import esquema from '../../catalogo/esquema.json' with { type: 'json' };
import { sucursalesParticipantes } from '../../backend/catalogo.js';

export const esquemaCatalogo = esquema;

// Rectángulo que contiene El Salvador; descarta coordenadas de otros países o invertidas.
export const LIMITES_EL_SALVADOR = { latitud: [13.1, 14.5], longitud: [-90.2, -87.6] };

const validarForma = new Ajv2020({ allErrors: true, strictTypes: false }).compile(esquema);

/** @returns {string[]} errores de forma; vacío si la fuente cumple el esquema. */
export function validarEsquema(catalogo) {
  if (validarForma(catalogo)) return [];
  return validarForma.errors.map(error => `${error.instancePath || '/'} ${error.message}`);
}

function esFecha(valor) {
  const fecha = new Date(valor + 'T00:00:00Z');
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(valor);
}

const dentroDeElSalvador = ({ latitud, longitud }) =>
  latitud >= LIMITES_EL_SALVADOR.latitud[0] && latitud <= LIMITES_EL_SALVADOR.latitud[1] &&
  longitud >= LIMITES_EL_SALVADOR.longitud[0] && longitud <= LIMITES_EL_SALVADOR.longitud[1];

/**
 * @param {object} catalogo fuente única (catalogo/catalogo.json)
 * @param {{ existeArchivo?: (ruta: string) => boolean }} [opciones] comprueba las imágenes dentro de public/
 * @returns {{ errores: Array<{regla: string, entidad: string, id: string|null, mensaje: string}>, avisos: Array<{regla: string, entidad: string, id: string, mensaje: string}> }}
 */
export function validarCatalogo(catalogo, { existeArchivo } = {}) {
  const forma = validarEsquema(catalogo);
  if (forma.length) return { errores: forma.map(mensaje => ({ regla: 'esquema', entidad: 'catalogo', id: null, mensaje })), avisos: [] };

  const errores = [];
  const avisos = [];
  const error = (regla, entidad, id, mensaje) => errores.push({ regla, entidad, id, mensaje });

  for (const entidad of ['ocasiones', 'etiquetasIntencion', 'zonas', 'categorias', 'subcategorias', 'comercios', 'sucursales', 'promociones']) {
    const vistos = new Set();
    for (const { id } of catalogo[entidad]) {
      if (vistos.has(id)) error('id-duplicado', entidad, id, `El identificador ${id} se repite.`);
      vistos.add(id);
    }
  }
  const indice = entidad => new Map(catalogo[entidad].map(item => [item.id, item]));
  const [categorias, subcategorias, comercios, zonas, ocasiones, etiquetas, sucursales] =
    ['categorias', 'subcategorias', 'comercios', 'zonas', 'ocasiones', 'etiquetasIntencion', 'sucursales'].map(indice);
  const existe = (entidad, id, campo, valor, destino) => {
    if (destino.has(valor)) return true;
    error('referencia', entidad, id, `${campo} ${valor} no existe.`);
    return false;
  };
  const vectorCompleto = vector => catalogo.ocasiones.every(({ id }) => id in vector);

  for (const subcategoria of catalogo.subcategorias) existe('subcategorias', subcategoria.id, 'La categoría', subcategoria.categoria, categorias);

  for (const comercio of catalogo.comercios) {
    existe('comercios', comercio.id, 'La categoría', comercio.categoria, categorias);
    if (existe('comercios', comercio.id, 'La subcategoría', comercio.subcategoria, subcategorias)) {
      const propia = subcategorias.get(comercio.subcategoria).categoria;
      if (propia !== comercio.categoria) {
        error('referencia', 'comercios', comercio.id, `La subcategoría ${comercio.subcategoria} pertenece a ${propia}, no a ${comercio.categoria}.`);
      }
    }
    const valores = Object.values(comercio.ocasiones);
    if (comercio.sensible) {
      if (valores.length) error('sensible', 'comercios', comercio.id, 'Un comercio sensible deja vacías sus ocasiones.');
    } else if (!vectorCompleto(comercio.ocasiones)) {
      error('ocasiones-incompletas', 'comercios', comercio.id, 'Faltan ocasiones: el vector lleva un valor por cada una.');
    } else if (valores.every(valor => valor === 0)) {
      avisos.push({ regla: 'vector-vacio', entidad: 'comercios', id: comercio.id, mensaje: 'Todas sus ocasiones valen 0.' });
    }
  }

  for (const zona of catalogo.zonas) {
    if (!dentroDeElSalvador(zona.centro)) error('coordenadas', 'zonas', zona.id, 'El centro de la zona está fuera de El Salvador.');
  }
  for (const sucursal of catalogo.sucursales) {
    existe('sucursales', sucursal.id, 'El comercio', sucursal.comercio, comercios);
    existe('sucursales', sucursal.id, 'La zona', sucursal.zona, zonas);
    if (!dentroDeElSalvador(sucursal.coordenadas)) error('coordenadas', 'sucursales', sucursal.id, 'La sucursal está fuera de El Salvador.');
  }

  const conCobertura = new Set();
  const pares = new Set();
  for (const cobertura of catalogo.cobertura) {
    const id = `${cobertura.comercio}/${cobertura.zona}`;
    if (pares.has(id)) error('id-duplicado', 'cobertura', id, `La cobertura de ${id} se repite.`);
    pares.add(id);
    existe('cobertura', id, 'El comercio', cobertura.comercio, comercios);
    existe('cobertura', id, 'La zona', cobertura.zona, zonas);
    conCobertura.add(cobertura.comercio);
  }
  for (const relacion of catalogo.relaciones) {
    existe('relaciones', `${relacion.interesA}/${relacion.interesB}`, 'La ocasión', relacion.ocasionRequerida, ocasiones);
  }

  const descripciones = new Map();
  for (const promocion of catalogo.promociones) {
    const { id } = promocion;
    for (const texto of [promocion.descripcion, promocion.descripcionDetalle]) {
      const clave = texto.trim().toLowerCase();
      if (descripciones.has(clave)) error('descripcion-duplicada', 'promociones', id, `Repite la descripción de ${descripciones.get(clave)}.`);
      else descripciones.set(clave, id);
    }
    const { desde, hasta } = promocion.vigencia;
    if (!esFecha(desde) || !esFecha(hasta) || desde > hasta) error('vigencia', 'promociones', id, `Vigencia no válida: ${desde} a ${hasta}.`);
    const tarjetas = promocion.beneficios.map(beneficio => beneficio.tarjeta);
    if (new Set(tarjetas).size !== tarjetas.length) error('beneficio-duplicado', 'promociones', id, 'Hay más de un beneficio para la misma tarjeta.');
    for (const etiqueta of promocion.etiquetasIntencion) {
      if (!etiquetas.has(etiqueta)) error('etiqueta', 'promociones', id, `La etiqueta de intención ${etiqueta} no está en el vocabulario.`);
    }
    if (!existe('promociones', id, 'El comercio', promocion.comercio, comercios)) continue;

    const comercio = comercios.get(promocion.comercio);
    if (promocion.ocasiones) {
      if (comercio.sensible) error('sensible', 'promociones', id, 'Una promoción de un comercio sensible no lleva ocasiones.');
      else if (!vectorCompleto(promocion.ocasiones)) error('ocasiones-incompletas', 'promociones', id, 'Si sobrescribe las ocasiones, lleva todas.');
    }
    for (const sucursal of promocion.sucursales ?? []) {
      if (!existe('promociones', id, 'La sucursal', sucursal, sucursales)) continue;
      if (sucursales.get(sucursal).comercio !== promocion.comercio) {
        error('sucursal-ajena', 'promociones', id, `La sucursal ${sucursal} no es de ${promocion.comercio}.`);
      }
    }
    if (promocion.canales.includes('presencial') && !sucursalesParticipantes(promocion, catalogo.sucursales).length) {
      error('presencial-sin-sucursales', 'promociones', id, 'Una promoción presencial necesita al menos una sucursal participante.');
    }
    if (promocion.canales.includes('delivery') && !conCobertura.has(promocion.comercio)) {
      error('delivery-sin-cobertura', 'promociones', id, `${promocion.comercio} no declara su cobertura por zona.`);
    }
  }

  if (existeArchivo) {
    const imagenes = [
      ...catalogo.categorias.flatMap(categoria => [['categorias', categoria.id, categoria.icono], ['categorias', categoria.id, categoria.imagen]]),
      ...catalogo.comercios.map(comercio => ['comercios', comercio.id, comercio.logo]),
      ...catalogo.promociones.map(promocion => ['promociones', promocion.id, promocion.imagen])
    ];
    for (const [entidad, id, ruta] of imagenes) {
      if (ruta && !existeArchivo(ruta)) error('imagen-inexistente', entidad, id, `No existe public${ruta}.`);
    }
  }
  return { errores, avisos };
}
