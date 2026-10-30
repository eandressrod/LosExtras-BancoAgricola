# Sprint Review · Sprint 3 «Filtros»

Registro reconstruido. Corte de lo presentado: 30 de octubre. El cierre posterior se registra en Dailys · Semana 4.

- **Fechas:**
  - Planificado: del 20 al 23 de octubre.
  - Cierre en Jira: pendiente al 30 de octubre.
  - Review: *viernes 30 de octubre, en persona, junto con la retro y la planning del Sprint 4*.
- **Objetivo del sprint:** motor de promociones beta, fases 1–2, con la encuesta de tres pasos (decisión del 19 de octubre). En Jira quedó el texto genérico «Meta y selección pendientes de Planning».
- **Asistentes:** *Ernesto (Scrum Master), David (PO), German (QA), Sara y Sam (Developers)*.
- **Producción:** https://project-ovx0k.vercel.app · referencia local de main al 30-oct: `66d74bf` (no se conserva el hash del despliegue mostrado).

## 1. Qué se terminó

| Historia / bug | Responsable | PR | Estado al review | Pendiente de la DoD |
|---|---|---|---|---|
| H22 · Ver primero las promociones que elegí (SCRUM-116): motor de Para ti, señales y API (SCRUM-128, 133), sistema visual (SCRUM-127) | Ernesto | #25, #29, #36, #41 | Implementado en main antes de la review | — Validación externa hecha (Victor López, ficha 1) |
| H21 · Intereses en 3 pasos (SCRUM-71): encuesta sin insistir (ADR-010), marcas por usuario, una pregunta por página | Ernesto | #26, #40 | Implementado en main antes de la review | — Validación externa hecha (Leandro Iraheta, ficha 2) |
| H8 · Mapa de promociones cercanas (SCRUM-11): Cerca de ti con MapLibre + OpenFreeMap (ADR-012), 31 sucursales verificadas contra OpenStreetMap | Ernesto | #37, #41 | Implementado en main antes de la review | — Probado en un iPhone 15 Pro Max en la re-verificación de la ficha 1; en el emulador no se dibujan las teselas |
| H25 · Ver primero lo que busco hoy (SCRUM-118): chips «Hoy busco» | German | #30 | Done (26-oct) | — |
| SCRUM-109 · Perfil muestra el tipo del perfil y no el de sus tarjetas | Sam | #34 | En revisión | — |
| SCRUM-110 · Guardar anidado dentro del enlace de la tarjeta | Sam | #33 | Fusionado el 28-oct | — |
| SCRUM-111 · Estado vacío de Guardadas culpa a la tarjeta | German | #32 | En revisión | — |
| SCRUM-113 y 114 · Categorías duplicadas y encuesta del perfil B en mock | Sara (con Ernesto) | #27 | Fusionados el 28-oct | — |
| Retiro de Midi (ADR-008) y registro de ADR 001–012 | Ernesto | #22, #24; #31 en revisión | — (técnico) | — |

## 2. Qué no se terminó y por qué

| Historia / bug | Responsable | Motivo | Qué pasa ahora |
|---|---|---|---|
| H23 · Corregir lo que me recomiendan y deshacer (SCRUM-117) | Sam | Decisión del 30-oct, al ver que el equipo iba atrasado con los 18 bugs de producción y los 38 «En revisión». Es una capacidad nueva y grande, tenía conflictos con main en 9 archivos y una migración sin aplicar, y del 2 al 5 de noviembre solo hay estabilización. | PR #35 cerrado sin fusionar; la rama se conserva; etiqueta `descartada-feria`, vuelve al backlog |
| H20 · Revisar mis intereses y deshacer cambios (SCRUM-70) | Sara | Misma decisión del 30-oct que H23: con el atraso en los bugs, se priorizó estabilizar. Es una capacidad nueva, no tenía avance en el código y del 2 al 5 de noviembre solo hay estabilización. | Etiqueta `descartada-feria`; backlog |
| H24 · Catálogo variado (SCRUM-115) | David | Se entregó la parte 1 (contratos y esqueleto, SCRUM-123, PR #21). Faltan la muestra, la carga por lotes, las imágenes y el validador. | Pasa al Sprint 4 |
| SCRUM-112 · La API acepta guardar una promoción que no aplica a ninguna tarjeta | German | PR #38 en revisión al 30-oct | Pasa al Sprint 4 |

## 3. Demo

Recorrido mostrado *(el mismo que se preparó)*:

1. Login con Luis Pérez (`h19.usuario.002`, 3 tarjetas) → menú → Promociones.
2. La encuesta se abre sola la primera vez; completar los 3 pasos.
3. Para ti: promociones de todas las tarjetas, con el motivo de cada una y con qué tarjeta aplica.
4. Chips «Hoy busco» y hoja Filtros (tarjeta, categoría, «Solo lo que aplica hoy»).
5. Pestañas Cerca de ti (mapa y distancia) y Explorar.
6. Detalle: días con reloj, «Cómo usarla», restricciones y mapa; Guardar y abrir Guardadas.

## 4. Decisiones y cambios al backlog

| Fecha | Decisión | Dónde quedó registrada |
|---|---|---|
| 19-oct | El sprint se enfoca en el motor beta (fases 1–2 y encuesta de 3 pasos). Solo se guardan señales declaradas, nunca analítica. Se descartan H9, H12, H14, H15 y H18; se asignan responsables | Jira (etiqueta `descartada-motor-beta`) |
| 19-oct | El catálogo ficticio solo se amplía mediante H24 | SCRUM-115 |
| 20-oct | Catálogo con marcas reales de El Salvador y ofertas ficticias; no hace falta verificar licencias de imágenes. Las imágenes van en `public/recursos` | Comentario de SCRUM-123 |
| 20-oct | El equipo decide lo técnico dentro del alcance y registra las decisiones importantes como ADR | `ADR/` |
| 20–22-oct | Validación externa de Para ti y de la encuesta; sus observaciones motivan los dos rediseños | Fichas de validación externa 1 y 2 |
| 22-oct | Retirar Midi y administrar los datos desde Supabase; aceptar deuda técnica hasta la feria; taller de deuda (SCRUM-129 a 132) | ADR-007, ADR-008 |
| 23-oct | Ofrecer la encuesta sin insistir: se abre sola una vez, después solo un aviso discreto | ADR-010 |
| 23-oct | Rehacer el sistema visual de Promociones desde cero (PR #28 cerrado) | ADR-011 |
| 24-oct | Para ti con todas las tarjetas; la tarjeta pasa a ser un filtro | SCRUM-116, comentario 10031 |
| 24-oct | «Disponibles hoy» pasa a la hoja Filtros | SCRUM-67, comentario 10033 |
| 24-oct | Área táctil mínima de 44 × 44 px (CDA 11) | Comentario 10034 |
| 24-oct | H8: secciones Para ti / Cerca de ti, primero por zona, con el GPS reservado; Waze lleva solo el destino | SCRUM-11, comentario 10032 |
| 24-oct | H25: chips como tira ligera en la cabecera | SCRUM-118, comentario 10035 |
| 24-oct | H26 descartada por redundante; se crea H29 (Explorar con ♥, SCRUM-134) | SCRUM-119, comentario 10036 |
| 25-oct | La pantalla pasa a llamarse Promociones, con pestañas Para ti · Cerca de ti · Explorar; días con reloj; «Cómo usarla» en el detalle | SCRUM-127 |
| 26-oct | Orden de Cerca de ti: distancia e interés con el mismo peso | SCRUM-11 |
| 26-oct | «Listo» de la encuesta exige al menos una categoría; el paso 3 va en una página por pregunta | SCRUM-71 |
| 30-oct | H23 y H20 fuera de la feria, por el atraso con los bugs | PR #35 · etiqueta `descartada-feria` |

## 5. Comentarios de los interesados

**Validación externa:**
- **Victor López (Para ti):** antes del rediseño, le pareció rebuscado encontrar una promoción cercana, otras promociones y dónde cambiar sus intereses.
- **Leandro Iraheta (encuesta):** antes del rediseño, le pareció fea y con mucho texto; pidió algo más visual.
- **Re-verificación:** los dos dijeron que todo estaba muy genial, que había cambiado muchísimo y que se veía muy bonito.

**En la reunión:** los comentarios se dieron en persona y no se anotaron.

## 6. Próximos pasos

Sprint 4 «Estabilización»:
- arreglar los PR revisados (#31, #32, #34 y #38);
- verificar los 38 bugs «En revisión»;
- hacer el taller de deuda técnica (SCRUM-129 a 132);
- continuar H24.
