const texto = (nombre, etiqueta, extra = {}) => ({ nombre, etiqueta, tipo: 'texto', inicial: '', ...extra });
const numero = (nombre, etiqueta, inicial = 0, extra = {}) => ({ nombre, etiqueta, tipo: 'numero', inicial, ...extra });
const tarjetas = ['basica', 'black'];
export const categorias = ['Restaurantes', 'Compras', 'Entretenimiento'];
export const tablas = {
  categorias: { titulo: 'Categorías', grupo: 'Promociones', claves: ['id'], campos: [
    texto('id', 'ID'), texto('nombre', 'Nombre'), texto('imagen_url', 'Imagen', { nullable: true, inicial: null, tipo: 'imagen' }), numero('orden', 'Orden', 0, { entero: true })
  ] },
  categoria_comercios: { titulo: 'Comercios por categoría', grupo: 'Promociones', oculta: true, claves: ['categoria_id','comercio_id'], campos: [
    texto('categoria_id', 'Categoría', { referencia: 'categorias' }), texto('comercio_id', 'Comercio', { referencia: 'comercios' })
  ] },
  perfiles: { titulo: 'Perfiles', grupo: 'Usuarios', claves: ['id'], campos: [
    texto('id', 'ID'), texto('nombre', 'Nombre'), texto('tipo_tarjeta', 'Tarjeta', { inicial: 'basica', opciones: tarjetas }),
    texto('usuario_acceso', 'Usuario de acceso', { nullable: true }), texto('contrasena', 'Contraseña', { tipo: 'contrasena' })
  ] },
  cuentas: { titulo: 'Cuentas', grupo: 'Usuarios', claves: ['id'], campos: [
    texto('id', 'ID'), texto('perfil_id', 'Perfil', { referencia: 'perfiles' }), texto('nombre', 'Nombre'), texto('tipo', 'Tipo'),
    texto('numero_completo', 'Número de cuenta'), numero('saldo', 'Saldo'), texto('moneda', 'Moneda', { inicial: 'USD' }),
    texto('segmento', 'Segmento', { inicial: 'Básica' }), numero('orden', 'Orden', 0, { entero: true })
  ] },
  preferencias_usuario: { titulo: 'Preferencias', grupo: 'Usuarios', claves: ['usuario_id'], campos: [
    texto('usuario_id', 'Perfil', { referencia: 'perfiles' }),
    { nombre: 'categorias', etiqueta: 'Categorías', tipo: 'lista', referencia: 'categorias', inicial: [] },
    { nombre: 'encuesta_completada', etiqueta: 'Encuesta completada', tipo: 'booleano', inicial: false }
  ] },
  comercios: { titulo: 'Comercios', grupo: 'Promociones', claves: ['id'], campos: [
    texto('id', 'ID'), texto('nombre', 'Nombre'), texto('logo_url', 'Logo', { nullable: true, inicial: null, tipo: 'imagen' })
  ] },
  promociones: { titulo: 'Ofertas', grupo: 'Promociones', claves: ['id'], campos: [
    texto('id', 'ID'), texto('comercio_id', 'Comercio', { referencia: 'comercios' }), texto('category', 'Categoría', { referencia: 'categorias', inicial: 'Restaurantes' }),
    texto('merchant', 'Comercio (compatibilidad)'), texto('benefit', 'Beneficio (compatibilidad)'), texto('description', 'Descripción'),
    texto('payment', 'Pago (compatibilidad)'), texto('restrictions', 'Restricciones (compatibilidad)'), numero('orden', 'Orden', 0, { entero: true }),
    texto('vigencia_desde', 'Desde', { tipo: 'fecha', nullable: true, inicial: null }), texto('vigencia_hasta', 'Hasta', { tipo: 'fecha', nullable: true, inicial: null }),
    texto('instrucciones', 'Instrucciones'), texto('imagen_url', 'Imagen', { nullable: true, inicial: null, tipo: 'imagen' }), texto('imagen_alt', 'Texto de imagen', { nullable: true, inicial: null }),
    texto('descripcion_detalle', 'Descripción ampliada'),
    { nombre: 'dias_uso', etiqueta: 'Días de uso', tipo: 'lista', opciones: [0, 1, 2, 3, 4, 5, 6], inicial: null, nullable: true }
  ] },
  beneficios_tarjeta: { titulo: 'Beneficios por tarjeta', grupo: 'Promociones', claves: ['promocion_id', 'tipo_tarjeta'], campos: [
    texto('promocion_id', 'Promoción', { referencia: 'promociones' }), texto('tipo_tarjeta', 'Tarjeta', { opciones: tarjetas, inicial: 'basica' }),
    texto('beneficio', 'Beneficio'), texto('medio_pago', 'Medio de pago'), texto('restricciones', 'Restricciones'),
    numero('compra_minima', 'Compra mínima', null, { nullable: true, minimo: 0 }), numero('tope_descuento', 'Tope descuento', null, { nullable: true, minimo: 0 })
  ] }
};

export function filaNueva(tabla) {
  return Object.fromEntries(tablas[tabla].campos.map(c => [c.nombre, structuredClone(c.inicial)]));
}
export function claveFila(tabla, fila) {
  return Object.fromEntries(tablas[tabla].claves.map(c => [c, fila[c]]));
}
export function identidad(tabla, fila) { return JSON.stringify(Object.values(claveFila(tabla, fila))); }
