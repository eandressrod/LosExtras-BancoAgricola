// Foto de datos de las tablas canónicas y su restauración sobre el mismo esquema.
// Las tablas de sesión son efímeras y no se respaldan.

// Orden de restauración: cada tabla aparece después de las tablas a las que referencia.
export const TABLAS_RESPALDO = [
  { tabla: 'perfiles', clave: ['id'] },
  { tabla: 'categorias', clave: ['id'] },
  { tabla: 'subcategorias', clave: ['id'] },
  { tabla: 'ocasiones', clave: ['id'] },
  { tabla: 'zonas', clave: ['id'] },
  { tabla: 'comercios', clave: ['id'] },
  { tabla: 'categoria_comercios', clave: ['categoria_id', 'comercio_id'] },
  { tabla: 'promociones', clave: ['id'] },
  { tabla: 'beneficios_tarjeta', clave: ['promocion_id', 'tipo_tarjeta'] },
  { tabla: 'sucursales', clave: ['id'] },
  { tabla: 'promocion_sucursales', clave: ['promocion_id', 'sucursal_id'] },
  { tabla: 'cobertura', clave: ['comercio_id', 'zona_id'] },
  { tabla: 'relaciones_intereses', clave: ['interes_a', 'interes_b', 'ocasion_id'] },
  { tabla: 'productos_tarjeta', clave: ['id'] },
  { tabla: 'cuentas', clave: ['id'] },
  { tabla: 'tarjetas_usuario', clave: ['id'] },
  { tabla: 'preferencias_usuario', clave: ['usuario_id'] },
  { tabla: 'promociones_guardadas', clave: ['usuario_id', 'promocion_id'] },
  { tabla: 'puntos_usuario', clave: ['perfil_id'] },
  { tabla: 'mensajes_usuario', clave: ['id'] },
  { tabla: 'metas_usuario', clave: ['id'] }
];

export const TABLAS_EXCLUIDAS = ['sesiones_actividad', 'sesiones_revocadas'];

const FORMATO = 1;

export async function crearFoto({ acceso, migracion, commit, fecha = new Date().toISOString() }) {
  const tablas = {};
  for (const entrada of TABLAS_RESPALDO) tablas[entrada.tabla] = await acceso.leer(entrada);
  return { formato: FORMATO, migracion, commit, fecha, tablas };
}

// Inserta o actualiza por clave primaria; no borra filas creadas después de la foto.
export async function restaurarFoto(foto, { acceso, migracionActual, simular = true }) {
  if (foto?.formato !== FORMATO) throw new Error(`La foto tiene un formato no compatible (${foto?.formato}).`);
  if (foto.migracion !== migracionActual) {
    throw new Error(`La foto corresponde a la migración ${foto.migracion} y la base está en ${migracionActual}.`);
  }
  const tablas = [];
  for (const entrada of TABLAS_RESPALDO) {
    const filas = foto.tablas[entrada.tabla] ?? [];
    if (filas.length && !simular) await acceso.escribir(entrada, filas);
    tablas.push({ tabla: entrada.tabla, filas: filas.length });
  }
  return { simulado: simular, tablas };
}

export function crearAccesoSupabase(cliente, { pagina = 1000 } = {}) {
  return {
    async leer({ tabla, clave }) {
      const filas = [];
      for (let desde = 0; ; desde += pagina) {
        let consulta = cliente.from(tabla).select('*');
        for (const columna of clave) consulta = consulta.order(columna);
        const { data, error } = await consulta.range(desde, desde + pagina - 1);
        if (error) throw new Error(`No se pudo leer ${tabla}: ${error.message}`);
        filas.push(...data);
        if (data.length < pagina) return filas;
      }
    },
    async escribir({ tabla, clave }, filas) {
      const { error } = await cliente.from(tabla).upsert(filas, { onConflict: clave.join(',') });
      if (error) throw new Error(`No se pudo restaurar ${tabla}: ${error.message}`);
    }
  };
}
