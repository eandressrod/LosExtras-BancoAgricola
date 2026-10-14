import { tablas, filaNueva, claveFila, identidad } from './schema.js';

const secuencias = new Map();
export function siguienteId(prefijo, filas = []) {
  const usados = new Set(filas.flatMap(f => [f.id, f.usuario_acceso]));
  let n = secuencias.get(prefijo) || 0, id;
  do { id = `${prefijo}-${String(++n).padStart(3, '0')}`; } while (usados.has(id));
  secuencias.set(prefijo,n); return id;
}

export function generarPerfil(azar = Math.random, existentes = {}) {
  const elegir = lista => lista[Math.min(lista.length - 1, Math.floor(azar() * lista.length))];
  const id = siguienteId('usuario', existentes.perfiles);
  const perfil = { ...filaNueva('perfiles'), id, nombre: elegir(['Ana López', 'Luis Pérez', 'Marta García', 'Carlos Rivera', 'Sofía Torres', 'Diego Ramírez']),
    tipo_tarjeta: elegir(['basica', 'black']), usuario_acceso: id, contrasena: '123' };
  const modelos = [['Max Electrónico', 'Cuenta de ahorro'], ['CUENTA DIGITAL', 'Cuenta de ahorro'], ['Cuenta Corriente', 'Corriente'], ['Tarjeta de Crédito', 'Tarjeta de Crédito']];
  const cuentas = Array.from({ length: Math.min(3, Math.floor(azar() * 4)) }, (_, i) => {
    const [nombre, tipo] = elegir(modelos);
    return { ...filaNueva('cuentas'), id: siguienteId('cuenta', existentes.cuentas), perfil_id: perfil.id, nombre, tipo,
      numero_enmascarado: `•••• ${elegir(['1320', '5376', '4120', '0341'])}`, saldo: elegir([0, 30, 150, 1200, 3450.75]),
      segmento: perfil.tipo_tarjeta === 'black' ? 'Black' : 'Básica', orden: i + 1 };
  });
  return { perfiles: [perfil], cuentas, preferencias_usuario: [{ usuario_id: perfil.id, categorias: [], encuesta_completada: false }] };
}

function datosFila(tabla, fila) {
  return Object.fromEntries(tablas[tabla].campos.filter(c => c.nombre !== 'contrasena' || fila.contrasena).map(c => {
    const v = fila[c.nombre] ?? (c.nullable ? null : c.inicial);
    return [c.nombre, c.tipo === 'numero' && v !== null ? String(v) : v];
  }));
}

export function crearBorrador(snapshot = {}) {
  let original;
  const b = {
    filas: {},
    cargar(datos) {
      original = Object.fromEntries(Object.keys(tablas).map(t => [t, structuredClone(datos[t] || [])]));
      b.filas = structuredClone(original);
    },
    cancelar() { b.filas = structuredClone(original); },
    actualizar(datos) {
      const cambios = b.cambios();
      const previos = original;
      const buscar = c => (datos[c.tabla] || []).find(f => identidad(c.tabla,f) === identidad(c.tabla,c.clave));
      for (const c of cambios) {
        const actual = buscar(c);
        if (c.operacion === 'crear' && actual) throw new Error('Identificador existente. Revisa el resultado anterior antes de repetir el alta.');
        if (c.operacion === 'editar' && !actual) throw new Error('Un registro editado fue eliminado. El borrador se conserva; cancela o revisa esa edición.');
      }
      const conflictos = cambios.filter(c => c.operacion !== 'crear' && buscar(c) && (buscar(c)._version !== c.version || (c.dependencias && buscar(c)._dependencias !== c.dependencias))).map(c => `${tablas[c.tabla].titulo}: ${Object.values(c.clave).join(' / ')}`);
      b.cargar(datos);
      for (const c of cambios) {
        if (c.operacion === 'crear') { b.filas[c.tabla].push(structuredClone(c.datos)); continue; }
        const fila = b.filas[c.tabla].find(f => identidad(c.tabla,f) === identidad(c.tabla,c.clave));
        if (c.operacion === 'eliminar') { if (fila) b.eliminar(c.tabla,fila); continue; }
        const vieja = previos[c.tabla].find(f => identidad(c.tabla,f) === identidad(c.tabla,c.clave));
        const antes = datosFila(c.tabla,vieja);
        for (const [k,v] of Object.entries(c.datos)) if (JSON.stringify(v) !== JSON.stringify(antes[k])) fila[k] = structuredClone(v);
      }
      return conflictos;
    },
    agregar(datos) { for (const t of Object.keys(tablas)) b.filas[t].push(...structuredClone(datos[t] || [])); },
    eliminar(t, fila) {
      b.filas[t] = b.filas[t].filter(f => identidad(t, f) !== identidad(t, fila));
      if (t === 'perfiles') {
        b.filas.cuentas = b.filas.cuentas.filter(f => f.perfil_id !== fila.id);
        b.filas.preferencias_usuario = b.filas.preferencias_usuario.filter(f => f.usuario_id !== fila.id);
      }
      if (t === 'promociones') b.filas.beneficios_tarjeta = b.filas.beneficios_tarjeta.filter(f => f.promocion_id !== fila.id);
    },
    cambios() {
      const cambios = [];
      for (const t of Object.keys(tablas)) {
        const antes = new Map(original[t].map(f => [identidad(t, f), f]));
        const ahora = new Map();
        for (const fila of b.filas[t]) {
          const id = identidad(t, fila);
          if (ahora.has(id)) throw new Error(`${tablas[t].titulo}: identificador duplicado.`);
          ahora.set(id, fila);
          const vieja = antes.get(id);
          if (!vieja || JSON.stringify(datosFila(t, vieja)) !== JSON.stringify(datosFila(t, fila))) {
            cambios.push({ tabla: t, operacion: vieja ? 'editar' : 'crear', clave: claveFila(t, fila), ...(vieja ? { version: vieja._version } : {}), datos: datosFila(t, fila) });
          }
        }
        for (const [id, vieja] of antes) if (!ahora.has(id)) cambios.push({ tabla: t, operacion: 'eliminar', clave: claveFila(t, vieja), version: vieja._version, ...(vieja._dependencias ? { dependencias: vieja._dependencias } : {}) });
      }
      const perfilesBorrados = new Set(cambios.filter(c => c.tabla === 'perfiles' && c.operacion === 'eliminar').map(c => c.clave.id));
      const promosBorradas = new Set(cambios.filter(c => c.tabla === 'promociones' && c.operacion === 'eliminar').map(c => c.clave.id));
      return cambios.filter(c => !((c.tabla === 'cuentas' && perfilesBorrados.has(c.datos?.perfil_id || original.cuentas.find(f => f.id === c.clave.id)?.perfil_id))
        || (c.tabla === 'preferencias_usuario' && perfilesBorrados.has(c.clave.usuario_id))
        || (c.tabla === 'beneficios_tarjeta' && promosBorradas.has(c.clave.promocion_id))));
    }
  };
  b.cargar(snapshot);
  return b;
}

export function validarCambios(cambios) {
  if (!Array.isArray(cambios) || cambios.length > 200) throw new Error('El lote admite hasta 200 cambios.');
  const vistos = new Set();
  for (const c of cambios) {
    const s = tablas[c.tabla];
    if (!s || !['crear', 'editar', 'eliminar'].includes(c.operacion)) throw new Error('Tabla u operación no permitida.');
    if (!c.clave || Object.keys(c.clave).length !== s.claves.length || s.claves.some(k => typeof c.clave[k] !== 'string' || !c.clave[k].trim())) throw new Error('Identificador requerido.');
    const id = c.tabla + identidad(c.tabla, c.clave);
    if (vistos.has(id)) throw new Error('Identificador repetido en el lote.');
    vistos.add(id);
    if (c.operacion !== 'crear' && !/^\d+$/.test(c.version || '')) throw new Error('Falta la versión del registro.');
    if (c.operacion === 'eliminar') continue;
    const d = c.datos;
    if (!d || Object.keys(d).some(k => !s.campos.some(f => f.nombre === k))) throw new Error('Campo no permitido.');
    if (s.claves.some(k => d[k] !== c.clave[k])) throw new Error('El identificador no puede modificarse.');
    for (const f of s.campos) {
      if (f.tipo === 'contrasena') continue;
      const v = d[f.nombre];
      const error = () => { throw new Error(`${s.titulo}: ${f.etiqueta} no válido.`); };
      if (v == null) { if (!f.nullable) error(); continue; }
      if (['texto', 'fecha', 'imagen'].includes(f.tipo) && typeof v !== 'string') error();
      if (f.tipo === 'booleano' && typeof v !== 'boolean') error();
      if (f.tipo === 'numero' && (v === '' || !['number', 'string'].includes(typeof v) || !Number.isFinite(Number(v)) || (f.entero && !Number.isInteger(Number(v))) || (f.minimo !== undefined && Number(v) < f.minimo))) error();
      if (f.tipo === 'fecha' && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v)) error();
      if (f.tipo === 'lista' && (!Array.isArray(v) || v.some(x => f.opciones ? !f.opciones.includes(x) : typeof x !== 'string' || !x.trim()) || (f.nombre === 'dias_uso' && v.length === 0))) error();
      if (f.opciones && f.tipo !== 'lista' && !f.opciones.includes(v)) error();
      if (f.referencia && f.tipo !== 'lista' && !v.trim()) error();
    }
    if (c.tabla === 'perfiles') {
      if (d.contrasena !== undefined && (typeof d.contrasena !== 'string' || !d.contrasena)) throw new Error('Contraseña no válida.');
      if (c.operacion === 'crear' && (!d.usuario_acceso?.trim() || !d.contrasena)) throw new Error('El perfil nuevo requiere usuario de acceso y contraseña.');
      if (d.contrasena && !d.usuario_acceso?.trim()) throw new Error('La contraseña requiere usuario de acceso.');
    }
    if (c.tabla === 'preferencias_usuario' && d.encuesta_completada && !d.categorias.length) throw new Error('Encuesta completada requiere categorías.');
    if (c.tabla === 'promociones' && d.vigencia_desde && d.vigencia_hasta && d.vigencia_desde > d.vigencia_hasta) throw new Error('Vigencia: la fecha inicial supera la final.');
  }
  return cambios;
}
