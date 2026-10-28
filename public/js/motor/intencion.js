// H25 (SCRUM-17 / SCRUM-118): término puro T («Hoy busco») conectado al motor por ReglasExternas.intencion.
// Usa las 11 ocasiones en su orden y la etiqueta de intención «Regalo» del catálogo de H24 (SCRUM-123).
import { CONFIGURACION } from './config.js';

const congelar = objeto => Object.freeze(objeto);

// `corto` es la palabra visible del chip (comentario 10035 de SCRUM-118); `nombre` es su nombre accesible y la contiene.
export const CHIPS_HOY_BUSCO = congelar([
  congelar({ id: 'dia-a-dia', nombre: 'Compras del día a día', corto: 'Día a día', tipo: 'ocasion' }),
  congelar({ id: 'rapido-practico', nombre: 'Rápido y práctico', corto: 'Rápido', tipo: 'ocasion' }),
  congelar({ id: 'darse-un-gusto', nombre: 'Darse un gusto', corto: 'Gusto', tipo: 'ocasion' }),
  congelar({ id: 'salir', nombre: 'Salir con amigos o pareja', corto: 'Salir', tipo: 'ocasion' }),
  congelar({ id: 'familia', nombre: 'Planes en familia', corto: 'Familia', tipo: 'ocasion' }),
  congelar({ id: 'bienestar', nombre: 'Bienestar y vida activa', corto: 'Bienestar', tipo: 'ocasion' }),
  congelar({ id: 'entretenimiento', nombre: 'Entretenimiento', corto: 'Entretenimiento', tipo: 'ocasion' }),
  congelar({ id: 'estilo-personal', nombre: 'Estilo personal', corto: 'Estilo', tipo: 'ocasion' }),
  congelar({ id: 'tecnologia', nombre: 'Tecnología', corto: 'Tecnología', tipo: 'ocasion' }),
  congelar({ id: 'hogar', nombre: 'Hogar', corto: 'Hogar', tipo: 'ocasion' }),
  congelar({ id: 'viajes', nombre: 'Viajes y escapadas', corto: 'Viajes', tipo: 'ocasion' }),
  congelar({ id: 'regalo', nombre: 'Regalo', corto: 'Regalo', tipo: 'etiqueta' })
]);

const POR_ID = new Map(CHIPS_HOY_BUSCO.map(chip => [chip.id, chip]));

/** Devuelve el identificador si corresponde a un chip válido de «Hoy busco», o null. */
export function normalizarIntencion(valor) {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  return POR_ID.has(limpio) ? limpio : null;
}

/**
 * Valida el parámetro temporal `intencion` en la consulta de /api/para-ti.
 * @param {URLSearchParams} parametros
 * @returns {{ ok: true, intencion: string | null } | { ok: false }}
 */
export function leerIntencionTemporal(parametros) {
  const valores = parametros.getAll('intencion');
  if (valores.length === 0) return { ok: true, intencion: null };
  if (valores.length !== 1) return { ok: false };
  const intencion = normalizarIntencion(valores[0]);
  return intencion ? { ok: true, intencion } : { ok: false };
}

/**
 * H25 (CDA 2): T = 1 cuando la promoción coincide con el chip activo por su ocasión
 * (con el umbral definido en la configuración versionada) o por su etiqueta de intención.
 */
export function calcularTerminoIntencion(oferta, intencionId, config = CONFIGURACION) {
  const chip = normalizarIntencion(intencionId);
  if (!oferta || !chip) return 0;
  if (Array.isArray(oferta.intentTags) && oferta.intentTags.includes(chip)) return 1;
  const umbral = config?.umbralOcasion ?? CONFIGURACION.umbralOcasion;
  const valorOcasion = Number(oferta.occasions?.[chip] ?? 0);
  return valorOcasion >= umbral ? 1 : 0;
}

/** Función pura para conectar en `ordenarParaTi({ reglas: { intencion: reglaIntencion(chip) } })`. */
export function reglaIntencion(intencionId) {
  const chip = normalizarIntencion(intencionId);
  if (!chip) return () => 0;
  return (oferta, config = CONFIGURACION) => calcularTerminoIntencion(oferta, chip, config);
}

/** H25 (CDA 3): mensaje que anuncia el reordenamiento cuando hay un chip activo. */
export function textoPrimeroHoyBusco(intencionId) {
  const chip = POR_ID.get(normalizarIntencion(intencionId));
  return chip ? `Primero: ${chip.nombre.toLowerCase()}` : '';
}
