# Sistema visual de Promociones

Subtarea 1 de H22 ([SCRUM-127](https://somos-agilistas.atlassian.net/browse/SCRUM-127)). Es la capa visual propia de la sección Promociones (Para ti, Guardadas y las pantallas de H20, H21, H23 y H25). Aplica la [guía de UI](GUIA_UI_BANCOAGRICOLA.md), que sigue siendo la fuente de dirección visual; este documento solo concreta los componentes de la sección. La decisión de tener una capa propia está en [ADR-011](<../ADR/0011-Decision de usar un sistema visual propio en Promociones.md>).

**Estado:** primer tramo (tokens, tarjeta, chips, estados vacío y de error, hoja inferior y aviso con deshacer). Pendiente de aprobación del PO antes de que otras historias lo consuman (CDA 11 de H22). Selector de tarjeta, franja informativa, detalle y reloj quedan para los tramos siguientes; el mapa es de H8.

| Archivo | Contenido |
| --- | --- |
| `public/css/promociones-sistema.css` | Tokens `--pr-*` y estilos de todos los componentes. Se enlaza después de `promociones.css` y `guardadas.css`. |
| `public/js/aviso-deshacer.js` | Comportamiento del aviso con deshacer. |
| `public/js/promocion-vista.js` | `textoVencePronto` y `hoyEnElSalvador`, además de los textos que ya existían. |

Regla para las demás historias: usar estas clases y tokens sin estilos propios. Si un componente necesita un estado nuevo, se añade aquí y en el CSS del sistema, no en la hoja de la historia.

## Idea

El beneficio manda y la foto real del comercio lo acompaña. La tarjeta toma la forma de un **cupón**: foto, cuerpo y un talón separado por una línea punteada con muescas a los lados, donde viven las acciones. Es la firma visual de la sección: no copia la pantalla estándar del banco y conserva su paleta (blanco, texto oscuro, amarillo solo para acción y selección) y la tipografía CIB Sans.

## Tokens

Viven en `:root` dentro del CSS del sistema y derivan de los globales de `styles.css` (`--pr-accion: var(--primary)`, `--pr-texto: var(--text)`…), así que un cambio de la paleta global llega a la sección.

| Grupo | Tokens | Valores |
| --- | --- | --- |
| Texto | `--pr-texto`, `--pr-texto-2`, `--pr-texto-3` | `#292929`, `#575757` (7.2:1), `#6b6b6b` (5.3:1) |
| Superficies | `--pr-superficie`, `--pr-fondo`, `--pr-hundido` | blanco, `#f7f7f7` (página), `#eeede8` (espacio de foto) |
| Acción y selección | `--pr-accion`, `--pr-accion-hover`, `--pr-seleccion`, `--pr-seleccion-borde` | amarillo de la guía y su tono suave |
| Estados | `--pr-naranja`, `--pr-naranja-suave`, `--pr-error`, `--pr-error-suave` | vence pronto y error |
| Radios | `--pr-radio-s/m/l/pill` | 8, 14, 20 px y píldora |
| Espacio | `--pr-esp-1` a `--pr-esp-6` | escala de 4 px: 4 a 24 |
| Sombras | `--pr-sombra-1`, `--pr-sombra-2` | tarjeta y aviso |
| Medidas | `--pr-tactil`, `--pr-talon` | 48 px (objetivo táctil), 64 px (talón) |
| Movimiento | `--pr-rapido`, `--pr-medio`, `--pr-lento`, `--pr-curva` | 120, 240, 320 ms; valen 0 con movimiento reducido |
| Iconos | `--pr-icono-*` | guardar, guardada, reloj, calendario, buscar, alerta |

Los iconos son trazos lineales propios dibujados para el sistema, en SVG dentro del CSS. No son recursos del banco ni del kit.

## Componentes

### Tarjeta de promoción

```html
<article class="promo-item">
  <a class="promo-card" href="…" aria-label="Comercio: beneficio. Ver promoción">
    <div class="promo-media">
      <img class="promo-photo" width="960" height="540" loading="lazy" alt="…">
      <div class="merchant-mark"><img class="merchant-logo" alt=""></div>
      <span class="promo-exclusive" hidden></span>
    </div>
    <div class="promo-content">
      <p class="promo-category"></p>
      <p class="promo-reason" hidden></p>      <!-- razón del motor (H22, CDA 6) -->
      <h2></h2>
      <p class="promo-benefit"></p>
      <p class="promo-description"></p>
      <p class="promo-applicability" data-tarjeta="basica|black"></p>
      <p class="promo-validity"></p>
      <p class="promo-ending" hidden></p>      <!-- vence pronto -->
      <p class="promo-expired" hidden></p>     <!-- vencida durante la visita (CDA 7) -->
      <p class="promo-today" hidden></p>
      <p class="promo-badges" hidden></p>      <!-- criterios declarados -->
      <ul class="promo-conditions"></ul>
    </div>
    <span class="promo-open">Ver promoción <span aria-hidden="true">↗</span></span>
  </a>
  <button type="button" class="guardar-promo" data-guardada="no">Guardar</button>
  <p class="error guardar-error" role="alert"></p>
</article>
```

- **Anatomía:** foto 16:9 con `object-fit: cover` (las fotos del catálogo miden 1280×720) → placa del logo que cruza el borde de la foto, de 104×52 px con el logo en `contain` (los logos van de 1:1 a 5.8:1) → categoría, comercio, beneficio grande y descripción → tarjeta aplicable y vigencia → avisos → condiciones como etiquetas → talón.
- **Acciones:** el botón Guardar es **hermano** del enlace y se superpone al talón con grid. El HTML es válido y el lector anuncia por separado el enlace y el botón (resuelve [SCRUM-110](https://somos-agilistas.atlassian.net/browse/SCRUM-110)). H23 añade sus acciones en el mismo talón.
- **Contenido de H4:** la tarjeta conserva comercio, beneficio, descripción, vigencia, tarjeta aplicable, días, compra mínima, tope y Ver promoción (CDA 1 y 6 de H4).

| Estado | Cómo se ve | Señal que no depende del color |
| --- | --- | --- |
| Normal | Borde gris claro y sombra 1 | — |
| Hover | Borde más oscuro; la flecha se desplaza 2 px | — |
| Foco | Contorno de 3 px de `--focus` alrededor de la tarjeta; el botón Guardar lleva el suyo | Contorno |
| Guardada | Botón con icono lleno, borde oscuro, fondo tenue y texto «Quitar» | Icono y texto |
| Sin imagen | Espacio de foto en `--pr-hundido` con el logo centrado y más grande | — |
| Exclusiva Black | Insignia negra con texto amarillo sobre la foto | Texto «Exclusiva Black» |
| Con razón | Píldora amarilla suave con punto, encima del comercio | Texto de la razón |
| Vence pronto | Píldora naranja suave con reloj: «Vence hoy», «Vence mañana» o «Vence en N días» | Icono y texto |
| Vencida en la visita | Píldora roja suave «Vencida»; foto en gris | Texto |
| Error al guardar | Mensaje rojo bajo la tarjeta | Texto con `role="alert"` |

«Vence pronto» aparece solo con 7 días o menos, desde la fecha civil de El Salvador (`textoVencePronto(promo, hoyEnElSalvador())`). Usa la fecha real de la vigencia, sin contador en vivo, para no crear urgencia falsa.

### Chips de filtro

`button.filter-chip` y `button.today-filter` con `aria-pressed`. Miden 48 px de alto y tienen forma de píldora. Marcado: fondo de acción, borde oscuro y ✓ (el ✓ no se lee: `content: "✓" / ""`). Deshabilitado: opacidad 0.55. Los filtros de consulta no cambian las preferencias guardadas.

### Estado vacío o de error

```html
<section class="pr-estado">
  <p id="list-status" class="note" role="status"></p>
  <button class="secondary" hidden>Reintentar</button>
  <div class="empty-actions">…salidas del vacío…</div>
</section>
```

- **Visibilidad:** se oculta solo mientras su `[role="status"]` está vacío, sin JavaScript adicional.
- **Vacío:** círculo amarillo suave con lupa, el mensaje y las salidas (limpiar búsqueda, ver todas, quitar Disponibles hoy, cambiar preferencias).
- **Error:** si el mensaje lleva la clase `error`, el círculo pasa a rojo suave con un triángulo de alerta y se muestra Reintentar.
- **Distinguir los vacíos:** cada motivo de vacío lleva su propio texto (CDA 9 de H22); el componente solo los presenta.

### Hoja inferior

```html
<dialog class="pr-hoja" aria-labelledby="titulo">
  <div class="pr-hoja__asa" aria-hidden="true"></div>
  <h2 id="titulo" class="pr-hoja__titulo">…</h2>
  <div class="pr-hoja__cuerpo">…</div>
  <div class="pr-hoja__acciones"><button>…</button></div>
</dialog>
```

- **Apertura:** con `showModal()`. El `<dialog>` nativo atrapa el foco, cierra con Esc y lo devuelve al control que lo abrió.
- **Medidas y movimiento:** altura máxima del 85 % de la pantalla, cuerpo con scroll propio y entrada desde abajo en 320 ms (sin movimiento si se pide reducirlo).
- **Variantes:** `.pr-hoja--sin-velo` deja ver la lista sin oscurecerla, como pide ADR-010 para la encuesta. La hoja actual de H21 puede migrar a este componente cuando se integre.

### Aviso con deshacer

```html
<div id="pr-aviso" class="pr-aviso" role="status" hidden>
  <p class="pr-aviso__texto"></p><button type="button" class="pr-aviso__accion">Deshacer</button>
</div>
```

```js
const aviso = crearAviso(document.querySelector('#pr-aviso'));
aviso.mostrar({ texto: 'Promoción guardada.', alDeshacer: () => … });
```

- **Comportamiento:**
  - un solo aviso a la vez: uno nuevo reemplaza al anterior, y el Deshacer anterior deja de estar disponible;
  - se retira a los 6 s;
  - el tiempo se detiene mientras el foco o el puntero están dentro (WCAG 2.2.1);
  - Deshacer se ejecuta una sola vez;
  - sin `alDeshacer`, el botón no aparece.
- **Uso actual:** Para ti lo usa al guardar o quitar. Deshacer revierte la operación y devuelve el foco al botón de la tarjeta; deshacer no abre otro aviso. H23 lo reutiliza para los rechazos.
- **Apariencia:** fondo oscuro, texto blanco y Deshacer amarillo (11:1), fijo abajo, con área táctil de 48 px.

## Accesibilidad

- Contraste AA en todos los textos: el gris más claro, `--pr-texto-3`, tiene 5.3:1 sobre blanco.
- Objetivos táctiles de 48 px en chips, Guardar, acciones del estado vacío, hoja y aviso. En el resto de la app, la guía mantiene ~44 px.
- Foco visible: el contorno global de 3 px, y en el aviso amarillo sobre oscuro.
- Ningún estado depende solo del color (ver la tabla de la tarjeta).
- Movimiento reducido: todas las duraciones del sistema valen 0.
- Comprobado a 320 y 390 px de ancho sin desplazamiento horizontal.

## Para el tramo siguiente

- **Integrar con el motor (SCRUM-133):** su rama ya escribe `.promo-reason`, `.promo-badges` y `.promo-expired`. Al integrarla, esos elementos van en la plantilla de arriba y ya tienen estilo aquí.
- **Guardadas:** usa la misma tarjeta, pero todavía no marca `data-tarjeta` ni «Vence pronto».
- **Pendientes de los tramos siguientes:** selector de tarjeta, franja informativa, detalle y reloj, según la propuesta adjunta en SCRUM-116 (v4), una vez revisada por el PO.
