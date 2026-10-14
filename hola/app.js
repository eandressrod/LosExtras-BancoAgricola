import { tablas, filaNueva, identidad } from './schema.js';
import { crearBorrador, generarPerfil, validarCambios, siguienteId } from './modelo.js';
import { configurarSeparador } from './arbol.js';
import { prepararImagen, configurarArrastre } from './imagenes-cliente.js';

const $ = id => document.getElementById(id);
const b = crearBorrador();
const imagenes = new Map();
let categoriaActiva = null, comercioActivo = null, preparandoImagen = 0;
let config, vista = 'inicio', seleccion, ocupado = false, cargado = false, peticion, cuerpoPeticion, ultimaConsulta, conflictos = [];
const nodo = (tag, texto, clase) => { const n = document.createElement(tag); if (texto !== undefined) n.textContent = texto; if (clase) n.className = clase; return n; };
function icono(nombre) { const img = document.createElement('img'); img.src = `/recursos/${nombre}_icon.png`; img.alt = ''; img.draggable = false; return img; }
function mensaje(texto = '', error = false) { $('mensaje').textContent = texto; $('mensaje').className = texto ? `visible${error ? ' error' : ''}` : ''; }
function cambiosPendientes() { try { return b.cambios(); } catch { return null; } }
function estado() {
  $('edicion').disabled = ocupado;
  const cambios = cambiosPendientes();
  $('pendientes').textContent = cambios ? `${cambios.length} cambios pendientes` : 'Identificador duplicado en el borrador';
  for (const id of ['nuevo','rapido','propiedades','eliminar','guardar','cancelar','actualizar','comprobar']) $(id).disabled = ocupado;
  $('nuevo').disabled ||= !cargado || vista === 'inicio';
  $('rapido').disabled ||= !cargado;
  $('propiedades').disabled ||= !seleccion;
  $('eliminar').disabled ||= !seleccion;
  $('guardar').disabled ||= !cargado || cambios?.length === 0;
  $('guardar').disabled ||= preparandoImagen > 0;
  $('guardar').classList.toggle('con-cambios', Boolean(cambios?.length));
  $('cancelar').disabled ||= cambios?.length === 0;
}
async function api(ruta, opciones = {}) {
  const res = await fetch(ruta, { ...opciones, headers: { 'X-Midi-Token': config.token, ...(opciones.headers || {}) } });
  const datos = await res.json();
  if (!res.ok) throw Object.assign(new Error(datos.error || 'No se pudo completar la operación.'), { estado: res.status });
  return datos;
}
async function cargar() {
  if (ocupado) return;
  const conservar = Boolean(cambiosPendientes()?.length);
  if (conservar && !confirm('Actualizar conservará los campos editados y traerá los demás valores actuales. Revisa el borrador antes de Guardar. ¿Continuar?')) return;
  ocupado = true; estado(); mensaje();
  try {
    const lectura = await api('/api/datos');
    if (conservar) conflictos = b.actualizar(lectura.datos); else { b.cargar(lectura.datos); conflictos = []; }
    ultimaConsulta = lectura.consultadoEn; cargado = true; seleccion = null;
    $('conexion').textContent = 'Conectado'; $('consulta').textContent = new Date(ultimaConsulta).toLocaleString();
    $('estado').textContent = config.destino; renderizar();
    if (conservar) mensaje(conflictos.length ? `Borrador conservado. Revisa ${conflictos.length} registros que cambiaron externamente.` : 'Datos actualizados. Borrador conservado.');
  } catch (e) { $('conexion').textContent = 'Sin conexión'; $('estado').textContent = 'Sin conexión'; mensaje(e.message, true); }
  finally { ocupado = false; estado(); }
}
function asignar(tabla, fila, campo, valor) {
  const anterior = fila[campo]; fila[campo] = valor;
  if (!fila._version && campo === 'id') {
    if (tabla === 'perfiles') { for (const f of b.filas.cuentas) if (f.perfil_id === anterior) f.perfil_id = valor; for (const f of b.filas.preferencias_usuario) if (f.usuario_id === anterior) f.usuario_id = valor; }
    if (tabla === 'comercios') for (const f of b.filas.promociones) if (f.comercio_id === anterior) f.comercio_id = valor;
    if (tabla === 'promociones') for (const f of b.filas.beneficios_tarjeta) if (f.promocion_id === anterior) f.promocion_id = valor;
    if (tabla === 'categorias') {
      for (const f of b.filas.categoria_comercios) if (f.categoria_id === anterior) f.categoria_id = valor;
      for (const f of b.filas.promociones) if (f.category === anterior) f.category = valor;
      for (const f of b.filas.preferencias_usuario) f.categorias = f.categorias.map(c => c === anterior ? valor : c);
    }
    if (tabla === 'comercios') for (const f of b.filas.categoria_comercios) if (f.comercio_id === anterior) f.comercio_id = valor;
  }
  peticion = undefined; estado();
}
function control(tabla, fila, f, cambiar) {
  const box = nodo('div', undefined, 'celda-campo');
  const bloqueada = Boolean(fila._version && tablas[tabla].claves.includes(f.nombre));
  if (f.tipo === 'imagen') {
    box.classList.add('imagen-control');
    const preview = document.createElement('img'); preview.alt = 'Vista previa';
    const ruta = document.createElement('input'); ruta.type = 'text'; ruta.value = fila[f.nombre] || ''; ruta.setAttribute('aria-label', f.etiqueta);
    const archivo = document.createElement('input'); archivo.type = 'file'; archivo.accept = 'image/png,image/jpeg,image/webp'; archivo.className = 'archivo-imagen'; archivo.setAttribute('aria-label', `Subir ${f.etiqueta}`);
    const elegir = nodo('button', 'Elegir imagen'); elegir.type = 'button'; elegir.addEventListener('click', () => archivo.click());
    const quitar = nodo('button', 'Quitar'); quitar.type = 'button';
    const pintar = () => { preview.hidden = !ruta.value; if (ruta.value) preview.src = imagenes.get(ruta.value)?.vista || ruta.value; };
    ruta.addEventListener('input', () => { cambiar(ruta.value || null); pintar(); });
    quitar.addEventListener('click', () => { ruta.value = ''; cambiar(null); pintar(); });
    async function recibir(file) {
      if (!file || ocupado) return;
      preparandoImagen++; estado();
      try {
        const img = await prepararImagen(file);
        const anterior = imagenes.get(img.ruta); if (anterior) URL.revokeObjectURL(anterior.vista);
        imagenes.set(img.ruta, img); ruta.value = img.ruta; cambiar(img.ruta); pintar(); mensaje();
      } catch (e) { mensaje(e.message, true); }
      finally { preparandoImagen--; estado(); }
    }
    archivo.addEventListener('change', () => recibir(archivo.files[0]));
    configurarArrastre(box,recibir);
    box.append(preview, ruta, archivo, elegir, quitar, nodo('span', 'Arrastra una imagen', 'ayuda-imagen')); pintar();
    return box;
  }
  let entrada;
  const opcionesCampo = f.opciones || (f.referencia ? b.filas[f.referencia].map(x => x.id) : []);
  if (f.tipo === 'lista') {
    entrada = nodo('div', undefined, 'control-lista');
    for (const opcion of opcionesCampo) {
      const etiqueta = nodo('label'); const check = document.createElement('input'); check.type = 'checkbox';
      check.checked = (fila[f.nombre] || []).includes(opcion); check.disabled = bloqueada || fila[f.nombre] === null;
      etiqueta.append(check, document.createTextNode(f.nombre === 'dias_uso' ? ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][opcion] : (f.referencia ? b.filas[f.referencia].find(c => c.id === opcion)?.nombre : null) || String(opcion)));
      check.addEventListener('change', () => cambiar(opcionesCampo.filter((_, i) => entrada.querySelectorAll('input')[i].checked)));
      entrada.append(etiqueta);
    }
  } else if (f.opciones || f.referencia) {
    entrada = document.createElement('select');
    const opciones = opcionesCampo;
    for (const valor of new Set(['', ...opciones, fila[f.nombre] ?? ''])) {
      const opt = document.createElement('option'); opt.value = valor; opt.textContent = f.referencia ? (b.filas[f.referencia].find(x => x.id === valor)?.nombre || valor || 'Seleccionar') : (valor === 'basica' ? 'Básica' : valor === 'black' ? 'Black' : valor || 'Seleccionar'); entrada.append(opt);
    }
    entrada.value = fila[f.nombre] ?? '';
    entrada.addEventListener('change', () => cambiar(entrada.value));
  } else {
    entrada = document.createElement('input');
    entrada.type = f.tipo === 'booleano' ? 'checkbox' : f.tipo === 'contrasena' ? 'password' : f.tipo === 'fecha' ? 'date' : f.tipo === 'numero' ? 'number' : 'text';
    if (f.tipo === 'booleano') entrada.checked = Boolean(fila[f.nombre]); else entrada.value = fila[f.nombre] ?? '';
    if (f.tipo === 'numero') entrada.step = f.entero ? '1' : 'any';
    if (f.tipo === 'contrasena') { entrada.autocomplete = 'new-password'; entrada.placeholder = fila.tiene_contrasena ? 'Sin cambio' : 'Contraseña'; }
    entrada.addEventListener('input', () => cambiar(f.tipo === 'booleano' ? entrada.checked : entrada.value));
  }
  entrada.setAttribute('aria-label', f.etiqueta);
  if (entrada.tagName !== 'DIV') entrada.disabled = bloqueada || (f.nullable && fila[f.nombre] === null);
  box.append(entrada);
  if (f.tipo === 'contrasena') {
    const ver = nodo('button', 'Mostrar', 'ver-clave'); ver.type = 'button'; ver.addEventListener('click', () => { entrada.type = entrada.type === 'password' ? 'text' : 'password'; ver.textContent = entrada.type === 'password' ? 'Mostrar' : 'Ocultar'; }); box.append(ver);
  }
  if (f.nullable) {
    const etiqueta = nodo('label', undefined, 'control-null'); const check = document.createElement('input'); check.type = 'checkbox'; check.checked = fila[f.nombre] === null; check.disabled = bloqueada;
    etiqueta.append(check, document.createTextNode(f.nombre === 'dias_uso' ? 'Todos' : 'NULL'));
    check.addEventListener('change', () => {
      const valor = check.checked ? null : (f.tipo === 'lista' ? [...f.opciones] : f.inicial ?? '');
      cambiar(valor);
      if (f.tipo === 'lista') { entrada.querySelectorAll('input').forEach(i => { i.disabled = check.checked; i.checked = !check.checked; }); }
      else { entrada.disabled = check.checked; entrada.value = valor ?? ''; }
    }); box.append(etiqueta);
  }
  return box;
}
function navegar(tabla, categoria = null, comercio = null) { vista = tabla; categoriaActiva = categoria; comercioActivo = comercio; seleccion = null; location.hash = [tabla,categoria,comercio].filter(v => v != null).map(encodeURIComponent).join('/'); mensaje(); renderizar(); }
function filasVisibles() {
  const filas = b.filas[vista] || [];
  if (vista === 'comercios' && categoriaActiva) return filas.filter(c => b.filas.categoria_comercios.some(v => v.categoria_id === categoriaActiva && v.comercio_id === c.id));
  if (vista === 'promociones') return filas.filter(p => (!categoriaActiva || p.category === categoriaActiva) && (!comercioActivo || p.comercio_id === comercioActivo));
  return filas;
}
function renderizarArbol() {
  $('arbol').replaceChildren();
  function boton(titulo, tabla, padre, categoria, comercio) {
    const btn = nodo('button',undefined,'navegacion'); btn.append(icono('folder'),nodo('span',titulo)); btn.dataset.tabla = tabla;
    btn.classList.toggle('activa', vista === tabla && categoriaActiva === (categoria || null) && comercioActivo === (comercio || null));
    btn.addEventListener('click', () => navegar(tabla,categoria,comercio)); padre.append(btn);
  }
  for (const grupo of ['Usuarios','Promociones']) {
    const detalle = document.createElement('details'); detalle.open = true;
    const encabezado = nodo('summary'); encabezado.append(icono('folder'),nodo('span',grupo)); detalle.append(encabezado);
    for (const [tabla,s] of Object.entries(tablas).filter(([tabla,s]) => s.grupo === grupo && !s.oculta && tabla !== 'promociones')) {
      boton(s.titulo,tabla,detalle);
      if (tabla === 'categorias') for (const cat of b.filas.categorias) {
        const rama = document.createElement('details'); rama.className = 'rama-categoria'; rama.open = cat.id === categoriaActiva;
        const titulo = nodo('summary'); titulo.append(icono('folder'),nodo('span',cat.nombre || cat.id)); rama.append(titulo);
        boton('Comercios', 'comercios', rama, cat.id);
        for (const c of b.filas.comercios.filter(c => b.filas.categoria_comercios.some(v => v.categoria_id === cat.id && v.comercio_id === c.id))) boton(c.nombre || c.id, 'promociones', rama, cat.id, c.id);
        detalle.append(rama);
      }
    }
    $('arbol').append(detalle);
  }
}
function renderizar() {
  renderizarArbol();
  $('inicio').hidden = vista !== 'inicio'; $('cuadricula').hidden = vista === 'inicio';
  $('vista-titulo').textContent = vista === 'inicio' ? 'Inicio' : tablas[vista].titulo;
  $('vista-ruta').value = vista === 'inicio' ? 'Midi\\Inicio' : `Midi\\${tablas[vista].grupo}\\${tablas[vista].titulo}`;
  if (categoriaActiva) $('vista-ruta').value = `Midi\\Promociones\\Categorías\\${b.filas.categorias.find(c => c.id === categoriaActiva)?.nombre || categoriaActiva}\\${comercioActivo ? (b.filas.comercios.find(c => c.id === comercioActivo)?.nombre || comercioActivo) + '\\Ofertas' : 'Comercios'}`;
  const visibles = filasVisibles();
  $('numero-filas').textContent = vista === 'inicio' ? '' : `${visibles.length} registros`;
  $('cuadricula').replaceChildren();
  if (vista !== 'inicio') {
    if (vista === 'comercios' && categoriaActiva) {
      const asociar = nodo('button','Asociar comercios'); asociar.type = 'button'; asociar.className = 'accion-categoria';
      asociar.addEventListener('click', () => { const cat = b.filas.categorias.find(c => c.id === categoriaActiva); if (cat) { navegar('categorias'); seleccion = cat; propiedades('Comercios'); } }); $('cuadricula').append(asociar);
    }
    if (!visibles.length) $('cuadricula').append(nodo('p','Sin registros.', 'vacio'));
    else {
      const table = document.createElement('table'); const head = document.createElement('thead'); const hr = document.createElement('tr'); hr.append(nodo('th',''));
      for (const f of tablas[vista].campos) hr.append(nodo('th', f.etiqueta)); head.append(hr); table.append(head);
      const body = document.createElement('tbody');
      for (const fila of visibles) {
        const tr = document.createElement('tr'); if (!fila._version) tr.classList.add('nueva');
        const marca = nodo('td'); marca.append(fila._version ? icono('string') : document.createTextNode('*')); tr.append(marca);
        tr.addEventListener('click', () => { seleccion = fila; body.querySelectorAll('tr').forEach(n => n.classList.toggle('seleccionada', n === tr)); estado(); });
        for (const f of tablas[vista].campos) {
          const td = document.createElement('td'); td.append(control(vista, fila, f, valor => { asignar(vista, fila, f.nombre, valor); tr.classList.add('modificada'); })); tr.append(td);
        }
        body.append(tr);
      }
      table.append(body); $('cuadricula').append(table);
    }
  }
  estado();
}
function propiedades(pestanaInicial) {
  if (!seleccion || ocupado) return;
  const tabla = vista, fuente = seleccion, copia = structuredClone(fuente);
  let prefsOriginal = tabla === 'perfiles' ? b.filas.preferencias_usuario.find(f => f.usuario_id === fuente.id) : null;
  let prefs = prefsOriginal ? structuredClone(prefsOriginal) : null;
  const comerciosElegidos = new Set(tabla === 'categorias' ? b.filas.categoria_comercios.filter(c => c.categoria_id === fuente.id).map(c => c.comercio_id) : []);
  $('dialogo-titulo').textContent = `${tablas[tabla].titulo} — Propiedades`;
  const nombres = tabla === 'perfiles' ? ['General','Acceso','Preferencias'] : tabla === 'categorias' ? ['General','Comercios'] : ['General'];
  const tabs = $('pestanas'); tabs.replaceChildren();
  function mostrar(nombre) {
    tabs.querySelectorAll('button').forEach(n => n.setAttribute('aria-selected', String(n.textContent === nombre)));
    $('campos').replaceChildren();
    if (nombre === 'Comercios') {
      for (const comercio of b.filas.comercios) {
        const label = nodo('label',undefined,'comercio-opcion'); const check = document.createElement('input'); check.type = 'checkbox'; check.checked = comerciosElegidos.has(comercio.id);
        check.addEventListener('change', () => { if (check.checked) comerciosElegidos.add(comercio.id); else comerciosElegidos.delete(comercio.id); });
        label.append(check,document.createTextNode(comercio.nombre || comercio.id)); $('campos').append(label);
      }
      if (!b.filas.comercios.length) $('campos').append(nodo('p','Sin comercios.'));
      return;
    }
    if (nombre === 'Preferencias' && !prefs) {
      const agregar = nodo('button','Añadir preferencias'); agregar.type = 'button'; agregar.addEventListener('click', () => { prefs = { ...filaNueva('preferencias_usuario'), usuario_id: copia.id }; mostrar(nombre); }); $('campos').append(agregar); return;
    }
    const t = nombre === 'Preferencias' ? 'preferencias_usuario' : tabla;
    const fila = nombre === 'Preferencias' ? prefs : copia;
    const campos = tablas[t].campos.filter(f => nombre === 'Acceso' ? ['usuario_acceso','contrasena'].includes(f.nombre) : nombre === 'General' && tabla === 'perfiles' ? !['usuario_acceso','contrasena'].includes(f.nombre) : true);
    for (const f of campos) {
      if (nombre === 'Preferencias' && f.nombre === 'usuario_id') { const cont = nodo('div', undefined, 'campo-propiedad'); cont.append(nodo('span', 'Perfil'), nodo('span', copia.nombre || copia.id)); $('campos').append(cont); continue; }
      const cont = nodo('div', undefined, 'campo-propiedad'); cont.append(nodo('span', f.etiqueta), control(t, fila, f, v => { fila[f.nombre] = v; })); $('campos').append(cont);
    }
  }
  for (const nombre of nombres) { const btn = nodo('button', nombre); btn.type = 'button'; btn.setAttribute('role','tab'); btn.addEventListener('click', () => mostrar(nombre)); tabs.append(btn); }
  mostrar(nombres.includes(pestanaInicial) ? pestanaInicial : nombres[0]);
  $('dialogo').onclose = () => {
    if ($('dialogo').returnValue !== 'aceptar') return;
    for (const f of tablas[tabla].campos) if (JSON.stringify(copia[f.nombre]) !== JSON.stringify(fuente[f.nombre])) asignar(tabla, fuente, f.nombre, copia[f.nombre]);
    if (prefs) { prefs.usuario_id = fuente.id; if (prefsOriginal) Object.assign(prefsOriginal, prefs); else b.agregar({ preferencias_usuario: [prefs] }); }
    if (tabla === 'categorias') {
      for (const vinculo of [...b.filas.categoria_comercios].filter(c => c.categoria_id === fuente.id && !comerciosElegidos.has(c.comercio_id))) {
        if (b.filas.promociones.some(p => p.category === fuente.id && p.comercio_id === vinculo.comercio_id)) { mensaje('Retira primero las ofertas del comercio para desvincularlo.',true); continue; }
        b.eliminar('categoria_comercios',vinculo);
      }
      for (const id of comerciosElegidos) if (!b.filas.categoria_comercios.some(c => c.categoria_id === fuente.id && c.comercio_id === id)) b.agregar({ categoria_comercios: [{ categoria_id: fuente.id, comercio_id: id }] });
    }
    peticion = undefined; renderizar();
  };
  $('dialogo').showModal();
}
function eliminar() {
  if (!seleccion || ocupado) return;
  const c = seleccion._conteos || {};
  if (vista === 'categorias' && (b.filas.categoria_comercios.some(v => v.categoria_id === seleccion.id) || b.filas.promociones.some(p => p.category === seleccion.id) || b.filas.preferencias_usuario.some(p => p.categorias.includes(seleccion.id)))) { mensaje('Retira primero los comercios, ofertas y preferencias vinculados a esta categoría.',true); return; }
  if (vista === 'comercios' && (c.sucursales > 0 || b.filas.promociones.some(p => p.comercio_id === seleccion.id))) { mensaje('Retira primero las promociones o sucursales vinculadas a este comercio.', true); return; }
  const resumen = Object.entries(c).map(([nombre,n]) => `${nombre}: ${n}`).join(', ');
  if (!confirm(`¿Marcar para eliminar ${seleccion.nombre || seleccion.id || seleccion.promocion_id}?${resumen ? '\nDependencias: ' + resumen : ''}\nSe aplicará al pulsar Guardar.`)) return;
  b.eliminar(vista, seleccion); seleccion = null; peticion = undefined; renderizar();
}
async function guardar() {
  if (ocupado || preparandoImagen) return;
  for (const p of b.filas.promociones) if (p.category && p.comercio_id && !b.filas.categoria_comercios.some(c => c.categoria_id === p.category && c.comercio_id === p.comercio_id)) b.agregar({ categoria_comercios: [{ categoria_id: p.category, comercio_id: p.comercio_id }] });
  let cambios;
  try { cambios = validarCambios(b.cambios()); } catch (e) { mensaje(e.message, true); return; }
  if (!cambios.length) return;
  const bajas = cambios.filter(c => c.operacion === 'eliminar');
  if (conflictos.length && !confirm(`Se aplicarán tus campos editados sobre registros actualizados:\n${conflictos.join('\n')}\n¿Guardar?`)) return;
  if (bajas.length && !confirm(`Guardar ${cambios.length} cambios, incluyendo ${bajas.length} eliminaciones y sus dependencias confirmadas?`)) return;
  const rutas = new Set(cambios.filter(c => c.operacion !== 'eliminar').flatMap(c => [c.datos.imagen_url,c.datos.logo_url]));
  const archivos = [...imagenes.values()].filter(i => rutas.has(i.ruta)).map(({ruta,contenido}) => ({ruta,contenido}));
  const cuerpo = JSON.stringify({ cambios, archivos });
  if (!peticion || cuerpo !== cuerpoPeticion) { peticion = crypto.randomUUID(); cuerpoPeticion = cuerpo; }
  ocupado = true; estado(); mensaje('Guardando…');
  try {
    const lectura = await api('/api/guardar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ peticion, cambios, archivos }) });
    for (const i of imagenes.values()) URL.revokeObjectURL(i.vista); imagenes.clear();
    b.cargar(lectura.datos); conflictos = []; ultimaConsulta = lectura.consultadoEn; $('consulta').textContent = new Date(ultimaConsulta).toLocaleString(); seleccion = null; peticion = undefined; renderizar(); mensaje('Cambios guardados.');
  } catch (e) { if (e.estado !== 503) peticion = undefined; mensaje(e.message, true); }
  finally { ocupado = false; estado(); }
}
$('nuevo').addEventListener('click', () => { const f = filaNueva(vista); if (vista === 'perfiles') { f.id = siguienteId('usuario',b.filas.perfiles); f.usuario_acceso = f.id; f.contrasena = '123'; } else if (tablas[vista].claves.includes('id')) f.id = siguienteId(({ categorias:'categoria',comercios:'comercio',cuentas:'cuenta',promociones:'oferta' })[vista] || vista,b.filas[vista]);
  if (vista === 'promociones') { if (categoriaActiva) f.category = categoriaActiva; if (comercioActivo) f.comercio_id = comercioActivo; }
  b.agregar({ [vista]: [f] }); if (vista === 'comercios' && categoriaActiva) b.agregar({ categoria_comercios: [{ categoria_id: categoriaActiva, comercio_id: f.id }] }); renderizar(); seleccion = b.filas[vista].at(-1); propiedades(); });
$('rapido').addEventListener('click', () => { const filas = generarPerfil(Math.random,b.filas); b.agregar(filas); navegar('perfiles'); seleccion = b.filas.perfiles.at(-1); propiedades(); });
$('propiedades').addEventListener('click', propiedades); $('eliminar').addEventListener('click', eliminar); $('guardar').addEventListener('click', guardar);
$('cancelar').addEventListener('click', () => { if (confirm('¿Descartar todos los cambios pendientes?')) { b.cancelar(); for (const i of imagenes.values()) URL.revokeObjectURL(i.vista); imagenes.clear(); conflictos = []; peticion = undefined; seleccion = null; mensaje(); renderizar(); } });
$('actualizar').addEventListener('click', cargar); $('comprobar').addEventListener('click', cargar);
$('nav-inicio').dataset.tabla = 'inicio'; $('nav-inicio').addEventListener('click', () => navegar('inicio'));
configurarSeparador($('separador-panel'),document.querySelector('.contenido'),document.querySelector('.ventana'));
window.addEventListener('beforeunload', e => { if (cambiosPendientes()?.length) { e.preventDefault(); e.returnValue = ''; } });
function leerRuta() { const [t,cat,com] = location.hash.slice(1).split('/').map(decodeURIComponent); if (t === 'inicio' || tablas[t]) { vista = t; categoriaActiva = cat || null; comercioActivo = com || null; seleccion = null; } }
window.addEventListener('hashchange', () => { leerRuta(); renderizar(); });
try { config = await (await fetch('/api/config')).json(); $('destino').textContent = config.destino || 'Sin configurar'; leerRuta(); await cargar(); }
catch { mensaje('No se pudo iniciar Midi. Vuelve a cargar la página.', true); $('estado').textContent = 'Sin conexión'; estado(); }
