import { randomUUID } from 'node:crypto';
import fixtures from '../datos-menu.json' with { type: 'json' };

export function crearRepositorioProductosMock(datos = fixtures) {
  const { cuentas = [], tarjetas = [], productos = [], puntos = [], mensajes = [], metas = [] } = structuredClone(datos);
  const propias = (filas, perfilId) => structuredClone(filas.filter(f => f.perfilId === perfilId));
  const listarTarjetas = async perfilId => propias(tarjetas, perfilId).map(t => {
    const cuenta = cuentas.find(c => c.id === t.cuentaId && c.perfilId === perfilId);
    if (!cuenta) throw new Error('La tarjeta no tiene cuenta propia asociada.');
    return { ...t, cuenta:{id:cuenta.id,numeroCompleto:cuenta.numeroCompleto}, producto:productos.find(p => p.id === t.productoId) };
  });
  return {
    listarTarjetas,
    async resumen(perfilId) {
      return { tarjetas: await listarTarjetas(perfilId), puntos: puntos.find(p => p.perfilId === perfilId)?.acumulados ?? 0, productosDisponibles: structuredClone(productos), mensajesPendientes: mensajes.filter(m => m.perfilId === perfilId && !m.leido).length };
    },
    async listarMensajes(perfilId) { return propias(mensajes, perfilId); },
    async leerMensaje(perfilId, id) {
      const fila = mensajes.find(m => m.perfilId === perfilId && m.id === id);
      if (!fila) return null;
      fila.leido = true;
      return structuredClone(fila);
    },
    async listarMetas(perfilId) { return propias(metas, perfilId); },
    async crearMeta(perfilId, datos) {
      const fila = { ...datos, perfilId, id: randomUUID() };
      metas.push(fila);
      return structuredClone(fila);
    },
    async editarMeta(perfilId, id, datos) {
      const fila = metas.find(m => m.perfilId === perfilId && m.id === id);
      if (!fila) return null;
      Object.assign(fila, datos);
      return structuredClone(fila);
    },
    async eliminarMeta(perfilId, id) {
      const indice = metas.findIndex(m => m.perfilId === perfilId && m.id === id);
      if (indice < 0) return false;
      metas.splice(indice, 1);
      return true;
    }
  };
}
