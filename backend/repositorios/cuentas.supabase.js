export function crearRepositorioCuentasSupabase(cliente) {
  return {
    async listarPorPerfil(perfilId) {
      const { data, error } = await cliente
        .from('cuentas')
        .select('id, nombre, tipo, numero_enmascarado, saldo, moneda, segmento, orden')
        .eq('perfil_id', perfilId)
        .order('orden', { ascending: true });

      if (error) {
        throw new Error('No se pudieron consultar las cuentas.');
      }

      return (data || []).map(row => ({
        id: row.id,
        nombre: row.nombre,
        tipo: row.tipo,
        numeroEnmascarado: row.numero_enmascarado,
        saldo: Number(row.saldo),
        moneda: row.moneda,
        segmento: row.segmento,
        orden: row.orden
      }));
    }
  };
}
