# Sistema visual de Promociones

Subtarea 1 de H22 ([SCRUM-127](https://somos-agilistas.atlassian.net/browse/SCRUM-127)). Es la capa visual propia de la sección Promociones: Para ti, Detalle, Guardadas y Mis preferencias. La decisión de tenerla está en [ADR-011](<../ADR/0011-Decision de usar un sistema visual propio en Promociones.md>). Por decisión del PO operativo del 23 de octubre de 2026, la sección no sigue las medidas de las demás interfaces de la [guía de UI](GUIA_UI_BANCOAGRICOLA.md), como el tamaño de los botones. Sí conserva la marca: amarillo y oscuro, tipografía CIB Sans y fotos reales del catálogo.

**Estado:** versión 3 (24 de octubre de 2026), con Para ti con todas las tarjetas (SCRUM-133), fusionada en main con el PR 29 el 25 de octubre de 2026. Las decisiones de esta versión están en los comentarios 10031 y 10034 de SCRUM-116, 10032 de SCRUM-11, 10033 de SCRUM-67, 10035 de SCRUM-118 y 10036 de SCRUM-119.

| Archivo | Contenido |
| --- | --- |
| `public/css/promociones-sistema.css` | Tokens y componentes. Se aplica a las páginas con `body.pr`. |
| `public/css/promociones.css` | Composición de cada pantalla: detalle, Guardadas y Mis preferencias. |
| `public/js/franja.js` | Qué avisos muestra el carrusel (función pura). |
| `public/js/carrusel.js` | Reproductor del carrusel (`crearReproductor`) y su dibujo (`montarCarrusel`). |
| `public/js/aviso-deshacer.js` | Aviso con «Deshacer». |
| `public/js/promocion-vista.js` | Textos y piezas de la tarjeta y del detalle: `textoVencePronto`, `formaDias`, `textoDias`, `estadoDias`, `mostrarDias`, `pasosDeUso`, `mostrarPasos`, `restriccionesDe`, `mostrarRestricciones`, `hoyEnElSalvador`, `diaDeLaSemana`, `textoOtrasTarjetas`. |
| `public/js/pestanas.js` | Pestañas Para ti · Cerca de ti · Explorar: orden, gesto de deslizar, sección recordada y consulta de Explorar. |
| `public/js/filtros-activos.js` | Píldoras de los filtros activos y nombre accesible del botón Filtros. |

**Regla para las demás historias** (H20, H21, H23 y H25): usar estas clases y tokens sin escribir estilos propios. Un estado nuevo se añade aquí y en el CSS del sistema.

## Idea

- **Pocas opciones a la vista.** Arriba están el título, Guardadas y Mis preferencias como iconos, y una sola fila con la búsqueda y el botón **Filtros**. Tarjeta, categoría y «Solo lo que aplica hoy» viven en la hoja Filtros. Sobre la lista solo se ven los filtros activos, como píldoras que se quitan con ×.
- **Todas tus tarjetas.** Para ti ordena lo mejor de todas las tarjetas propias. Cada promoción dice con cuáles de ellas aplica («Aplica a tus tarjetas Black y Básica», «Solo con tu tarjeta Black») y, si otra cambia el beneficio, la menciona («También 15 % con tu Básica»).
- **Fondo blanco y cabecera amarilla.** El fondo es blanco puro, como la app del banco. El amarillo de la marca se queda en la cabecera, siempre igual, y en las acciones.
- **Acentos de compras.** Cada categoría tiene un color alegre (mandarina, sandía, uva, menta, agua y cielo) que se usa como tinte suave con el icono saturado, nunca como color de texto. El beneficio va en una **etiqueta de precio** sobre la foto real.
- **Simplicidad cuidada.** Mucho aire, jerarquía por peso y tamaño, hojas inferiores para las opciones y microanimaciones discretas.

## Tokens (`.pr`)

| Grupo | Tokens |
| --- | --- |
| Tinta y superficies | `--pr-tinta` `#1d1b1a`, `--pr-texto-2` `#5a5753` (7:1), `--pr-texto-3` `#6f6b66` (5.2:1), `--pr-superficie`, `--pr-fondo` `#ffffff`, `--pr-hundido`, `--pr-linea` |
| Marca | `--pr-amarillo` `#fdda24`, `--pr-amarillo-hondo`, `--pr-amarillo-suave`, `--pr-noche` `#141414` |
| Estados | `--pr-verde` (disponible hoy), `--pr-naranja` y `--pr-naranja-suave` (vence pronto), `--pr-rojo` y `--pr-rojo-suave` (vencida, error) |
| Acentos | `--pr-mandarina`, `--pr-sandia`, `--pr-uva`, `--pr-menta`, `--pr-agua`, `--pr-cielo`: tintes al 12–14 % con icono saturado |
| Cabecera | `--pr-hero`, `--pr-hero-tinta`, `--pr-hero-velo`, `--pr-hero-borde`, `--pr-hero-aro`: amarillo de la marca, sin cambio por tarjeta |
| Forma | `--pr-radio-tarjeta` 22 px, `--pr-sombra-tarjeta`, `--pr-sombra-flotante` |
| Movimiento | `--pr-rapido` 160 ms, `--pr-medio` 280 ms, `--pr-lento` 420 ms, `--pr-curva`; con movimiento reducido valen 0 y se quitan las animaciones |
| Iconos | `--pr-i-*`: trazos lineales propios en SVG dentro del CSS. Los de categoría son de Lucide y conservan su metadata en `recursos/categorias/`. |

**Acento por categoría** (`[data-category]` en los filtros y `[data-categoria]` en tarjetas y fichas):

| Categoría | Acento |
| --- | --- |
| Restaurantes | mandarina |
| Compras | sandía |
| Entretenimiento | uva |
| Supermercados | menta |
| Salud | agua |
| Tecnología | cielo |

## Componentes

### Cabecera de la sección (`.pr-hero`)

- **Barra** (`.pr-hero__barra`): título grande; iconos `.pr-icono` de Guardadas (con `.pr-contador` de guardadas) y de Mis preferencias. El de la página actual lleva `aria-current`. En Guardadas y Mis preferencias, la flecha de volver lleva a Para ti.
- **Fila de búsqueda** (`.pr-buscador`): campo blanco con lupa y botón **Filtros** (`.pr-boton-filtros`), que muestra cuántos filtros hay activos y tiene un nombre accesible («Filtros, 2 activos»).
- **Hoy busco (H25)** (`.pr-hoy`): tira deslizable bajo la búsqueda (comentario 10035 de SCRUM-118). Cada chip (`.pr-hoy__chip`, `role="radio"`) es una pastilla translúcida con icono y una palabra; su nombre accesible es el nombre completo de la ocasión y contiene esa palabra. Marcado: relleno oscuro, icono ✓ y `aria-checked`. Altura visible de 32 px y área táctil de 44 px. Con un chip activo, «Primero: …» (`.pr-hoy__estado`) aparece en la propia cabecera. La tira está oculta hasta que la página tiene tarjetas con las que consultar.
- **Fondo:** amarillo de la marca con aros de fondo. Ya no cambia con la tarjeta.

### Franja de avisos (carrusel)

- **Qué muestra:** los avisos que elige `diapositivasFranja`, de 0 a 5, en este orden de prioridad:
  1. vence pronto;
  2. con la que más ahorras hoy;
  3. hoy toca;
  4. aviso de la semana;
  5. tus guardadas;
  6. por qué este orden.

  La encuesta no va en la franja: se ofrece con su hoja y con el aviso de la lista, sin repetirse (ADR-010).
- **Qué no muestra:** nunca repite una tarjeta de la lista y solo usa datos reales. «Con la que más ahorras» compara topes de lo que aplica hoy y, con orden personalizado, prefiere los intereses declarados.
- **Forma:**
  - diapositiva central al 82 % del ancho, con las vecinas asomando a 0.9 de escala y atenuadas;
  - icono de color por tipo;
  - rótulo, título y detalle.
- **Avance:**
  - pasa sola cada 5 s, con barras de progreso;
  - el botón de pausa siempre está visible (WCAG 2.2.2);
  - se retiene con el foco, con el puntero, fuera de la vista o con la pestaña oculta;
  - al arrastrar o tocar una vecina se detiene;
  - con movimiento reducido empieza detenida.
- **Teclado:** las flechas navegan. La región en vivo está en `off` mientras avanza sola y en `polite` cuando está detenida.
- **Acciones:** los avisos de promoción desplazan la lista hasta la tarjeta y la resaltan. El aviso semanal abre el detalle. Los demás llevan a Guardadas o a Mis preferencias.

### Pestañas (`.pr-pestanas`)

- **Dónde:** bajo la franja de avisos, que queda arriba y compartida. Se quedan fijas arriba al desplazar la lista.
- **Secciones:** Para ti (orden del motor con las señales y «Hoy busco»), Cerca de ti (espacio `#mapa-cerca` donde H8 monta el mapa) y Explorar (`/api/para-ti?explorar=1`: todo lo vigente de las tarjetas propias, sin recortar por intereses ni usar la intención del día; lo de interés va primero). Para ti y Explorar comparten `#panel-lista`; la tira «Hoy busco» solo se ve en Para ti.
- **Forma:** tres pestañas de igual ancho (`role="tab"`) con un indicador amarillo que se desliza a la elegida. El conteo queda pequeño bajo las pestañas.
- **Uso:** toque, flechas, Inicio y Fin, o deslizar a los lados sobre la lista o el mapa (al menos 56 px y más horizontal que vertical). La sección elegida se recuerda por perfil en la pestaña del navegador, para volver del detalle a la misma.

### Hoja Filtros y píldoras

- **Hoja** (`<dialog id="filtros" class="pr-hoja">`): se abre con el botón Filtros y se cierra con «Listo», Esc o tocando fuera. Los cambios se aplican al tocarlos. Contiene tres grupos:
  - **Tarjeta (H16):** lista con mini tarjeta. «Todas mis tarjetas» va primero y es el valor por omisión; con una sola tarjeta se muestra solo su nombre.
  - **Categoría (H5):** chips que envuelven, cada uno con su icono sobre un tinte de su acento. Marcado: relleno oscuro y `aria-pressed`.
  - **Cuándo (H17):** «Solo lo que aplica hoy», con un interruptor y `aria-pressed`.
- **Píldoras** (`.pr-pildoras`): solo aparecen con filtros activos, en orden fijo: categoría, tarjeta y aplica hoy. Cada una quita su filtro.

### Tarjeta de promoción

```html
<article class="promo-item" data-categoria="Compras" data-exclusiva="si">
  <a class="promo-card">…foto, logo, insignia, beneficio sobre la foto…
    <div class="promo-content">comercio · categoría · razón · descripción · días con reloj · vigencia · avisos · condiciones · pie</div>
  </a>
  <button class="guardar-promo" data-guardada="no">Guardar</button>   <!-- hermano del enlace (SCRUM-110) -->
  <p class="error guardar-error" role="alert"></p>
</article>
```

| Estado | Cómo se ve |
| --- | --- |
| Normal | Sombra suave; al pasar el puntero, sube 3 px y la foto se acerca. |
| Foco | Contorno oscuro de 3 px. |
| Con razón del motor | Píldora amarilla suave con destello: «Porque elegiste…». |
| Días (`.promo-cuando`) | Pastilla con reloj y una frase de los días (`estadoDias`). Verde si aplica hoy («Disponible hoy · sábados y domingos»), roja si está vigente pero hoy no es uno de sus días («Disponible los miércoles») y gris fuera de vigencia. Las condiciones no repiten los días. |
| Vence pronto (≤ 7 días) | Píldora naranja suave con reloj: «Vence en N días». |
| Vencida durante la visita | Píldora roja «Vencida» y foto en gris. |
| Beneficio | Etiqueta de precio color sandía, con orificio y ligera inclinación, sobre la foto; el degradado de la foto es suave. |
| Exclusiva Black | Insignia sobre la foto, etiqueta de precio negra con dorado y cuerpo negro con filo dorado. |
| Todas las tarjetas | `textoAplica`: «Aplica a tus tarjetas Black y Básica» (mini tarjeta doble, `data-tarjeta="ambas"`), «Aplica a tus 2 tarjetas Básica», «Solo con tu tarjeta Black» si el perfil tiene más de una, o «Aplica a tu tarjeta …». Debajo, `.promo-otras` con la otra tarjeta si su beneficio cambia. Dos tarjetas del mismo tipo y beneficio no se repiten. |
| Sin foto | Fondo oscuro con un halo del acento de la categoría. |
| Guardada | Botón amarillo con icono lleno y un latido breve. Para ti confirma con el aviso «Deshacer». |
| Error al guardar | Mensaje rojo bajo la tarjeta. |

La tarjeta conserva lo que exige H4: comercio, beneficio, descripción, vigencia, tarjeta aplicable, días, compra mínima, tope y «Ver promoción».

### Estado vacío o de error (`.pr-estado`)

- **Visibilidad:** se oculta mientras su `[role="status"]` está vacío. La variante `.pr-estado--lista` (Guardadas) se oculta mientras ninguno de sus mensajes está visible.
- **Vacío:** icono de lupa sobre amarillo y acciones en píldoras de 38 px.
- **Error:** con `.error` dentro, el icono pasa a alerta sobre rojo suave.

### Carga (`.pr-esqueleto`)

Dos tarjetas fantasma con brillo. Se muestran mientras se carga la lista y respetan el mínimo de 1 s existente.

### Aviso con deshacer (`.pr-aviso`)

```js
const aviso = crearAviso(document.querySelector('#pr-aviso'));
aviso.mostrar({ texto: 'Promoción guardada.', alDeshacer: () => … });
```

- **Un solo aviso a la vez:** uno nuevo reemplaza al anterior.
- **Duración:** se retira a los 6 s y se detiene con el foco o el puntero dentro (WCAG 2.2.1).
- **Deshacer:** se ejecuta una sola vez, devuelve el foco a la tarjeta y no abre otro aviso.

### Encuesta (H21, ADR-010)

- **Hoja** (`#survey-sheet`): fija abajo con el 62 % de alto en todas las páginas, sin velo ni asa. El fondo queda inerte y el contador queda visible bajo las pestañas. Mosaicos blancos con el icono teñido del acento de su categoría; marcado = ✓ en círculo, borde de 2 px y fondo amarillo suave. Pastillas en el paso 3. Botón principal amarillo a todo lo ancho, con «Atrás» y «Omitir» a la vista.
- **Cuándo se ofrece** (`ofertaEncuesta`, marcas del servidor): la primera vez con la encuesta pendiente se abre la hoja y se guarda `hoja-mostrada`. Después aparece el aviso de la lista (`#encuesta-aviso`), con «Empezar» y cierre; cerrarlo guarda `aviso-cerrado` y no vuelve. «Personalizar en 3 pasos» de Mis preferencias (`?encuesta=1`) la abre siempre.
- **Opciones:** salen de todo lo vigente (`/api/para-ti?explorar=1`), no de la lista ya recortada por intereses. Con letra grande (escala ≥ 1,3) hay menos opciones (`cupoOpciones`), sin cortar texto.
- **Vista previa:** las tarjetas se desplazan en 200 ms, animando solo posición y opacidad (`js/movimiento-lista.js`). Si nada cambia no hay animación, y con movimiento reducido el cambio es instantáneo.
- **Cabecera:** tres segmentos (`.survey-progreso`) junto a «Paso n de 3», y la cuenta en vivo de la lista (`#survey-cuenta`), que da un pequeño salto al cambiar. Debajo, una línea de ayuda por página («Elige todas las que quieras», «Elige una · 1 de 3»).
- **Detalles:** las pastillas del paso 3 llevan un icono según su valor. Solo la opción tocada da un pequeño salto al marcarse, el contenido entra deslizándose al cambiar de página, y el botón principal lleva una flecha en «Siguiente» y ✓ en «Listo». Con movimiento reducido no hay ninguna de estas animaciones. Con letra grande las categorías pasan a dos columnas.
- **Al terminar:** «Listo» deja la nota `.pr-encuesta-listo`, que dice dónde editar los intereses.

### Hoja inferior (`.pr-hoja`)

- **Uso:** `<dialog class="pr-hoja">` abierto con `showModal()`, con asa, título, cuerpo desplazable y acciones.
- **Variante sin velo:** `.pr-hoja--sin-velo` no oscurece la lista (ADR-010). Queda lista para H21; en esta rama ninguna pantalla la usa todavía.

## Pantallas

- **Promociones:** cabecera con iconos, fila de búsqueda y Filtros, franja de avisos, pestañas, píldoras activas, conteo («17 promociones») y lista o mapa.
- **Detalle:**
  - foto cuadrada a sangre con «Volver» y Guardar flotantes;
  - comercio y beneficio sobre la foto;
  - hoja con la categoría, la descripción y los bloques «Cómo usarla» (`.pr-pasos`: comercio y canal, días, tarjeta, compra mínima y tope, y al final las instrucciones de la promoción como nota; debajo, «Restricciones» con las de la tarjeta y las generales de la promoción, que «Condiciones» ya no repite; «Ver en el mapa» lleva a «Dónde»), «Cuándo» (días con reloj, vigencia, vence pronto), «Con tu tarjeta» (con la otra tarjeta si cambia el beneficio), «Condiciones» y «Dónde» (`#mapa-detalle`, donde H8 monta el mapa; solo con canal presencial).
- **Guardadas:** misma cabecera y misma tarjeta. Busca entre las guardadas y muestra los vacíos en `.pr-estado--lista`.
- **Mis preferencias:**
  - fichas en dos columnas con el icono y el acento de cada categoría, y ✓ al marcarlas;
  - barra de acciones fija abajo con «Cancelar» y «Guardar cambios».

## Accesibilidad

- **Contraste:** AA en todos los textos. Encima de las fotos el texto es blanco con degradado y sombra.
- **Selección:** se distingue por relleno, ✓, icono o texto, nunca solo por color.
- **Teclado:** foco visible en todo y flechas en el carrusel. Los checkbox de las fichas siguen siendo reales.
- **Movimiento reducido:** sin animaciones ni avance automático.
- **Anchos comprobados:** las cuatro pantallas a 390 px y Para ti también a 320 px, sin desplazamiento horizontal.

## Pendientes

- Probar con NVDA o VoiceOver el anuncio del aviso y del carrusel.
- El «aviso del banco» de la propuesta v4 necesita textos aprobados por el PO; no se incluyó.
- El mapa (H8) no está en esta subtarea.
