// H8: zona elegida como origen. Se guarda como señal declarada criterio·zona (registro de H22); solo una activa.
import { getJSON } from '../comun.js';

export const SENAL_ZONA = valor => ({ clase: 'criterio', ambito: 'zona', valor, origen: 'pregunta' });
const esZona = senal => senal.clase === 'criterio' && senal.ambito === 'zona';

/** Zona de la señal activa, o null. */
export function zonaDeSenales(senales) {
  return (senales ?? []).find(esZona)?.valor ?? null;
}

/** Ids de las señales de zona que hay que desactivar al elegir otra. */
export function senalesZonaPorQuitar(senales, nueva) {
  return (senales ?? []).filter(senal => esZona(senal) && senal.valor !== nueva).map(senal => senal.id);
}

let zonas = null;

/** Lista fija de zonas con su centro; se pide una vez por página. */
export function cargarZonas() {
  zonas ??= getJSON('/api/zonas').then(respuesta => respuesta.zonas).catch(error => { zonas = null; throw error; });
  return zonas;
}

async function leerSenales() {
  return (await getJSON('/api/senales')).senales ?? [];
}

/** Zona guardada en el perfil, o null si no hay o no se pudo leer. */
export async function leerZonaGuardada() {
  try { return zonaDeSenales(await leerSenales()); } catch { return null; }
}

const enviar = (method, cuerpo) => fetch('/api/senales', {
  method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo)
});

/** Declara la zona y desactiva las anteriores. Si falla, la zona sigue valiendo durante la visita. */
export async function guardarZona(zonaId) {
  try {
    const anteriores = senalesZonaPorQuitar(await leerSenales(), zonaId);
    await enviar('POST', SENAL_ZONA(zonaId));
    await Promise.all(anteriores.map(id => enviar('PATCH', { id, activa: false })));
  } catch { /* La elección se conserva en la visita aunque no se guarde. */ }
}
