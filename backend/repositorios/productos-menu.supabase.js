import { randomUUID } from 'node:crypto';

const metaVista = m => ({ id: m.id, nombre: m.nombre, objetivo: Number(m.objetivo), ahorrado: Number(m.ahorrado), moneda: m.moneda });
const mensajeVista = m => ({ id: m.id, titulo: m.titulo, texto: m.texto, fecha: m.fecha, leido: m.leido });
function resultado({ data, error }) {
  if (error) throw new Error('No se pudieron consultar o guardar los datos.');
  return data;
}

export function crearRepositorioProductosSupabase(cliente) {
  const listarTarjetas = async perfilId => (resultado(await cliente.from('tarjetas_usuario')
    .select('id,cuenta_id,tipo_tarjeta,producto_id,numero_enmascarado,saldo,moneda,orden,producto:productos_tarjeta(id,nombre,modalidad,red,descripcion),cuenta:cuentas!tarjetas_usuario_cuenta_propietario_fkey(id,numero_completo)')
    .eq('perfil_id',perfilId).order('orden')) ?? []).map(t => ({
      id:t.id,cuentaId:t.cuenta_id,tipoTarjeta:t.tipo_tarjeta,productoId:t.producto_id,
      numeroEnmascarado:t.numero_enmascarado,saldo:Number(t.saldo),moneda:t.moneda,
      producto:t.producto,cuenta:{id:t.cuenta.id,numeroCompleto:t.cuenta.numero_completo}
    }));
  return {
    listarTarjetas,
    async resumen(perfilId) {
      const respuestas = await Promise.all([
        listarTarjetas(perfilId),
        cliente.from('productos_tarjeta').select('id,nombre,modalidad,red,descripcion,orden').order('orden'),
        cliente.from('puntos_usuario').select('acumulados').eq('perfil_id', perfilId).maybeSingle(),
        cliente.from('mensajes_usuario').select('id', { count: 'exact', head: true }).eq('perfil_id', perfilId).eq('leido', false)
      ]);
      resultado(respuestas[3]);
      const tarjetas=respuestas[0];
      const [productos,puntos]=respuestas.slice(1,3).map(resultado);
      return { tarjetas, puntos: puntos?.acumulados ?? 0, productosDisponibles: productos ?? [], mensajesPendientes: respuestas[3].count ?? 0 };
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
