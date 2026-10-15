import { randomUUID } from 'node:crypto';

const metaVista = m => ({ id: m.id, nombre: m.nombre, objetivo: Number(m.objetivo), ahorrado: Number(m.ahorrado), moneda: m.moneda });
const mensajeVista = m => ({ id: m.id, titulo: m.titulo, texto: m.texto, fecha: m.fecha, leido: m.leido });
function resultado({ data, error }) {
  if (error) throw new Error('No se pudieron consultar o guardar los datos.');
  return data;
}

export function crearRepositorioProductosSupabase(cliente) {
  return {
    async resumen(perfilId) {
      const respuestas = await Promise.all([
        cliente.from('tarjetas_usuario').select('id,producto_id,numero_enmascarado,saldo,moneda,orden').eq('perfil_id', perfilId).order('orden'),
        cliente.from('productos_tarjeta').select('id,nombre,modalidad,red,descripcion,orden').order('orden'),
        cliente.from('puntos_usuario').select('acumulados').eq('perfil_id', perfilId).maybeSingle(),
        cliente.from('mensajes_usuario').select('id', { count: 'exact', head: true }).eq('perfil_id', perfilId).eq('leido', false)
      ]);
      const [tarjetas, productos, puntos] = respuestas.map(resultado);
      return { tarjetas: (tarjetas ?? []).map(t => ({ id: t.id, productoId: t.producto_id, numeroEnmascarado: t.numero_enmascarado, saldo: Number(t.saldo), moneda: t.moneda, producto: productos.find(p => p.id === t.producto_id) })), puntos: puntos?.acumulados ?? 0, productosDisponibles: productos ?? [], mensajesPendientes: respuestas[3].count ?? 0 };
    },
    async listarMensajes(perfilId) {
      return (resultado(await cliente.from('mensajes_usuario').select('id,titulo,texto,fecha,leido').eq('perfil_id', perfilId).order('fecha', { ascending: false })) ?? []).map(mensajeVista);
    },
    async leerMensaje(perfilId, id) {
      const data = resultado(await cliente.from('mensajes_usuario').update({ leido: true }).eq('perfil_id', perfilId).eq('id', id).select('id,titulo,texto,fecha,leido').maybeSingle());
      return data ? mensajeVista(data) : null;
    },
    async listarMetas(perfilId) {
      return (resultado(await cliente.from('metas_usuario').select('id,nombre,objetivo,ahorrado,moneda').eq('perfil_id', perfilId).order('creada_en')) ?? []).map(metaVista);
    },
    async crearMeta(perfilId, datos) {
      return metaVista(resultado(await cliente.from('metas_usuario').insert({ ...datos, id: randomUUID(), perfil_id: perfilId }).select('id,nombre,objetivo,ahorrado,moneda').single()));
    },
    async editarMeta(perfilId, id, datos) {
      const data = resultado(await cliente.from('metas_usuario').update(datos).eq('perfil_id', perfilId).eq('id', id).select('id,nombre,objetivo,ahorrado,moneda').maybeSingle());
      return data ? metaVista(data) : null;
    },
    async eliminarMeta(perfilId, id) {
      return Boolean(resultado(await cliente.from('metas_usuario').delete().eq('perfil_id', perfilId).eq('id', id).select('id').maybeSingle()));
    }
  };
}
