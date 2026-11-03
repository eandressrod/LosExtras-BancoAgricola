# Validación externa 2 · Rediseño de la encuesta de intereses

> Registro de una validación externa (DoD, apartado 5) hecha sobre un **cambio importante**, no sobre una historia aislada. La pantalla Para ti la validó otra persona; su ficha es `validacion-externa-1-promociones-para-ti.md`.
> Las observaciones de la persona externa fueron el punto de partida del rediseño que se describe abajo.

## 1. Datos de la sesión

| Campo | Valor |
| --- | --- |
| Cambio validado | Rediseño de la encuesta de intereses: de una página aparte con texto a una **hoja visual de 3 pasos dentro de Promociones** |
| Historias relacionadas | H21 (SCRUM-71) · H3 encuesta inicial · H22 sistema visual (SCRUM-127) |
| Fecha de la validación | Sprint 3, entre el 20 y el 22 de octubre de 2026, unos días antes de planificar el rediseño de la encuesta (23-oct). La fecha exacta no quedó anotada. |
| Fecha de registro | 2 de noviembre de 2026 (se registra después de la sesión) |
| Persona externa | **Leandro Iraheta** · no pertenece al equipo |
| Facilitador del equipo | Ernesto Rodríguez |
| Versión revisada | Encuesta en main antes de H21: `c4f73ea` (21-oct) |
| Dispositivos | iPhone 15 Pro Max del facilitador (Safari) y Samsung Galaxy Z Flip de Leandro (navegador del teléfono) |
| Perfil de prueba | Un perfil del selector de prueba con la encuesta pendiente |
| Medio | Presencial |

## 2. Qué se le mostró

La encuesta de esa versión:

- Página aparte, «Tus intereses», fuera de Promociones.
- Un párrafo de introducción («Antes de ver promociones por primera vez, cuéntanos qué te interesa») y una sola pregunta, «Elige una o varias categorías», con una lista de opciones de texto.
- Tres botones: «Guardar y ver promociones», «Omitir por ahora» y «Volver al menú».
- Mientras siguiera pendiente, volvía a aparecer al entrar a Promociones.

## 3. Observaciones de la persona externa

| ID | Observación |
| --- | --- |
| O-1 | Le pareció **muy fea**. |
| O-2 | Tenía **mucho texto**; prefería **algo más visual**. |

## 4. Decisiones tomadas

Las tomó el arquitecto entre el 23 y el 26 de octubre de 2026, y quedaron en Jira y en el ADR-010. Algunas responden a las observaciones; las demás salieron de la investigación de UX y de la revisión del arquitecto.

| Decisión | Origen | Registro |
| --- | --- | --- |
| Diseño visual con el sistema de Promociones: **mosaicos con icono** y color de su categoría marcados con ✓, segmentos «Paso n de 3», cuenta en vivo, una línea de ayuda por página y microanimaciones | O-1 y O-2 | Commit `0b0153c` · principios UX/UI P1–P14, SCRUM-71, comentario 10029 |
| **Menos texto en pantalla:** una pregunta por página, sin desplazamiento; el paso 3 se divide en una página por pregunta | O-2 | Commit `1ab281a`, 26-oct |
| La encuesta pasa a una **hoja inferior dentro de Promociones**; la página aparte redirige allí | O-1 | ADR-010 |
| Encuesta en **3 pasos** | Alcance de H21 | SCRUM-71 |
| **No insistir:** la hoja se abre sola solo la primera vez; después, un aviso discreto en la lista que desaparece al cerrarlo una vez | Investigación de UX | ADR-010 · CDA 8 de H21 |
| Siempre disponible desde Mis preferencias («Personalizar en 3 pasos») | Investigación de UX | ADR-010 |
| Las marcas «hoja mostrada» y «aviso cerrado» se guardan por usuario en el servidor | Alcance de H21, parte 2 | ADR-010 |

## 5. Antes y después

| Aspecto | Antes | Después |
| --- | --- | --- |
| Aspecto general | Formulario de texto | **Mosaicos con icono y color**, ✓ al marcar, transiciones breves |
| Cantidad de texto | Párrafo de introducción, pregunta y tres botones | Una pregunta corta y una línea de ayuda por página |
| Dónde aparece | Página aparte, «Tus intereses» | **Hoja inferior dentro de Promociones** |
| Contenido | Una pregunta: categorías | **3 pasos**; el 3.º, una página por pregunta |
| Progreso | Sin indicador | Segmentos «Paso n de 3» y cuenta en vivo de las promociones de la lista |
| Cuándo aparece | Al entrar, mientras siguiera pendiente | **Solo la primera vez**; luego un aviso discreto que se va al cerrarlo una vez |
| Acceso posterior | Volver a la página | «Personalizar en 3 pasos» en Mis preferencias |
| Tamaño | Página con desplazamiento | Las páginas caben en 640 dp de alto |

## 6. Implementación

| Pieza | Rama / PR | Merge en main |
| --- | --- | --- |
| Partes 1 y 2: hoja, señales y marcas del servidor | `hu/SCRUM-71-encuesta` · PR 26 | 26-oct-2026 · `6b60e2d` |
| Frontend de la parte 2: diseño visual, no insistir y Mis preferencias | `hu/SCRUM-71-encuesta-frontend` · PR 40 | 27-oct-2026 · `8269601` |

Documentación: ADR-010 y sección 12 de `docs/GUIA_DESARROLLO.md`.

## 7. Re-verificación con la persona externa

Se le mostró la encuesta rediseñada en los mismos dos teléfonos.

| Observación | ¿Resuelta? | Comentario |
| --- | --- | --- |
| O-1 | Sí | La vio muy bonita. |
| O-2 | Sí | Le resultó más visual, con menos texto. |

Comentario general: dijo que todo estaba **muy genial**, que había cambiado **muchísimo** y que se veía **muy bonito**.

- Fecha: después del 27 de octubre de 2026, con el PR 40 en main. La fecha exacta no quedó anotada.
- Versión: main `8269601` o posterior.

## 8. Resultado

- [x] **Aprobado:** la encuesta nueva responde a las observaciones y no quedan observaciones abiertas.

Conformidad de Leandro Iraheta: comentó que todo estaba muy genial y se veía muy bonito.

---

**Constancia:** dejar esta ficha como comentario en SCRUM-71.
