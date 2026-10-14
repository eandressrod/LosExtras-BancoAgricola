// Repositorio en memoria para desarrollo local sin base de datos
const guardadas = new Map();

export function crearRepositorioPreferenciasMock() {
  return {
    async obtenerCategorias() { return ['Restaurantes','Compras','Entretenimiento'].map((id, orden) => ({ id, nombre: id, imagen_url: null, orden })); },
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
