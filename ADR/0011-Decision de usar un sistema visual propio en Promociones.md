# ADR-011: Dar a Promociones un sistema visual propio, separado de las demás interfaces

- Estado: propuesta. Implementada en la rama `hu/SCRUM-127-promociones-ui`, pendiente de aprobación del PO (David) y de PR.
- Fecha del registro: 23 de octubre de 2026.
- Fecha de la decisión: 23 de octubre de 2026. El PO operativo rechazó el primer tramo (PR 28, cerrado sin merge) y pidió rehacerlo desde cero.
- Decide: PO operativo (alcance y dirección) y equipo de desarrollo (forma técnica).
- Clasificación: puerta de dos vías.

## Contexto

H22 (CDA 11, [SCRUM-127](https://somos-agilistas.atlassian.net/browse/SCRUM-127)) pide un diseño propio de la sección Promociones: armonioso, coherente con la marca, sin replicar la pantalla estándar del banco y sin aspecto genérico.

Un primer tramo aplicó las reglas generales de la guía de UI, con objetivos de 48 px y botones anchos. El PO lo rechazó: los botones eran demasiado grandes, las tarjetas se veían secas y faltaba el carrusel. Pidió:

- rehacer el sistema completo con las mejores técnicas;
- ignorar las reglas de tamaño de las demás interfaces;
- simplificar los controles;
- dar más contraste y detalle a las promociones.

Decidió además:

- cerrar el PR 28;
- trabajar sobre la rama del motor (PR 25), para que el diseño muestre la razón y el orden reales;
- incluir Para ti, Detalle, Guardadas y Mis preferencias;
- que el carrusel muestre avisos que no repiten tarjetas.

## Decisión

1. **Ámbito propio.** Las cuatro páginas llevan `body.pr`. Los tokens `--pr-*` y los componentes viven en `public/css/promociones-sistema.css` y no afectan al resto de la app. La composición de cada pantalla queda en `promociones.css`. Se elimina `guardadas.css`.
2. **Dirección visual.**
   - **Foto protagonista:** el beneficio va sobre la foto con un degradado.
   - **Cabecera según la tarjeta:** amarilla con Básica y negra con Black.
   - **Acentos por categoría:** sacados de la paleta de la marca.
   - **Exclusivas Black en oscuro.**
   - **Controles compactos:** chips de 36 px y Guardar redondo sobre la foto.
3. **Interfaz estable.** Se conservan las clases e ids que usan las pruebas, el e2e y el motor (`promo-card`, `promo-benefit`, `guardar-promo`, `#today-filter`…). Lo nuevo lleva el prefijo `pr-`.
4. **Lógica separada del dibujo.** `diapositivasFranja`, `crearReproductor`, `tiraDias` y `crearAviso` son funciones probadas con TDD. `montarCarrusel` y `mostrarDias` solo dibujan.
5. **Accesibilidad conservada aunque cambien los tamaños.**
   - Contraste AA.
   - Foco visible.
   - Estados que no dependen solo del color.
   - Pausa del carrusel (WCAG 2.2.2) y pausa del aviso (WCAG 2.2.1).
   - Movimiento reducido.
   - Área táctil ampliada por pseudoelemento en los iconos pequeños.

## Revisión del 24 de octubre de 2026 (versión 3)

Tras revisar la versión 2, el PO operativo decidió simplificar la pantalla:

- **Todas las tarjetas.** Para ti considera todas las tarjetas propias y la tarjeta pasa a ser un filtro (comentario 10031 en SCRUM-116; backend en SCRUM-133). Por eso la cabecera **deja de cambiar de color por tarjeta** y queda siempre amarilla.
- **Menos controles a la vista.** Tarjeta, categoría y «Solo lo que aplica hoy» se mueven a una hoja **Filtros**. Sobre la lista solo quedan las píldoras de los filtros activos. Guardadas y Mis preferencias pasan a iconos de la cabecera. La fila fija de chips y el selector de tarjetas visible se retiran.
- **Paleta.** Fondo blanco puro y acentos por categoría «de compras» (mandarina, sandía, uva, menta, agua y cielo). El beneficio va en una etiqueta de precio.
- **Secciones.** Para ti | Cerca de ti. El espacio queda listo y H8 muestra la segunda sección cuando exista.
- **Tamaño táctil.** El CDA 11 se ajustó a un área táctil efectiva de al menos 44 × 44 px (comentario 10034).

Los puntos 2 y 3 de la decisión original («cabecera según la tarjeta» y «chips de 36 px en una fila») quedan sustituidos por esta revisión.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| Ajustar el tramo del PR 28 | El PO pidió empezar de cero; el problema era de dirección, no de detalle. |
| Sistema global para toda la app | Cambiaría login, menú y encuesta, fuera del alcance de SCRUM-127. |
| Renombrar todas las clases a `pr-*` | Rompería pruebas, e2e y la rama del motor sin cambiar lo que se ve. |
| Biblioteca de carrusel o de componentes | Contradice el stack acordado (ADR-002); el carrusel cabe en unas 150 líneas probadas. |
| Carrusel de promociones destacadas | Repetiría las primeras tarjetas de la lista; el PO eligió avisos. |

## Consecuencias

**Positivas**

- La sección tiene identidad propia con fotos reales, color por tarjeta y por categoría.
- H20, H21, H23 y H25 tienen componentes documentados con sus estados.
- Guardar queda fuera del enlace (SCRUM-110) y se puede deshacer.

**Negativas o pendientes**

- **Rama dependiente:** depende del PR 25. Si este cambia, hay que integrar de nuevo.
- **Criterio de tamaño:** el CDA 11 de H22 dice «objetivos de 48 dp». Los controles visibles son más pequeños por decisión del PO y su área táctil se amplía con pseudoelementos donde es posible. Conviene que el PO ajuste el texto del CDA en Jira.
- **Navegadores:** `:has()`, `color-mix()` y `overflow-x: clip` requieren Safari 16+ y Chrome 105+.
- **Comprobaciones pendientes:** falta probar con lector de pantalla y en un iPhone físico.

## Reversibilidad

Es de dos vías: quitar `body.pr` y el CSS del sistema devuelve las pantallas a sus estilos generales, sin tocar datos ni API.

## Evidencia y referencias

- H22 ([SCRUM-116](https://somos-agilistas.atlassian.net/browse/SCRUM-116)), CDA 11 y SCRUM-127; propuesta v4 adjunta en SCRUM-116.
- [docs/SISTEMA_PROMOCIONES.md](../docs/SISTEMA_PROMOCIONES.md).
- Pruebas:
  - `tests/unit/franja.test.js`;
  - `tests/unit/carrusel.test.js`;
  - `tests/unit/aviso-deshacer.test.js`;
  - `tests/unit/promocion-vista.test.js`;
  - `tests/integration/sistema-promociones-frontend.test.js`.

Este registro documenta la decisión. No acredita la aprobación del PO, el merge ni la DoD de H22.
