import { validarCambios } from './modelo.js';
import { generarHash } from '../backend/servicios/contrasenas.js';
import { createHash } from 'node:crypto';
import { crearAlmacenImagenes } from './imagenes.js';

export function errorMidi(mensaje, estado = 503) { return Object.assign(new Error(mensaje), { estado }); }

/** Caché compartida, agrupación de lecturas y deduplicación de escrituras por proceso local. */
export function crearServicioMidi(cliente, { reloj = Date.now, imagenes = crearAlmacenImagenes() } = {}) {
  let cache, leyendo, falloLectura, enfriarHasta = -1, revision = 0;
  const peticiones = new Map();
  const guardados = [];
  const envolver = datos => ({ datos, consultadoEn: new Date(reloj()).toISOString() });
  // Acepta tanto el SDK real (builder con abortSignal) como transportes inyectados en tests.
  async function consultar(nombre, parametros) {
    const builder = cliente.rpc(nombre, parametros);
    // El transporte conserva un único request y un timeout del SDK cuando está disponible.
    try {
      const { data, error } = await (builder?.abortSignal ? builder.abortSignal(AbortSignal.timeout(15000)) : builder);
      if (error) {
        const mensajes = { PT409: ['Los datos cambiaron. Actualiza y revisa tus cambios.', 409], '23505': ['Identificador o usuario de acceso duplicado.', 400], '23503': ['Existen relaciones pendientes o una referencia no válida.', 400], '23514': ['Los datos no cumplen las restricciones de la base.', 400], '23502': ['Falta un campo obligatorio.', 400], '22023': ['Lote no válido.', 400] };
        const [mensaje, estado] = mensajes[error.code] || ['No se pudo completar la operación. Revisa la conexión y la preparación de Midi.', 503];
        throw Object.assign(errorMidi(mensaje, estado), { codigo: error.code });
      }
      return envolver(data);
    } catch (e) { if (e.estado) throw e; throw errorMidi('No se pudo confirmar la respuesta de Supabase. Comprueba los datos antes de repetir el guardado.'); }
  }
  return {
    async leer() {
      if (cache && reloj() - cache.instante < 30000) return cache.valor;
      if (leyendo) return leyendo;
      if (reloj() < enfriarHasta) throw falloLectura;
      const revisionLectura = revision;
      leyendo = consultar('midi_leer_datos').then(valor => {
        if (revisionLectura !== revision && cache) return cache.valor;
        cache = { instante: reloj(), valor }; return valor;
      })
        .catch(e => { falloLectura = e; enfriarHasta = reloj() + 5000; throw e; }).finally(() => { leyendo = null; });
      return leyendo;
    },
    async guardar(id, cambios, archivos = []) {
      if (typeof id !== 'string' || !/^[\w-]{1,100}$/.test(id)) throw errorMidi('Identificador de petición no válido.', 400);
      try { validarCambios(cambios); } catch (e) { throw errorMidi(e.message, 400); }
      if (!cambios.length) throw errorMidi('No hay cambios para guardar.', 400);
      if (Buffer.byteLength(JSON.stringify(cambios)) > 1048576) throw errorMidi('El lote de datos supera 1 MB.', 413);
      const cuerpo = createHash('sha256').update(JSON.stringify({ cambios, archivos })).digest('hex');
      for (const [clave, p] of peticiones) if (reloj() - p.instante > 600000) peticiones.delete(clave);
      if (peticiones.has(id)) {
        const p = peticiones.get(id);
        if (p.cuerpo !== cuerpo) throw errorMidi('El identificador de petición ya tiene otros cambios.', 409);
        return p.promesa;
      }
      while (guardados.length && reloj() - guardados[0] >= 60000) guardados.shift();
      if ((guardados.length && reloj() - guardados.at(-1) < 2000) || guardados.length >= 10 || peticiones.size >= 128) throw errorMidi('Espera unos segundos antes de volver a guardar.', 429);
      guardados.push(reloj());
      const preparados = cambios.map(c => {
        if (c.tabla !== 'perfiles' || c.operacion === 'eliminar') return c;
        const { contrasena, ...datos } = c.datos;
        if (contrasena) datos.contrasena_hash = generarHash(contrasena);
        if (datos.usuario_acceso === null) datos.contrasena_hash = null;
        return { ...c, datos };
      });
      const promesa = imagenes.guardar(cambios, archivos).then(() => consultar('midi_guardar_cambios', { cambios: preparados })).then(valor => { revision++; cache = { instante: reloj(), valor }; return valor; })
        .catch(e => { if (e.estado === 503) { cache = undefined; revision++; } throw e; });
      peticiones.set(id, { cuerpo, promesa, instante: reloj() });
      return promesa;
    }
  };
}
