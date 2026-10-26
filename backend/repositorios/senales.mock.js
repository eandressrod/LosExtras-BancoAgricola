// H22: registro de señales en memoria para desarrollo y pruebas sin Supabase.
// Las señales iniciales se derivan de las preferencias de prueba, como hace la migración con preferencias_usuario.
import fixtures from '../datos-menu.json' with { type: 'json' };

const CREADAS_EN = '2026-10-22T00:00:00.000Z';
// Estado del módulo compartido por todos los repositorios mock, como una tabla; siguiente imita la identidad de Postgres.
const memoria = { filas: [], siguiente: 1 };

function sembrar() {
  memoria.filas = [];
  memoria.siguiente = 1;
  for (const { usuarioId, categorias, completada } of fixtures.preferencias) {
    if (!completada) continue;
    for (const valor of categorias) agregar(usuarioId, { clase: 'interes', ambito: 'categoria', valor, origen: 'encuesta' }, CREADAS_EN);
  }
}

function agregar(usuarioId, { clase, ambito, valor, origen, quitoEleccion }, creadaEn = new Date().toISOString()) {
  const fila = { id: memoria.siguiente++, usuarioId, clase, ambito, valor, origen, creadaEn, activa: true, ...(quitoEleccion && { quitoEleccion: true }) };
  memoria.filas.push(fila);
  return fila;
}

// La fila interna guarda el usuario; la señal que sale del repositorio no lo expone.
const aSenal = ({ usuarioId, ...senal }) => ({ ...senal });
const misma = (usuarioId, { clase, ambito, valor }) => fila =>
  fila.usuarioId === usuarioId && fila.clase === clase && fila.ambito === ambito && fila.valor === valor;

/** Solo para pruebas: vuelve al estado inicial derivado de las preferencias de prueba. */
export function reiniciarSenalesMock() { sembrar(); }
sembrar();

/** @returns {import('./contrato.js').RepositorioSenales} */
export function crearRepositorioSenalesMock() {
  const repo = {
    async listarActivas(usuarioId) {
      return memoria.filas.filter(fila => fila.usuarioId === usuarioId && fila.activa).map(aSenal);
    },
    async activar(usuarioId, senal) {
      const existente = memoria.filas.find(misma(usuarioId, senal));
      if (!existente) return aSenal(agregar(usuarioId, senal));
      Object.assign(existente, { activa: true, origen: senal.origen });
      // H23: como la columna quito_eleccion, cada declaración fija de nuevo si quitó la elección.
      if (senal.quitoEleccion) existente.quitoEleccion = true;
      else delete existente.quitoEleccion;
      return aSenal(existente);
    },
    async cambiarEstado(usuarioId, id, activa) {
      const fila = memoria.filas.find(item => item.usuarioId === usuarioId && item.id === id);
      if (!fila) return null;
      fila.activa = activa;
      return aSenal(fila);
    },
    // Espejo de /api/preferencias: activa las categorías elegidas y desactiva las que se quitaron.
    async sincronizarCategorias(usuarioId, categorias, origen) {
      for (const valor of categorias) await repo.activar(usuarioId, { clase: 'interes', ambito: 'categoria', valor, origen });
      for (const fila of memoria.filas) {
        if (fila.usuarioId === usuarioId && fila.clase === 'interes' && fila.ambito === 'categoria' && !categorias.includes(fila.valor)) fila.activa = false;
      }
    }
  };
  return repo;
}
