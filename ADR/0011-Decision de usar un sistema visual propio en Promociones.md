# ADR-011: Dar a Promociones una capa visual propia sobre la guía de UI

- Estado: propuesta. Primer tramo implementado en la rama `hu/SCRUM-127-sistema-visual`, pendiente de aprobación del PO y de PR.
- Fecha del registro: 23 de octubre de 2026.
- Fecha de la decisión: 23 de octubre de 2026. El PO operativo fijó el alcance de la subtarea; la forma técnica la propuso el desarrollador.
- Decide: equipo de desarrollo. La aprueba el PO (David) antes de que H20, H21, H23 y H25 la consuman.
- Clasificación: puerta de dos vías.

## Contexto

H22 (CDA 11, [SCRUM-127](https://somos-agilistas.atlassian.net/browse/SCRUM-127)) pide un diseño propio de la sección Promociones. Debe ser coherente con la marca, sin replicar la pantalla estándar del banco, y estar formado por componentes reutilizables y documentados con sus estados, para que otras cuatro historias no escriban estilos propios.

Hasta ahora los estilos de la tarjeta, los chips y los estados vivían en `promociones.css` y `guardadas.css`, con valores repetidos. Además:

- el botón Guardar estaba dentro del enlace de la tarjeta, que es HTML inválido ([SCRUM-110](https://somos-agilistas.atlassian.net/browse/SCRUM-110));
- la guía fija objetivos táctiles de ~44 px, y H22 exige 48 dp.

## Decisión

1. **Capa propia en un archivo aparte.** `public/css/promociones-sistema.css` define tokens `--pr-*`, derivados de los globales de `styles.css`, y los componentes de la sección. Se enlaza al final, en las páginas que muestran tarjetas.
2. **Conservar las clases existentes como interfaz de los componentes** (`promo-card`, `promo-benefit`, `guardar-promo`…), porque las usan las pruebas, el recorrido e2e y la rama del motor (SCRUM-133). Lo nuevo lleva el prefijo `pr-`.
3. **Tarjeta con forma de cupón.** Se compone de foto, cuerpo y talón. Las acciones van en el talón como hermanas del enlace, superpuestas con grid.
4. **Comportamiento mínimo en JavaScript.** Solo el aviso con deshacer tiene un módulo propio (`aviso-deshacer.js`). El estado vacío se muestra u oculta con CSS (`:has`), y la hoja inferior usa `<dialog>` nativo.
5. **Documentación única** en [docs/SISTEMA_PROMOCIONES.md](../docs/SISTEMA_PROMOCIONES.md), enlazada desde la guía de UI.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| Seguir ampliando `promociones.css` | Mezcla páginas, detalle y componentes; cada historia añadiría sus propios valores. |
| Renombrar todo a clases `pr-*` | Rompería pruebas, el e2e y la rama del motor sin cambiar lo que se ve. |
| Web Components o una biblioteca de UI | Contradice el stack acordado (ADR-002) y no aporta lo suficiente para seis componentes. |
| Conectar los tokens del kit (`tokens.json`) | La guía los trata como referencia estimada, no como paleta certificada. |

## Consecuencias

**Positivas**

- H20, H21, H23 y H25 tienen componentes con sus estados y no escriben estilos propios.
- La tarjeta del listado queda con HTML válido y anuncios separados para el enlace y el botón.
- Guardar y quitar se pueden deshacer.

**Negativas o pendientes**

- Al integrar la rama del motor habrá un conflicto pequeño en `promociones.html`, `promociones.css` y `promociones.js`: añadió líneas en el mismo bloque de la tarjeta. Sus clases ya tienen estilo en el sistema.
- `:has()` requiere Safari 15.4+ y Chrome 105+. En navegadores anteriores, el estado vacío se mostraría siempre, aunque sin texto.
- Selector de tarjeta, franja informativa, detalle y reloj quedan para los tramos siguientes.

## Reversibilidad

Es de dos vías: quitar el enlace al CSS del sistema y devolver las reglas a `promociones.css` revierte la apariencia sin tocar datos ni API.

## Evidencia y referencias

- H22 ([SCRUM-116](https://somos-agilistas.atlassian.net/browse/SCRUM-116)), CDA 11, y SCRUM-127.
- Propuesta de aportes al sistema visual, v4, adjunta en SCRUM-116.
- [Guía de UI](../docs/GUIA_UI_BANCOAGRICOLA.md).
- Pruebas: `tests/unit/aviso-deshacer.test.js`, `tests/unit/promocion-vista.test.js` y `tests/integration/sistema-promociones-frontend.test.js`.

Este registro documenta la decisión. No acredita la aprobación del PO, el merge ni la Definition of Done de H22.
