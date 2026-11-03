# Sprint Review · Los Extras

Fuentes:
- Jira (proyecto SCRUM);
- GitHub (`eandressrod/LosExtras-BancoAgricola`);
- los ADR del repositorio;
- las decisiones del PO registradas en comentarios de Jira;
- las fichas de validación externa.

Corte de datos: 2 de noviembre de 2026.

**Las reviews se hicieron en clase y en persona, y no se anotaban.** Este documento se reconstruyó después con lo entregado y lo decidido. Los campos sin registro se completaron por lógica (fecha, asistentes y recorrido) y están marcados con *cursiva*.

---

## Formato

```markdown
# Sprint Review · Sprint N «Nombre»

- **Fechas:** inicio – fin (planificado) · cierre real en Jira
- **Objetivo del sprint:**
- **Asistentes:**
- **Producción:** URL · commit de main

## 1. Qué se terminó
| Historia / bug | Responsable | PR | Estado en Jira | Pendiente de la DoD |
|---|---|---|---|---|

## 2. Qué no se terminó y por qué
| Historia / bug | Responsable | Motivo | Qué pasa ahora |
|---|---|---|---|

## 3. Demo (recorrido mostrado)
1. Login con el perfil … → menú → …

## 4. Decisiones del PO y cambios al backlog
| Fecha | Decisión | Dónde quedó registrada |
|---|---|---|

## 5. Comentarios de los interesados

## 6. Próximos pasos
```

---

# Sprint 1 «Perfiles y promos»

- **Fechas:**
  - En Jira: del 7 al 9 de octubre.
  - Cierre en Jira: 12 de octubre.
  - Review: *viernes 9 de octubre, en clase*.
- **Objetivo del sprint:** que los usuarios de prueba A (Básica) y B (Black) entren por login y menú, y consulten las ofertas y condiciones de su tarjeta y sus intereses. Historias: H1, H2, H3, H4 y H7. Está escrito en Jira.
- **Asistentes:** *Ernesto (Scrum Master), David (PO), German (QA), Sara y Sam (Developers)*.
- **Producción:** Vercel, con el primer despliegue del Sprint 0 (H0).

## 1. Qué se terminó

| Historia | Responsable | PR | Estado en Jira |
|---|---|---|---|
| H1 · Iniciar sesión con credenciales verificadas y cargar mi perfil (SCRUM-2) | David | #1, #2 | Done (9-oct) |
| H2 · Consultar mi menú, cuentas ficticias y acceso a Promociones (SCRUM-3) | Sam | #3 | Done (9-oct) |
| H3 · Registrar categorías de interés en el primer acceso (SCRUM-6) | German | #4 | Done (9-oct) |
| H4 · Consultar promociones aplicables a mi tarjeta y categorías (SCRUM-7) | Ernesto | #5 | Done (10-oct) |
| H7 · Consultar el detalle básico de una promoción (SCRUM-8) | Sara | #5 (junto con H4) | Done (10-oct) |

## 2. Lo que la review dejó en evidencia

**El error de arranque:** hasta el Sprint 0 se trabajó **una sola historia (H0)** y **una sola épica general** (SCRUM-5, «Promociones Banco Agrícola — simulación, alcance y DoD»). Esa épica mezclaba alcance, DoD y producto. No se entendían las épicas como grupos de historias de una misma capacidad.

**Corrección**, aplicada entre el 1 y el 9 de octubre:
- **Historias pequeñas y repartidas:** el producto se partió en historias H1–H7 (creadas el 1-oct), una por responsable, para que las cinco personas tuvieran entrega propia.
- **Épicas por paso del flujo:** el 7-oct se crearon las épicas de cada paso del recorrido: Paso 01 Login, 02 Menú, 03 Encuesta, 04 Para ti, 05 Detalle, 06 Editar preferencias y 07 Cerca de ti. Cada historia cuelga de su paso.
- **SCRUM-5** queda como épica general solo para el alcance, la DoD y lo excluido (F1 Analítica y F2 Ranking).

## 3. Demo

Recorrido mostrado *(lógico, según lo entregado)*: login con el perfil A → menú con sus cuentas → encuesta de intereses → promociones de su tarjeta → detalle. Después, lo mismo con el perfil B (Black).

## 4. Decisiones y cambios al backlog

| Fecha | Decisión | Dónde quedó registrada |
|---|---|---|
| 7-oct | Login y sesión validados por backend, con catálogo y perfiles en Supabase. Sustituye el alcance anterior, solo local y sin backend | ADR-003 |
| 7-oct | Backlog organizado por épicas de pasos del flujo | Épicas SCRUM-15 a 19, 24 y 25 |
| 8-oct | La DoD suma TDD: prueba primero, prueba de integración por endpoint y suite en verde | DoD del equipo |
| 8-oct | Nuevas historias candidatas para el Sprint 2: H14 a H18 | Jira |

## 5. Comentarios de los interesados

Se dieron en clase y no se anotaron. El cambio de épicas e historias responde a esa retroalimentación.

## 6. Próximos pasos

- Sprint 2: filtros y preferencias sobre Para ti.
- Integración continua de pruebas (PR #6, 12-oct).

---

# Sprint 2 «Preferencias»

- **Fechas:**
  - En Jira: del 13 al 16 de octubre.
  - Cierre en Jira: 19 de octubre.
  - Review: *viernes 16 de octubre, en clase*.
- **Objetivo del sprint:** en Jira quedó el texto genérico. Objetivo real, según lo trabajado: **encontrar promociones en Para ti con filtros, búsqueda, tarjeta elegida y guardadas, con el menú y la app instalable en el celular**.
- **Asistentes:** *Ernesto (Scrum Master), David (PO), German (QA), Sara y Sam (Developers)*.
- **Producción:** Vercel, main del 16 de octubre (H17 y fixes conservados tras cancelar el rollback).

## 1. Qué se terminó

| Historia | Responsable | PR | Estado en Jira |
|---|---|---|---|
| H5 · Filtrar temporalmente por categoría (SCRUM-10) | David | #10 | Done (16-oct) |
| H16 · Elegir una de mis tarjetas (SCRUM-66) | David | #11 | Done (16-oct) |
| H13 · Abrir la aplicación desde un icono en el celular (SCRUM-23) | Ernesto | #12 | Done (15-oct) |
| H19 · Mejorar el menú y el acceso a Promociones en celular (SCRUM-69) | Ernesto | #12 | Done (15-oct) |
| H17 · Encontrar promociones que puedo usar hoy (SCRUM-67) | Sam | #13 | Done (16-oct) |
| H11 · Guardar promociones (SCRUM-21) | Sara | #14 | Done (16-oct) |
| H10 · Buscar por nombre de comercio (SCRUM-20) | German | #20 | Done (18-oct) |

Además se entregaron:
- el respaldo y regreso de versiones de la base (PR #15 y #16, ADR-005);
- la prueba e2e del camino principal (PR #17);
- los arreglos de SCRUM-72 y 73 (PR #18).

## 2. Qué no se terminó y por qué

Las siete historias del sprint se terminaron. El 16-oct se canceló un rollback local y se conservaron H17 y los arreglos.

## 3. Demo

Recorrido mostrado *(lógico, según lo entregado)*: abrir la app desde el icono → login → menú → Para ti, con estos pasos:
- filtro por categoría;
- «Disponibles hoy»;
- cambio de tarjeta;
- búsqueda por comercio;
- guardar una promoción y abrir Guardadas.

## 4. Decisiones y cambios al backlog

| Fecha | Decisión | Dónde quedó registrada |
|---|---|---|
| 12-oct | Acuerdo operativo del equipo sobre roles y flujo de trabajo | Acuerdo del 12-oct |
| 13-oct | Midi como herramienta local para administrar datos (retirada después, el 22-oct) | PR #8 · ADR-008 |
| 16-oct | Se cancela el rollback y se conservan H17 y los arreglos. Para cerrar las ramas se difieren la validación externa y la revisión por otra persona | Acuerdo del 16-oct |
| 19-oct | El Sprint 3 se enfoca en el motor beta. Se descartan H9, H12, H14, H15 y H18 para concentrar la capacidad en él | Jira (etiqueta `descartada-motor-beta`) |

## 5. Comentarios de los interesados

Se dieron en clase y no se anotaron.

## 6. Próximos pasos

Sprint 3: motor de promociones beta (H21, H22 y H23), catálogo (H24), «Hoy busco» (H25) y mapa (H8).

---

# Sprint 3 «Filtros»

- **Fechas:**
  - Planificado: del 20 al 23 de octubre.
  - Cierre en Jira: 1 de noviembre.
  - Review: *viernes 30 de octubre, en persona, junto con la retro y la planning del Sprint 4*.
- **Objetivo del sprint:** motor de promociones beta, fases 1–2, con la encuesta de tres pasos (decisión del 19 de octubre). En Jira quedó el texto genérico «Meta y selección pendientes de Planning».
- **Asistentes:** *Ernesto (Scrum Master), David (PO), German (QA), Sara y Sam (Developers)*.
- **Producción:** https://project-ovx0k.vercel.app · main `152d9b0` (1 de noviembre).

## 1. Qué se terminó

| Historia / bug | Responsable | PR | Estado en Jira | Pendiente de la DoD |
|---|---|---|---|---|
| H22 · Ver primero las promociones que elegí (SCRUM-116): motor de Para ti, señales y API (SCRUM-128, 133), sistema visual (SCRUM-127) | Ernesto | #25, #29, #36, #41 | Done (31-oct) | — Validación externa hecha (Victor López, ficha 1) |
| H21 · Intereses en 3 pasos (SCRUM-71): encuesta sin insistir (ADR-010), marcas por usuario, una pregunta por página | Ernesto | #26, #40 | Done (31-oct) | — Validación externa hecha (Leandro Iraheta, ficha 2) |
| H8 · Mapa de promociones cercanas (SCRUM-11): Cerca de ti con MapLibre + OpenFreeMap (ADR-012), 31 sucursales verificadas contra OpenStreetMap | Ernesto | #37, #41 | Done (31-oct) | — Probado en un iPhone 15 Pro Max en la re-verificación de la ficha 1; en el emulador no se dibujan las teselas |
| H25 · Ver primero lo que busco hoy (SCRUM-118): chips «Hoy busco» | German | #30 | Done (26-oct) | — |
| SCRUM-109 · Perfil muestra el tipo del perfil y no el de sus tarjetas | Sam | #34 | Done (1-nov) | — |
| SCRUM-110 · Guardar anidado dentro del enlace de la tarjeta | Sam | #33 | Done (1-nov) | — |
| SCRUM-111 · Estado vacío de Guardadas culpa a la tarjeta | German | #32 | Done (1-nov) | — |
| SCRUM-113 y 114 · Categorías duplicadas y encuesta del perfil B en mock | Sara (con Ernesto) | #27 | Done (1-nov) | — |
| Retiro de Midi (ADR-008) y registro de ADR 001–012 | Ernesto | #22, #24, #31 | — (técnico) | — |

## 2. Qué no se terminó y por qué

| Historia / bug | Responsable | Motivo | Qué pasa ahora |
|---|---|---|---|
| H23 · Corregir lo que me recomiendan y deshacer (SCRUM-117) | Sam | Decisión del PO del 30-oct, al ver que el equipo iba atrasado con los 18 bugs de producción y los 38 «En revisión». Es una capacidad nueva y grande, tenía conflictos con main en 9 archivos y una migración sin aplicar, y del 2 al 5 de noviembre solo hay estabilización. | PR #35 cerrado sin fusionar; la rama se conserva; etiqueta `descartada-feria`, vuelve al backlog |
| H20 · Revisar mis intereses y deshacer cambios (SCRUM-70) | Sara | Misma decisión del 30-oct que H23: con el atraso en los bugs, se priorizó estabilizar. Es una capacidad nueva, no tenía avance en el código y del 2 al 5 de noviembre solo hay estabilización. | Etiqueta `descartada-feria`; backlog |
| H24 · Catálogo variado (SCRUM-115) | David | Se entregó la parte 1 (contratos y esqueleto, SCRUM-123, PR #21). Faltan la muestra, la carga por lotes, las imágenes y el validador. | Pasa al Sprint 4 |
| SCRUM-112 · La API acepta guardar una promoción que no aplica a ninguna tarjeta | German | PR #38 con cambios pedidos en la revisión del 31-oct | Pasa al Sprint 4 |

## 3. Demo

Recorrido mostrado *(el mismo que se preparó)*:

1. Login con Luis Pérez (`h19.usuario.002`, 3 tarjetas) → menú → Promociones.
2. La encuesta se abre sola la primera vez; completar los 3 pasos.
3. Para ti: promociones de todas las tarjetas, con el motivo de cada una y con qué tarjeta aplica.
4. Chips «Hoy busco» y hoja Filtros (tarjeta, categoría, «Solo lo que aplica hoy»).
5. Pestañas Cerca de ti (mapa y distancia) y Explorar.
6. Detalle: días con reloj, «Cómo usarla», restricciones y mapa; Guardar y abrir Guardadas.

## 4. Decisiones del PO y cambios al backlog

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

---

# Sprint 4 «Estabilización»

- **Fechas:**
  - En Jira: del 26 de octubre al 2 de noviembre.
  - El trabajo de estabilización empezó al cerrar el Sprint 3 (30-oct – 1-nov).
  - Review: *en el siguiente encuentro presencial, antes de la feria*.
- **Objetivo del sprint:** «Estabilizar para la Feria: taller de deuda técnica y bugs pendientes», acordado el 30-oct. En Jira sigue el texto genérico.
- **Asistentes:** *Ernesto (Scrum Master), David (PO), German (QA), Sara y Sam (Developers)*.
- **Producción:** https://project-ovx0k.vercel.app · main `152d9b0`.

## 1. Qué se terminó

| Trabajo | Responsable | PR | Estado | Pendiente |
|---|---|---|---|---|
| Arreglos pedidos en la revisión de #31, #32 y #34 | Ernesto, German y Sam | #31, #32, #34 | Fusionados el 1-nov | — |
| Bugs de producción del 30-oct, arreglados con TDD (prueba en rojo y luego en verde) | Ernesto (135–137, 141–144, 148), Sara (138, 140, 146), Sam (139, 150, 152), David (145, 149, 151) | #44 a #60 | 17 de 18 con PR abierto; ninguno fusionado | Revisión cruzada, aprobación final de David y merge |
| H24 · Entrega 2: muestra de Restaurantes con sucursales e imágenes (SCRUM-124) | David | #43 | PR abierto; revisión atendida el 31-oct | Aprobación y merge |

## 2. Qué no se terminó y por qué

| Trabajo | Responsable | Motivo | Qué pasa ahora |
|---|---|---|---|
| SCRUM-147 · La tarjeta de la cabecera cambia según la pantalla | Ernesto | Se priorizaron los bugs altos (135–137) y los que afectan el recorrido principal | Se arregla antes de la feria si queda tiempo; si no, vuelve al backlog |
| Verificación de los 38 bugs «En revisión» (SCRUM-74 a 108, 112) | Sara, Sam, German y David | Se verificaron en persona, pero el estado no se movió en Jira y no se anotó cuántos | Pasar a Done en Jira los que se confirmen |
| SCRUM-112 | German | PR #38 abierto | Aprobación de David y merge antes de la feria |
| Taller de deuda técnica (SCRUM-129 a 132) | Sin asignar | No se asignó en la planning; los bugs de producción tuvieron prioridad | Queda para después de la feria; el ADR-007 acepta esa deuda hasta entonces |
| SCRUM-135 en iPhone real | German | El arreglo está probado en WebKit de PC; falta el iPhone | Probar con la vista previa del PR #52 |

## 3. Demo

Recorrido mostrado *(el mismo que se preparó)*:

1. El recorrido del Sprint 3 con los perfiles del reporte de bugs: Ana López (`h19.usuario.001`) y Luis Pérez (`h19.usuario.002`).
2. Los bugs arreglados:
   - Atrás tras 20 s sin perder la sesión;
   - «Extender sesión» con la hoja Filtros abierta;
   - doble toque en Guardar;
   - mensaje propio sin conexión;
   - aviso cuando Para ti tarda.

## 4. Decisiones del PO y cambios al backlog

| Fecha | Decisión | Dónde quedó registrada |
|---|---|---|
| 30-oct | Sprint 4 pasa a llamarse «Estabilización»; entran los bugs 74–114 y las tareas del taller de deuda | Jira |
| 30-oct | Reparto de bugs y revisiones: nadie verifica ni aprueba lo que corrigió | `REPARTO_POR_PERSONA.md`, `SPRINT4_BUGS.md` |
| 30-oct | Un bug por rama y por PR, con TDD | `SPRINT4_BUGS.md` |
| 1-nov | Solo se fusiona si el último mensaje del PR es la aprobación de David y no hay bugs abiertos | Acuerdo del equipo en persona y por WhatsApp; se aplica en los PR #44 a #60 |
| 1-nov | El arreglo del aviso de sesión en iPhone (SCRUM-135) es obligatorio antes de la feria | PR #52 |

## 5. Comentarios de los interesados

Se dan en la review presencial y, como en las anteriores, no se anotaron.

## 6. Próximos pasos

- Fusionar los PR de bugs aprobados antes de la feria (3 o 5 de noviembre).
- Del 2 al 5 de noviembre, solo estabilización, sin capacidades nuevas.
