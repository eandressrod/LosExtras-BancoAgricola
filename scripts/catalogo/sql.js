// Carga de Supabase generada desde la fuente única del catálogo (H24).
// Inserta o actualiza por clave; sincroniza beneficios, sucursales participantes y cobertura de lo que define la fuente,
// sin borrar promociones ni comercios creados fuera de ella.
import { sucursalesParticipantes, beneficioPrincipal } from '../../backend/catalogo.js';

const texto = valor => `'${String(valor).replaceAll("'", "''")}'`;

/** Literal SQL de un valor de la fuente. `tipo` indica el tipo de las listas o 'jsonb' para objetos. */
export function literalSql(valor, tipo) {
  if (valor === null || valor === undefined) return 'null';
  if (tipo === 'jsonb') return `${texto(JSON.stringify(valor))}::jsonb`;
  if (Array.isArray(valor)) return valor.length ? `array[${valor.map(item => literalSql(item)).join(',')}]::${tipo}[]` : `'{}'::${tipo}[]`;
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  return texto(valor);
}

const lista = valores => `(${valores.join(', ')})`;

function upsert(tabla, columnas, filas, conflicto) {
  if (!filas.length) return [];
  const actualizar = columnas.filter(columna => !conflicto.includes(columna));
  const accion = actualizar.length ? `do update set ${actualizar.map(columna => `${columna} = excluded.${columna}`).join(', ')}` : 'do nothing';
  return [`insert into public.${tabla} ${lista(columnas)} values\n${filas.map(fila => '  ' + lista(fila)).join(',\n')}\non conflict ${lista(conflicto)} ${accion};`];
}

/** @param {object} catalogo fuente única ya validada */
export function generarSqlCatalogo(catalogo) {
  const comercios = new Map(catalogo.comercios.map(comercio => [comercio.id, comercio]));
  const idsPromociones = lista(catalogo.promociones.map(promocion => texto(promocion.id)));
  const idsComercios = lista(catalogo.comercios.map(comercio => texto(comercio.id)));
  const paresBeneficios = catalogo.promociones.flatMap(promocion =>
    promocion.beneficios.map(beneficio => lista([texto(promocion.id), texto(beneficio.tarjeta)])));
  const paresCobertura = catalogo.cobertura.map(cobertura => lista([texto(cobertura.comercio), texto(cobertura.zona)]));

  const sentencias = [
    `-- Generado desde catalogo/catalogo.json con npm run catalogo:generar; no editar a mano.\n-- Fuente versión ${catalogo.version}.`,
    ...upsert('ocasiones', ['id', 'nombre', 'ejemplos', 'orden'],
      catalogo.ocasiones.map(o => [texto(o.id), texto(o.nombre), texto(o.ejemplos), o.orden]), ['id']),
    ...upsert('zonas', ['id', 'nombre', 'latitud', 'longitud', 'orden'],
      catalogo.zonas.map((z, indice) => [texto(z.id), texto(z.nombre), z.centro.latitud, z.centro.longitud, indice + 1]), ['id']),
    ...upsert('categorias', ['id', 'nombre', 'icono_url', 'imagen_url', 'orden'],
      catalogo.categorias.map(c => [texto(c.id), texto(c.nombre), texto(c.icono), literalSql(c.imagen), c.orden]), ['id']),
    ...upsert('subcategorias', ['id', 'nombre', 'categoria_id'],
      catalogo.subcategorias.map(s => [texto(s.id), texto(s.nombre), texto(s.categoria)]), ['id']),
    ...upsert('comercios', ['id', 'nombre', 'logo_url', 'categoria_id', 'subcategoria_id', 'ocasiones', 'nivel_precio', 'reconocible', 'sensible', 'afinar_por'],
      catalogo.comercios.map(c => [texto(c.id), texto(c.nombre), texto(c.logo), texto(c.categoria), texto(c.subcategoria),
        literalSql(c.ocasiones, 'jsonb'), c.nivelPrecio, c.reconocible, c.sensible, texto(c.afinarPor)]), ['id']),
    ...upsert('categoria_comercios', ['categoria_id', 'comercio_id'],
      catalogo.comercios.map(c => [texto(c.categoria), texto(c.id)]), ['categoria_id', 'comercio_id']),
    ...upsert('sucursales', ['id', 'comercio_id', 'nombre', 'direccion', 'latitud', 'longitud', 'zona_id'],
      catalogo.sucursales.map(s => [texto(s.id), texto(s.comercio), texto(s.nombre), texto(s.direccion),
        s.coordenadas.latitud, s.coordenadas.longitud, texto(s.zona)]), ['id']),
    paresCobertura.length
      ? `delete from public.cobertura where comercio_id in ${idsComercios} and (comercio_id, zona_id) not in ${lista(paresCobertura)};`
      : `delete from public.cobertura where comercio_id in ${idsComercios};`,
    ...upsert('cobertura', ['comercio_id', 'zona_id', 'estado'],
      catalogo.cobertura.map(c => [texto(c.comercio), texto(c.zona), texto(c.estado)]), ['comercio_id', 'zona_id']),
    ...upsert('relaciones_intereses', ['interes_a', 'interes_b', 'ocasion_id', 'nota'],
      catalogo.relaciones.map(r => [texto(r.interesA), texto(r.interesB), texto(r.ocasionRequerida), texto(r.nota)]),
      ['interes_a', 'interes_b', 'ocasion_id']),
    ...upsert('promociones', ['id', 'merchant', 'category', 'benefit', 'description', 'payment', 'restrictions', 'orden', 'comercio_id',
      'titulo', 'descripcion_detalle', 'condiciones', 'instrucciones', 'imagen_url', 'imagen_alt', 'vigencia_desde', 'vigencia_hasta',
      'dias_uso', 'canales', 'tipo_beneficio', 'condicion_decisiva', 'etiquetas_intencion', 'fecha_alta', 'ocasiones', 'nivel_precio'],
    catalogo.promociones.map((p, indice) => {
      const comercio = comercios.get(p.comercio);
      const principal = beneficioPrincipal(p.beneficios);
      return [texto(p.id), texto(comercio.nombre), texto(comercio.categoria), texto(principal.beneficio), texto(p.descripcion),
        texto(principal.medioPago), texto(p.restricciones), indice + 1, texto(p.comercio), texto(p.titulo), texto(p.descripcionDetalle),
        texto(p.condiciones), texto(p.instrucciones), texto(p.imagen), texto(p.textoAlternativo), texto(p.vigencia.desde),
        texto(p.vigencia.hasta), literalSql(p.dias, 'smallint'), literalSql(p.canales, 'text'), texto(p.tipoBeneficio),
        texto(p.condicionDecisiva), literalSql(p.etiquetasIntencion, 'text'), texto(p.alta), literalSql(p.ocasiones, 'jsonb'),
        literalSql(p.nivelPrecio)];
    }), ['id']),
    `delete from public.beneficios_tarjeta where promocion_id in ${idsPromociones} and (promocion_id, tipo_tarjeta) not in ${lista(paresBeneficios)};`,
    ...upsert('beneficios_tarjeta', ['promocion_id', 'tipo_tarjeta', 'beneficio', 'medio_pago', 'restricciones', 'compra_minima', 'tope_descuento'],
      catalogo.promociones.flatMap(p => p.beneficios.map(b => [texto(p.id), texto(b.tarjeta), texto(b.beneficio), texto(b.medioPago),
        texto(b.restricciones), literalSql(b.compraMinima), literalSql(b.tope)])), ['promocion_id', 'tipo_tarjeta']),
    `delete from public.promocion_sucursales where promocion_id in ${idsPromociones};`,
    ...upsert('promocion_sucursales', ['promocion_id', 'sucursal_id'],
      catalogo.promociones.flatMap(p => sucursalesParticipantes(p, catalogo.sucursales).map(s => [texto(p.id), texto(s.id)])),
      ['promocion_id', 'sucursal_id'])
  ];
  return sentencias.join('\n\n') + '\n';
}
