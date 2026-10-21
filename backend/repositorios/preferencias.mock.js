// Repositorio en memoria para desarrollo local sin base de datos
import fixtures from '../datos-menu.json' with { type: 'json' };
import { categoriasCatalogo } from '../catalogo.js';
const guardadas = new Map(fixtures.preferencias.filter(p => p.completada).map(p => [p.usuarioId, p.categorias]));

export function crearRepositorioPreferenciasMock() {
  return {
    async obtenerCategorias() { return structuredClone(categoriasCatalogo); },
    async guardarPreferencias(usuarioId, categorias) {
      guardadas.set(usuarioId, categorias);
    },
    async obtenerPreferencias(usuarioId) {
      const categorias = guardadas.get(usuarioId);
      return categorias 
        ? { completed: true, categories: categorias } 
        : { completed: false, categories: [] };
    }
  };
}
