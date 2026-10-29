# Validación externa 1 · Rediseño de Para ti → Promociones

> Registro de una validación externa (DoD, apartado 5) hecha sobre un **cambio importante**, no sobre una historia aislada. La encuesta la validó otra persona; su ficha es `validacion-externa-2-encuesta.md`.
> Las observaciones de la persona externa fueron el punto de partida del rediseño que se describe abajo.

## 1. Datos de la sesión

| Campo | Valor |
| --- | --- |
| Cambio validado | Rediseño de la pantalla Para ti, que pasó a llamarse **Promociones**, con secciones en pestañas: Para ti · Cerca de ti · Explorar |
| Historias relacionadas | H22 (SCRUM-116) y su sistema visual (SCRUM-127) · H8 Cerca de ti (SCRUM-11) · H16 tarjetas propias · H17 «Disponibles hoy» (SCRUM-67) · H29 Explorar (SCRUM-134) |
| Fecha de la validación | Sprint 3, entre el 20 y el 22 de octubre de 2026, unos días antes de planificar el rediseño visual (23-oct). La fecha exacta no quedó anotada. |
| Fecha de registro | 2 de noviembre de 2026 (se registra después de la sesión) |
| Persona externa | **Victor López** · no pertenece al equipo |
| Facilitador del equipo | Ernesto Rodríguez |
| Versión revisada | Para ti en main antes del motor beta: `c4f73ea` (21-oct), la última de main antes del 22-oct |
| Dispositivo | iPhone 15 Pro Max del facilitador · Safari |
| Perfil de prueba | Uno de los perfiles del selector de prueba del login |
| Medio | Presencial |

## 2. Qué se le mostró

La pantalla **Para ti** de esa versión:

- Título «Para ti», con la lista de promociones de **una sola tarjeta** a la vez, ordenada según las preferencias guardadas.
- Selector de tarjeta (con dos o más tarjetas), botón «Disponibles hoy» y una fila de chips de categoría, todos a la vista.
- Guardadas y Mis preferencias como enlaces de navegación.
- **No había sección Cerca de ti ni mapa**, y tampoco una forma directa de ver las promociones que quedaban fuera de las preferencias.

## 3. Tareas que se le pidieron

1. «Busca una promoción que esté cerca de ti.»
2. «Explora otras promociones que no te salen en la pantalla principal.»

Resultado: le costó completar las dos tareas. Para hacerlo había que combinar filtros, cambiar de tarjeta o ir a Mis preferencias, y abrir el detalle de cada promoción para ver dónde quedaba.

## 4. Observaciones de la persona externa

| ID | Observación | Tarea |
| --- | --- | --- |
| O-1 | Le pareció **rebuscado** encontrar una promoción cercana: no había un lugar pensado para eso. | 1 |
| O-2 | **No encontraba dónde ver otras promociones**, las que no salían en la pantalla principal. | 2 |
| O-3 | **No encontraba dónde cambiar sus intereses.** | 2 |

## 5. Decisiones tomadas

Las tomó el PO operativo entre el 23 y el 25 de octubre de 2026, y quedaron en Jira y en el ADR-011. Algunas responden a las observaciones; las demás salieron de la revisión del propio PO sobre el diseño.

| Decisión | Origen | Registro |
| --- | --- | --- |
| **Cerca de ti como sección propia**, con mapa, lista de lo más cercano y solo lo que se puede usar hoy | O-1 | SCRUM-11, comentario 10032 |
| **Explorar** como sección con todas las promociones vigentes, con lo de interés primero | O-2 | H29 (SCRUM-134) |
| Secciones en **pestañas deslizables, al estilo del timeline de X**: Para ti · Cerca de ti · Explorar | O-1 y O-2 | Commit `bad9f9c`, 25-oct |
| La pantalla pasa a llamarse **Promociones**; «Para ti» queda como su primera sección | O-1 y O-2 | Mismo cambio |
| Para ti muestra lo mejor de **todas** las tarjetas, y la tarjeta pasa a ser un filtro opcional | O-2 | SCRUM-116, comentario 10031 |
| Menos controles: tarjeta, categoría y «Disponibles hoy» se mueven a una hoja **Filtros** | O-2 | SCRUM-67, comentario 10033 |
| **Mis preferencias** como icono fijo de la cabecera y, dentro, «Personalizar en 3 pasos» para rehacer la encuesta | O-3 | ADR-011 (revisión v3) · ADR-010 |
| Rehacer el sistema visual desde cero (se cerró sin merge el PR 28); cabecera amarilla, fondo blanco y paleta de compras | Revisión del PO | ADR-011 |
| Se descarta la sección A domicilio (H26) por redundante | Revisión del PO | SCRUM-119, comentario 10036 |

## 6. Antes y después

| Aspecto | Antes | Después |
| --- | --- | --- |
| Nombre de la pantalla | Para ti | **Promociones** |
| Estructura | Una sola lista | Pestañas **Para ti · Cerca de ti · Explorar**, deslizables, como el timeline de X |
| Promociones cercanas | No había forma directa; había que revisar el detalle de cada una | **Cerca de ti**: mapa (MapLibre + OpenFreeMap), lo de 3 km o menos arriba y solo lo que se puede usar hoy |
| Promociones fuera de las preferencias | Había que cambiar filtros, tarjeta o preferencias | **Explorar**: todas las vigentes, con lo de interés primero |
| Tarjetas | Una a la vez, con selector visible | Todas mezcladas; cada promoción dice con cuál aplica («Aplica a tu tarjeta Black · También 15 % con tu Básica») |
| Filtros | Selector, «Disponibles hoy» y fila de chips, siempre visibles | Búsqueda + botón **Filtros**; los activos se ven como píldoras con × |
| Cabecera | Título y enlaces | Amarilla, con iconos de Guardadas (con contador) y Mis preferencias, y carrusel de avisos |
| Tarjeta de promoción | Datos en texto | Foto, beneficio en etiqueta de precio, color por categoría y días con reloj («Todos los miércoles») |
| Detalle | Beneficio y condiciones | «Cómo usarla» en pasos, restricciones, mapa con recorrido aproximado y «Abrir en Waze» |

## 7. Implementación

| Pieza | Rama / PR | Merge en main |
| --- | --- | --- |
| Sistema visual v2 | PR 29 | 25-oct-2026 |
| Para ti con todas las tarjetas (backend) | SCRUM-133 | Con la rama de SCRUM-127 |
| Pestañas, Explorar, días con reloj y «Cómo usarla» | `hu/SCRUM-127-promociones-ui` · PR 36 | 26-oct-2026 · `f8cdee1` |
| Cerca de ti con mapa y distancia | `hu/SCRUM-11-mapa-cerca` · PR 37 | 26-oct-2026 · `f53ca30` |
| Cerca de ti con lo de 3 km arriba y solo lo usable hoy | PR 41 | 27-oct-2026 · `fd4da7b` |

Documentación: ADR-011, ADR-012 (mapa) y `docs/SISTEMA_PROMOCIONES.md`.

## 8. Re-verificación con la persona externa

Se le mostró la versión rediseñada y se repitieron las dos tareas.

| Observación | ¿Resuelta? | Comentario |
| --- | --- | --- |
| O-1 | Sí | Encontró lo cercano directamente en Cerca de ti. |
| O-2 | Sí | Encontró las demás promociones en Explorar. |
| O-3 | Sí | Cambió sus intereses desde el icono de Mis preferencias. |

Comentario general: dijo que todo estaba **muy genial**, que había cambiado **muchísimo** y que se veía **muy bonito**.

- Fecha: después del 27 de octubre de 2026, con los PR 36, 37, 40 y 41 en main. La fecha exacta no quedó anotada.
- Versión: main `fd4da7b` o posterior, en el mismo iPhone.

## 9. Resultado

- [x] **Aprobado:** completa las tareas en la versión nueva y no quedan observaciones abiertas.

Conformidad de Victor López: comentó que todo estaba muy genial y se veía muy bonito.

---

**Constancia:** dejar esta ficha como comentario en SCRUM-127 y enlazarla desde SCRUM-11 y SCRUM-116.
