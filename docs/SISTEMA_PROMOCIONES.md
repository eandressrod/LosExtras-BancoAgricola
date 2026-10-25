# Sistema visual de Promociones

Subtarea 1 de H22 ([SCRUM-127](https://somos-agilistas.atlassian.net/browse/SCRUM-127)). Es la capa visual propia de la sección Promociones: Para ti, Detalle, Guardadas y Mis preferencias. La decisión de tenerla está en [ADR-011](<../ADR/0011-Decision de usar un sistema visual propio en Promociones.md>). Por decisión del PO operativo del 23 de octubre de 2026, la sección no sigue las medidas de las demás interfaces de la [guía de UI](GUIA_UI_BANCOAGRICOLA.md), como el tamaño de los botones. Sí conserva la marca: amarillo y oscuro, tipografía CIB Sans y fotos reales del catálogo.

**Estado:** implementado en la rama `hu/SCRUM-127-promociones-ui`, sobre la rama del motor (PR 25). Falta la aprobación del PO (David).

| Archivo | Contenido |
| --- | --- |
| `public/css/promociones-sistema.css` | Tokens y componentes. Se aplica a las páginas con `body.pr`. |
| `public/css/promociones.css` | Composición de cada pantalla: detalle, Guardadas y Mis preferencias. |
| `public/js/franja.js` | Qué avisos muestra el carrusel (función pura). |
| `public/js/carrusel.js` | Reproductor del carrusel (`crearReproductor`) y su dibujo (`montarCarrusel`). |
| `public/js/aviso-deshacer.js` | Aviso con «Deshacer». |
| `public/js/promocion-vista.js` | Textos y piezas de la tarjeta: `textoVencePronto`, `tiraDias`, `mostrarDias`, `hoyEnElSalvador`, `diaDeLaSemana`. |

**Regla para las demás historias** (H20, H21, H23 y H25): usar estas clases y tokens sin escribir estilos propios. Un estado nuevo se añade aquí y en el CSS del sistema.

## Idea

- **La foto manda.** Cada tarjeta lleva la foto real del comercio con un degradado oscuro y el beneficio en blanco y grande sobre ella. Debajo van el comercio, la categoría, los días y las condiciones.
- **El color sigue a la tarjeta.** La cabecera de la sección es amarilla con la Básica y negra, con aros dorados, con la Black. Cambia con el selector.
- **Cada categoría tiene su acento.** Se ve en un punto, una barra corta bajo la foto y el icono del filtro. El texto siempre es oscuro, así que el color no lleva información por sí solo.
- **Controles compactos.** Filtros de 36 px en una sola fila deslizable, Guardar como botón redondo sobre la foto y pestañas en una píldora. El área táctil de los iconos se amplía con un pseudoelemento invisible.

## Tokens (`.pr`)

| Grupo | Tokens |
| --- | --- |
| Tinta y superficies | `--pr-tinta` `#1d1b1a`, `--pr-texto-2` `#5a5753` (7:1), `--pr-texto-3` `#6f6b66` (5.2:1), `--pr-superficie`, `--pr-fondo` `#f3f2ee`, `--pr-hundido`, `--pr-linea` |
| Marca | `--pr-amarillo` `#fdda24`, `--pr-amarillo-hondo`, `--pr-amarillo-suave`, `--pr-noche` `#141414` |
| Estados | `--pr-verde` (disponible hoy), `--pr-naranja` y `--pr-naranja-suave` (vence pronto), `--pr-rojo` y `--pr-rojo-suave` (vencida, error) |
| Cabecera | `--pr-hero`, `--pr-hero-tinta`, `--pr-hero-velo`, `--pr-hero-borde`, `--pr-hero-aro`, `--pr-hero-activa`; cambian con `body[data-tarjeta="basica"/"black"]` |
| Forma | `--pr-radio-tarjeta` 22 px, `--pr-sombra-tarjeta`, `--pr-sombra-flotante` |
| Movimiento | `--pr-rapido` 160 ms, `--pr-medio` 280 ms, `--pr-lento` 420 ms, `--pr-curva`; con movimiento reducido valen 0 y se quitan las animaciones |
| Iconos | `--pr-i-*`: trazos lineales propios en SVG dentro del CSS. Los de categoría son de Lucide y conservan su metadata en `recursos/categorias/`. |

**Acento por categoría** (`[data-category]` en los filtros y `[data-categoria]` en tarjetas y fichas):

| Categoría | Acento |
| --- | --- |
| Restaurantes | naranja |
| Compras | violeta |
| Entretenimiento | rosa |
| Supermercados | amarillo hondo |
| Salud | verde |
| Tecnología | azul |

## Componentes

### Cabecera de la sección (`.pr-hero`)

- **Contenido:** título, pestañas del módulo (`.module-nav`), selector de tarjeta y búsqueda.
- **Selector de tarjeta:** cada opción es una mini tarjeta. La Black lleva `data-tipo="black"`. La elegida va en blanco (con Black, en amarillo) y con ✓.
- **Búsqueda:** campo blanco con lupa y botón redondo para limpiar.
- **Fondo y forma:** la cabecera de marca (`header`) comparte su color. El logo se invierte con Black. Los aros de fondo son decoración, sin contenido.

### Franja de avisos (carrusel)

- **Qué muestra:** los avisos que elige `diapositivasFranja`, de 0 a 5, en este orden de prioridad:
  1. encuesta pendiente;
  2. vence pronto;
  3. con la que más ahorras hoy;
  4. hoy toca;
  5. aviso de la semana;
  6. tus guardadas;
  7. por qué este orden.
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
- **Acciones:** los avisos de promoción desplazan la lista hasta la tarjeta y la resaltan. El aviso semanal abre el detalle. Los demás llevan a Guardadas, a Mis preferencias o a la encuesta.

### Filtros (`.pr-filtros`)

- **Distribución:** una sola fila deslizable que queda fija arriba al desplazar. Primero «Disponibles hoy» y después las categorías.
- **Chips:** 36 px, con icono de la categoría en su acento.
- **Marcado:** fondo oscuro con icono claro y `aria-pressed`.

### Tarjeta de promoción

```html
<article class="promo-item" data-categoria="Compras" data-exclusiva="si">
  <a class="promo-card">…foto, logo, insignia, beneficio sobre la foto…
    <div class="promo-content">comercio · categoría · razón · descripción · tira de días · vigencia · avisos · condiciones · pie</div>
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
| Días fijos | Tira L M M J V S D: válidos en oscuro, no válidos tachados y hoy con aro amarillo. Las condiciones ya no repiten los días. |
| Disponible hoy | Línea verde con ✓. |
| Vence pronto (≤ 7 días) | Píldora naranja suave con reloj: «Vence en N días». |
| Vencida durante la visita | Píldora roja «Vencida» y foto en gris. |
| Exclusiva Black | Insignia sobre la foto y cuerpo negro con filo dorado. |
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

### Hoja inferior (`.pr-hoja`)

- **Uso:** `<dialog class="pr-hoja">` abierto con `showModal()`, con asa, título, cuerpo desplazable y acciones.
- **Variante sin velo:** `.pr-hoja--sin-velo` no oscurece la lista (ADR-010). Queda lista para H21; en esta rama ninguna pantalla la usa todavía.

## Pantallas

- **Para ti:** cabecera, franja, filtros, conteo («17 promociones») y lista.
- **Detalle:**
  - foto cuadrada a sangre con «Volver» y Guardar flotantes;
  - comercio y beneficio sobre la foto;
  - hoja con la categoría, la descripción y los bloques «Cuándo» (tira, vigencia, vence pronto, disponible hoy), «Con tu tarjeta» y «Condiciones».
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
- Que la encuesta (H21) use `.pr-hoja` y lleve su diapositiva de la franja a la hoja en lugar de a `/encuesta.html`.
- El «aviso del banco» de la propuesta v4 necesita textos aprobados por el PO; no se incluyó.
- El mapa (H8) no está en esta subtarea.
