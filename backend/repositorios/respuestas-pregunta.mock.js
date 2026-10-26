// H23: respuestas a la pregunta en contexto en memoria, para desarrollo y pruebas sin Supabase.
// Estado del módulo compartido por todos los repositorios mock, como una tabla con clave (usuario, pregunta, valor).
const memoria = new Map();
const clave = (usuarioId, pregunta, valor) => JSON.stringify([usuarioId, pregunta, valor]);

/** Solo para pruebas: vuelve al estado inicial, sin respuestas. */
export function reiniciarRespuestasMock() { memoria.clear(); }

/** @returns {import('./contrato.js').RepositorioRespuestasPregunta} */
export function crearRepositorioRespuestasMock(reloj = () => new Date()) {
  return {
    async listar(usuarioId) {
      return [...memoria.values()].filter(fila => fila.usuarioId === usuarioId).map(({ usuarioId: _usuario, ...respuesta }) => ({ ...respuesta }));
    },
    async guardar(usuarioId, { pregunta, valor, respuesta }) {
      memoria.set(clave(usuarioId, pregunta, valor), { usuarioId, pregunta, valor, respuesta, respondidaEn: reloj().toISOString() });
    }
  };
}
