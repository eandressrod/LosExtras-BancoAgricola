// H21: hoja inferior de la encuesta en tres pasos sobre la lista real de Para ti (ADR-010).
// Las reglas viven en encuesta-modelo.js; aquí solo se pinta, se escucha y se habla con /api/senales y /api/preferencias.
//
// Cada página se confirma con el botón principal y entonces escribe sus señales con origen encuesta.
// Antes de confirmar, la selección solo alimenta la vista previa, calculada en el navegador con el motor de H22.
import { getJSON } from './comun.js';
import { ordenarParaTi } from './motor/index.js';
import {
  opcionesIntereses, categoriasAfinar, opcionesAfinar, alternar, seleccionVacia, textoBotonPrincipal, pasosEncuesta,
  senalesDePagina, cambiosSenales, buscarOpciones, textoContador, anuncioVistaPrevia, cupoOpciones
} from './encuesta-modelo.js';

const ESPERA_VISTA_PREVIA_MS = 250;
const ERROR_GUARDAR = 'No se pudieron guardar tus intereses. Intenta de nuevo.';
// Paso 3: una página por pregunta (P3), en este orden.
const FILAS_CRITERIOS = [
  { fila: 'canal', pregunta: '¿Cómo aprovechas tus promos?', rol: 'radio', opciones: [
    ['presencial', 'En el local'], ['delivery', 'A domicilio'], ['en-linea', 'En línea'], ['indiferente', 'De todo un poco']] },
  { fila: 'beneficio', pregunta: '¿Qué beneficio te sirve más?', ayuda: 'Hasta 2', rol: 'checkbox', opciones: [
    ['descuento', 'Descuento'], ['2x1-combo', '2x1 o combos'], ['cuotas-sin-intereses', 'Cuotas sin intereses'],
    ['cashback-puntos', 'Cashback o puntos'], ['indiferente', 'Me da igual']] },
  { fila: 'descubrir', pregunta: '¿Qué prefieres ver?', rol: 'radio', opciones: [
    ['siempre', 'Mis lugares de siempre'], ['mezcla', 'Un poco de todo'], ['nuevos', 'Lugares nuevos']] }
];

async function enviar(url, metodo, cuerpo) {
  const respuesta = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })
    .catch(() => { throw new Error(ERROR_GUARDAR); });
  if (respuesta.status === 401) { location.replace('/index.html'); throw new Error('Inicia sesión para continuar.'); }
  if (!respuesta.ok) throw new Error(ERROR_GUARDAR);
  return respuesta.json();
}

/**
 * @param {object} datos
 * @param {{id: string}} datos.perfil dueño de la sesión; su id es la semilla del orden de presentación
 * @param {object[]} datos.lista promociones de Para ti que se ven detrás de la hoja (todas las tarjetas propias o la del filtro)
 * @param {Array<object>} datos.categorias categorías vigentes de /api/categorias
 * @param {(vista: {promociones: object[], contador: string}) => void} datos.mostrarVistaPrevia
 * @param {(cierre: {terminada: boolean}) => Promise<void> | void} datos.alCerrar
 */
export function abrirEncuestaHoja({ perfil, lista, categorias, mostrarVistaPrevia, alCerrar }) {
  const hoja = document.querySelector('#survey-sheet');
  const paso = hoja.querySelector('#survey-step');
  const titulo = hoja.querySelector('#survey-title');
  const subtitulo = hoja.querySelector('#survey-subtitle');
  const cuerpo = hoja.querySelector('#survey-body');
  const enVivo = hoja.querySelector('#survey-live');
  const error = hoja.querySelector('#survey-error');
  const atras = hoja.querySelector('#survey-back');
  const omitir = hoja.querySelector('#survey-skip');
  const principal = hoja.querySelector('#survey-next');
  const fondo = [document.querySelector('body > header'), document.querySelector('body > main')].filter(Boolean);
  // CDA 10: con letra grande caben menos opciones; la escala se mide una vez al abrir.
  const cupo = cupoOpciones(parseFloat(getComputedStyle(document.documentElement).fontSize) / 16);
  hoja.dataset.columnas = String(cupo.columnas);

  let ofertas = [];
  let activas = [];
  let seleccion = seleccionVacia();
  let pasos = pasosEncuesta([]);
  let indice = 0;
  let buscando = false;
  let ocupada = false;
  let previa = [];
  let temporizador = null;

  const actual = () => pasos[indice];
  const ultima = () => indice === pasos.length - 1;
  // Lo que distingue a la página dentro de su paso: la categoría que se afina o la pregunta del paso 3.
  const detalle = paso => paso.categoria ?? paso.criterio;
  const candidatasDe = categoria => opcionesAfinar(categoria, ofertas, perfil.id, Infinity).opciones;
  const claveOpcion = opcion => `${opcion.ambito}:${opcion.id}`;

  /** Señales activas que pertenecen a la página: solo esas se desactivan al confirmarla. */
  function alcance({ pagina, categoria, criterio }) {
    if (pagina === 1) return senal => senal.clase === 'interes' && senal.ambito === 'categoria';
    if (pagina === 2) {
      const claves = new Set(candidatasDe(categoria).map(claveOpcion));
      return senal => senal.clase === 'interes' && claves.has(`${senal.ambito}:${senal.valor}`);
    }
    return senal => senal.clase === 'criterio' && senal.ambito === criterio;
  }

  // Lo que la persona ya confirmó antes aparece marcado; nada se marca por defecto.
  function seleccionGuardada() {
    const valores = (clase, ambito) => activas.filter(s => s.clase === clase && s.ambito === ambito).map(s => s.valor);
    const vigentes = new Set(categorias.map(categoria => categoria.id));
    const afinar = {};
    for (const categoria of categorias) {
      const claves = candidatasDe(categoria.id).map(claveOpcion).filter(clave => activas.some(s => `${s.ambito}:${s.valor}` === clave));
      if (claves.length) afinar[categoria.id] = claves;
    }
    return {
      categorias: valores('interes', 'categoria').filter(id => vigentes.has(id)), afinar,
      canal: valores('criterio', 'canal')[0] ?? null, beneficio: valores('criterio', 'beneficio').slice(0, 2),
      descubrir: valores('criterio', 'descubrir')[0] ?? null
    };
  }

  function haySeleccion() {
    const { pagina, categoria, criterio } = actual();
    if (pagina === 1) return seleccion.categorias.length > 0;
    if (pagina === 2) return (seleccion.afinar[categoria] ?? []).length > 0;
    return [seleccion[criterio]].flat().filter(Boolean).length > 0;
  }

  // Vista previa: lo ya guardado fuera de esta página más la selección provisional de la página.
  function calcularVistaPrevia() {
    const enPagina = alcance(actual());
    const provisionales = [...activas.filter(senal => !enPagina(senal)), ...senalesDePagina(actual().pagina, seleccion, detalle(actual()))];
    const { promociones } = ordenarParaTi({ ofertas, senales: provisionales });
    const anuncio = anuncioVistaPrevia(previa, promociones);
    const igual = previa.length === promociones.length && previa.every((promo, i) => promo.id === promociones[i].id);
    previa = promociones;
    if (igual) return;
    mostrarVistaPrevia({ promociones, contador: textoContador(promociones.length) });
    enVivo.textContent = anuncio;
  }

  function programarVistaPrevia() {
    clearTimeout(temporizador);
    temporizador = setTimeout(calcularVistaPrevia, ESPERA_VISTA_PREVIA_MS);
  }

  function crearOpcion({ texto, imagen, rol, marcada, alPulsar, clase = '' }) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = `survey-option ${clase}`.trim();
    boton.setAttribute('role', rol);
    boton.setAttribute('aria-checked', String(marcada));
    if (imagen) {
      const img = document.createElement('img');
      img.src = imagen; img.alt = ''; img.width = 32; img.height = 32; img.loading = 'lazy';
      img.addEventListener('error', () => img.remove());
      boton.append(img);
    }
    const nombre = document.createElement('span');
    nombre.className = 'survey-option__name';
    nombre.textContent = texto;
    boton.append(nombre);
    boton.addEventListener('click', alPulsar);
    return boton;
  }

  function cambiar(fila, valor, categoria) {
    // Repintar no debe sacar el foco del teclado de la opción que se acaba de tocar.
    const opciones = () => [...cuerpo.querySelectorAll('button')];
    const enfocada = opciones().indexOf(document.activeElement);
    seleccion = alternar(seleccion, fila, valor, categoria);
    error.textContent = '';
    pintar();
    if (enfocada >= 0) opciones()[enfocada]?.focus();
    programarVistaPrevia();
  }

  function rejilla(clase, opciones) {
    const contenedor = document.createElement('div');
    contenedor.className = `survey-grid ${clase}`;
    contenedor.append(...opciones);
    return contenedor;
  }

  function campoBusqueda(etiqueta, alEscribir) {
    const campo = document.createElement('div');
    campo.className = 'survey-search';
    const label = document.createElement('label');
    label.className = 'visually-hidden';
    label.htmlFor = 'survey-search-input';
    label.textContent = etiqueta;
    const input = document.createElement('input');
    input.id = 'survey-search-input';
    input.type = 'search';
    input.className = 'search-input';
    input.placeholder = etiqueta;
    input.autocomplete = 'off';
    input.maxLength = 100;
    const cerrar = document.createElement('button');
    cerrar.type = 'button';
    cerrar.className = 'secondary survey-search__close';
    cerrar.textContent = 'Volver a las opciones';
    cerrar.addEventListener('click', () => { buscando = false; pintar(); });
    const resultados = document.createElement('div');
    input.addEventListener('input', () => resultados.replaceChildren(...alEscribir(input.value)));
    campo.append(label, input, resultados, cerrar);
    queueMicrotask(() => input.focus());
    return campo;
  }

  function paginaIntereses() {
    const conOfertas = new Set(opcionesIntereses(ofertas, categorias, Infinity).map(opcion => opcion.id));
    const tile = opcion => crearOpcion({ texto: opcion.nombre, imagen: opcion.icono ?? opcion.icono_url, rol: 'checkbox',
      marcada: seleccion.categorias.includes(opcion.id), alPulsar: () => cambiar('categorias', opcion.id) });
    if (buscando) {
      const buscables = categorias.filter(categoria => conOfertas.has(categoria.id));
      return [campoBusqueda('Buscar categoría', texto => {
        const encontradas = buscarOpciones(buscables, texto);
        return encontradas.length || !texto.trim() ? [rejilla('survey-grid--3', encontradas.map(tile))] : [nota('No encontramos esa categoría.')];
      })];
    }
    const buscar = crearOpcion({ texto: 'Buscar', rol: 'button', marcada: false, clase: 'survey-option--search',
      alPulsar: () => { buscando = true; pintar(); } });
    buscar.removeAttribute('aria-checked');
    // Las elegidas por búsqueda que no están entre las 8 también se ven marcadas.
    const visibles = opcionesIntereses(ofertas, categorias, cupo.categorias);
    const extra = categorias.filter(c => seleccion.categorias.includes(c.id) && !visibles.some(v => v.id === c.id))
      .map(c => ({ id: c.id, nombre: c.nombre, icono: c.icono_url }));
    return [rejilla('survey-grid--3', [...visibles.slice(0, cupo.categorias - extra.length), ...extra].map(tile).concat(buscar))];
  }

  function paginaAfinar(categoria) {
    const marcadas = seleccion.afinar[categoria] ?? [];
    const tile = opcion => crearOpcion({ texto: opcion.nombre, imagen: opcion.imagen, rol: 'checkbox',
      marcada: marcadas.includes(claveOpcion(opcion)), alPulsar: () => cambiar('afinar', claveOpcion(opcion), categoria),
      clase: opcion.ambito === 'comercio' ? 'survey-option--merchant' : '' });
    const { modo, opciones } = opcionesAfinar(categoria, ofertas, perfil.id, cupo.comercios);
    const todas = candidatasDe(categoria);
    if (buscando) {
      return [campoBusqueda('Buscar comercio', texto => {
        const encontradas = buscarOpciones(todas, texto);
        return encontradas.length || !texto.trim() ? [rejilla('survey-grid--2', encontradas.map(tile))] : [nota('No encontramos ese comercio.')];
      })];
    }
    const elegidasFuera = todas.filter(opcion => marcadas.includes(claveOpcion(opcion)) && !opciones.some(o => claveOpcion(o) === claveOpcion(opcion)));
    const extras = [];
    if (modo === 'comercio' && todas.length > opciones.length) {
      const buscar = crearOpcion({ texto: 'Buscar otro', rol: 'button', marcada: false, clase: 'survey-option--link',
        alPulsar: () => { buscando = true; pintar(); } });
      buscar.removeAttribute('aria-checked');
      extras.push(buscar);
    }
    extras.push(crearOpcion({ texto: 'Ninguno de estos', rol: 'checkbox', marcada: marcadas.includes('ninguno'),
      clase: 'survey-option--link', alPulsar: () => cambiar('afinar', 'ninguno', categoria) }));
    return [rejilla('survey-grid--2', [...opciones.slice(0, cupo.comercios - elegidasFuera.length), ...elegidasFuera].map(tile)),
      rejilla('survey-grid--extras', extras)];
  }

  function paginaCriterios(criterio) {
    return FILAS_CRITERIOS.filter(({ fila }) => fila === criterio).map(({ fila, pregunta, ayuda, rol, opciones }) => {
      const grupo = document.createElement('div');
      grupo.className = 'survey-row';
      grupo.setAttribute('role', rol === 'radio' ? 'radiogroup' : 'group');
      const etiqueta = document.createElement('p');
      etiqueta.className = 'survey-row__label';
      etiqueta.id = `survey-row-${fila}`;
      etiqueta.textContent = ayuda ? `${pregunta} · ${ayuda}` : pregunta;
      grupo.setAttribute('aria-labelledby', etiqueta.id);
      const valor = seleccion[fila];
      const chips = opciones.map(([id, texto]) => crearOpcion({ texto, rol, clase: 'survey-chip',
        marcada: Array.isArray(valor) ? valor.includes(id) : valor === id, alPulsar: () => cambiar(fila, id) }));
      grupo.append(etiqueta, ...chips);
      return grupo;
    });
  }

  function nota(texto) {
    const parrafo = document.createElement('p');
    parrafo.className = 'note';
    parrafo.textContent = texto;
    return parrafo;
  }

  function pintar() {
    const { pagina, categoria, criterio } = actual();
    const posicion = pasos.filter(p => p.pagina === pagina);
    paso.textContent = `Paso ${pagina} de 3`;
    titulo.textContent = pagina === 1 ? '¿Qué te interesa?' : pagina === 2 ? '¿Cuáles te gustan?' : '¿Cómo las prefieres?';
    subtitulo.hidden = pagina === 1;
    // Los pasos 2 y 3 tienen varias páginas: «Restaurantes · 1 de 2» o «1 de 3».
    const enPaso = `${posicion.findIndex(p => detalle(p) === detalle(actual())) + 1} de ${posicion.length}`;
    if (pagina === 2) subtitulo.textContent = `${categorias.find(c => c.id === categoria)?.nombre ?? categoria} · ${enPaso}`;
    if (pagina === 3) subtitulo.textContent = enPaso;
    hoja.classList.toggle('survey-sheet--full', buscando);
    cuerpo.replaceChildren(...(pagina === 1 ? paginaIntereses() : pagina === 2 ? paginaAfinar(categoria) : paginaCriterios(criterio)));
    principal.textContent = textoBotonPrincipal(ultima(), haySeleccion());
    atras.setAttribute('aria-disabled', String(indice === 0));
    principal.disabled = ocupada;
    omitir.disabled = ocupada;
  }

  function irA(nuevo) {
    indice = nuevo;
    buscando = false;
    pintar();
    titulo.focus();
    programarVistaPrevia();
  }

  async function escribirPagina() {
    const pagina = actual();
    const deseadas = senalesDePagina(pagina.pagina, seleccion, detalle(pagina));
    const { activar, desactivar } = cambiosSenales(activas, deseadas, alcance(pagina));
    const creadas = await Promise.all(activar.map(nueva => enviar('/api/senales', 'POST', nueva)));
    await Promise.all(desactivar.map(id => enviar('/api/senales', 'PATCH', { id, activa: false })));
    activas = [...activas.filter(senal => !desactivar.includes(senal.id)), ...creadas.map(respuesta => respuesta.senal)];
  }

  function cerrar(terminada) {
    clearTimeout(temporizador);
    hoja.hidden = true;
    for (const elemento of fondo) elemento.inert = false;
    return alCerrar({ terminada });
  }

  async function confirmar() {
    if (ocupada) return;
    ocupada = true;
    error.textContent = '';
    pintar();
    try {
      await escribirPagina();
      const { pagina } = actual();
      if (ultima()) {
        // Solo «Listo» marca la encuesta como completada; sin categorías queda pendiente (ADR-010).
        const elegidas = activas.filter(s => s.clase === 'interes' && s.ambito === 'categoria').map(s => s.valor);
        if (elegidas.length) await enviar('/api/preferencias', 'POST', { categorias: elegidas });
        ocupada = false;
        await cerrar(true);
        return;
      }
      if (pagina === 1) {
        pasos = pasosEncuesta(categoriasAfinar(seleccion.categorias, ofertas));
      }
      ocupada = false;
      irA(indice + 1);
    } catch (fallo) {
      ocupada = false;
      pintar();
      error.textContent = fallo.message;
    }
  }

  async function cargar() {
    error.textContent = '';
    cuerpo.replaceChildren(nota('Cargando opciones...'));
    try {
      const { senales } = await getJSON('/api/senales');
      ofertas = lista;
      activas = senales;
      seleccion = seleccionGuardada();
      previa = [];
      pintar();
      titulo.focus();
      calcularVistaPrevia();
    } catch (fallo) {
      const reintentar = document.createElement('button');
      reintentar.type = 'button';
      reintentar.className = 'secondary';
      reintentar.textContent = 'Reintentar';
      reintentar.addEventListener('click', cargar);
      cuerpo.replaceChildren(reintentar);
      error.textContent = fallo.message;
    }
  }

  principal.onclick = confirmar;
  atras.onclick = () => { if (indice > 0 && !ocupada) irA(indice - 1); };
  // «Omitir» conserva lo ya confirmado y cierra; la marca del servidor evita que la hoja vuelva a abrirse sola (ADR-010).
  omitir.onclick = () => {
    if (ocupada) return;
    cerrar(false);
  };

  for (const elemento of fondo) elemento.inert = true;
  hoja.hidden = false;
  // Detrás de la hoja deben verse el contador y las primeras tarjetas, no la cabecera del módulo.
  document.querySelector('#pr-conteo')?.scrollIntoView({ block: 'start' });
  paso.textContent = 'Paso 1 de 3';
  titulo.textContent = '¿Qué te interesa?';
  return cargar();
}
