# Dailys · Sprints 1 a 4

Corte: 2 de noviembre de 2026.

## Cómo se hicieron y cómo se reconstruyeron

- **Las dailys eran presenciales, los miércoles y viernes**, los días en que el equipo coincidía. Los demás días no había daily; ese trabajo se cuenta en la siguiente.
- **Muchas ceremonias y acuerdos se dieron en clase y en persona, y no se anotaban.** Este registro se reconstruyó después, con:
  - los commits y PR de GitHub;
  - los cambios de Jira;
  - las decisiones registradas en Jira y en los ADR.
- **Hecho** sale de los commits y PR desde la daily anterior. **Sigue** sale del trabajo siguiente o del reparto acordado.
- **Inferencias:** lo escrito en *cursiva* no dejó commit ese día. Se infiere de la historia asignada a la persona y de lo que entregó después.

---

## Formato

```markdown
## Daily · día DD-mes · Sprint N

| Persona | Hecho desde la última daily | Sigue | Bloqueos |
|---|---|---|---|
| Ernesto | | | |
| David | | | |
| German | | | |
| Sara | | | |
| Sam | | | |

**Decisiones / avisos:**
```

---

# Sprint 1 «Perfiles y promos» · 7 – 9 de octubre

Antes de este sprint, el Sprint 0 solo preparó el repositorio y el despliegue (H0), bajo una épica general. El 1 de octubre se crearon las historias H1 a H7.

## Resumen por persona

| Persona | Historias trabajadas | PR |
|---|---|---|
| Ernesto | Supabase, pruebas y guía; revisión de H1, H2 y H3; H4 con el detalle de H7; CI | #5, #6 |
| David | H1 · Login con perfiles de prueba | #1, #2 |
| German | H3 · Categorías de interés en el primer acceso | #4 |
| Sara | H7 · Detalle básico (implementado dentro de #5) | — |
| Sam | H2 · Menú, cuentas y acceso a Promociones | #3 |

## Planning y daily · miércoles 7-oct · día 1 de 3

| Persona | Hecho | Sigue | Bloqueos |
|---|---|---|---|
| Ernesto | Esqueleto del proyecto (1-oct) y preparación del ambiente | Supabase, pruebas TDD y guía de desarrollo | — |
| David | *Revisa H1 y sus criterios* | H1: pruebas en rojo del login | — |
| German | *Revisa H3 y sus criterios* | H3: preferencias | Depende del login (H1) |
| Sara | *Revisa H7 y sus criterios* | H7: detalle | Depende del listado (H4) |
| Sam | *Revisa H2 y sus criterios* | H2: menú y cuentas | Depende del login (H1) |

**Decisiones:**
- Login y sesión validados por backend, con catálogo y perfiles en Supabase (ADR-003).
- El backlog se reorganiza en épicas por paso del flujo.

## Daily · viernes 9-oct · día 3 de 3 (fin planificado)

Ese día también se hicieron la review y la retro del Sprint 1, en clase.

| Persona | Hecho desde el miércoles | Sigue | Bloqueos |
|---|---|---|---|
| Ernesto | 8-oct: Supabase, pruebas TDD y guía. 9-oct: revisa H1 y H2 (revocar la sesión, encuesta por propietario), alinea las migraciones y corrige H3 tras la revisión. Fusiona #3 y #4 | H4 y H7 | — |
| David | H1: pruebas en rojo, backend de acceso con perfiles A y B, login con la estructura de la app del banco y usuario demo. PR #1 y #2 fusionados | — | — |
| German | H3: pruebas y backend de preferencias en Supabase, ligadas al usuario; revisión con mock y pruebas de integración. PR #4 fusionado | — | — |
| Sara | *Prepara el detalle de H7* | H7 | Depende de H4 |
| Sam | H2: menú de cuentas, redirección a Promociones, integración con Supabase y pruebas en verde. PR #3 fusionado | — | — |

## Después de la última daily · sábado 10 – lunes 12-oct

| Persona | Hecho |
|---|---|
| Ernesto | 10-oct: promociones por tarjeta y preferencias (H4) con el detalle básico (H7), PR #5. 12-oct: CI de pruebas unitarias y de integración (PR #6) |

**Jira:** H4 y H7 pasan a Done el 10-oct y el Sprint 1 se cierra el 12-oct.

---

# Sprint 2 «Preferencias» · 13 – 16 de octubre

## Resumen por persona

| Persona | Historias trabajadas | PR |
|---|---|---|
| Ernesto | H19 (menú en celular), H13 (PWA), respaldo de la base, e2e, SCRUM-72 y 73, Midi | #7, #8, #9, #12, #15–#19 |
| David | H5 (filtro por categoría) y H16 (tarjetas propias) | #10, #11 |
| German | H10 (búsqueda por comercio) | #20 |
| Sara | H11 (Guardadas) | #14 |
| Sam | H17 (Disponibles hoy) | #13 |

## Planning · martes 13-oct

- No era día de daily.
- Se asignan H5, H10, H11, H13, H16, H17 y H19, una o dos por persona.
- En Jira queda el objetivo genérico.

## Daily · miércoles 14-oct · día 2 de 4

| Persona | Hecho desde la planning | Sigue | Bloqueos |
|---|---|---|---|
| Ernesto | Prueba del CI (#7); Midi para administrar datos (#8); guía de UI compartida (#9). Menú bancario, login de prueba y PWA | Integrar el menú (H19) y la PWA (H13) | — |
| David | H5: pruebas en rojo y filtro por categoría. H16: pruebas en rojo, tarjetas propias y selector en Para ti. PR #10 y #11 fusionados | — | — |
| German | *Prepara H10* | H10: búsqueda | — |
| Sara | *Prepara H11* | H11: Guardadas | — |
| Sam | *Prepara H17* | H17: «Disponibles hoy» | — |

## Daily · viernes 16-oct · día 4 de 4 (fin planificado)

Ese día también se hicieron la review y la retro del Sprint 2, en clase.

| Persona | Hecho desde el miércoles | Sigue | Bloqueos |
|---|---|---|---|
| Ernesto | 15-oct: integra el menú, la UI y la PWA (#12, H19 y H13); agrupa rutas para Vercel Hobby. 16-oct: respaldo y regreso de la base (#15, #16), e2e del camino principal (#17), SCRUM-72 y 73 (#18, #19). Fusiona #13 y #14 | Revisar H10 | El rollback local se canceló; se conservan H17 y los arreglos |
| David | *Revisión de PR* | — | — |
| German | H10: búsqueda en Para ti y Guardadas y revisión con aislamiento de sesión y debounce | Merge de #20 | — |
| Sara | H11: guardar promociones, Guardadas con la tarjeta elegida y retorno. PR #14 fusionado | — | — |
| Sam | H17: filtro «Disponibles hoy» en Para ti. PR #13 fusionado (15-oct) | — | — |

**Decisiones:**
- Se cancela el rollback.
- Para cerrar las ramas se difieren la validación externa y la revisión por otra persona.

## Después de la última daily · sábado 17 – lunes 19-oct

| Persona | Hecho |
|---|---|
| Ernesto | 17-oct: distingue la búsqueda sin coincidencias en Guardadas. 18-oct: fusiona #20 (H10) |

**Jira:** H10 pasa a Done el 18-oct y el Sprint 2 se cierra el 19-oct.

---

# Sprint 3 «Filtros» · 20 de octubre – 1 de noviembre

## Resumen por persona

| Persona | Historias y bugs trabajados | PR | Bloqueos que se repitieron |
|---|---|---|---|
| Ernesto | H22 (motor, señales, API, sistema visual), H21 (encuesta), H8 (mapa), retiro de Midi, ADR 001–012 | #22–#26, #29, #31, #36, #37, #40, #41 | Emulador sin teselas del mapa; conflictos al integrar |
| David | H24 entrega 1 (contratos y esqueleto del catálogo) | #21 | — |
| German | H25 (Hoy busco), SCRUM-111 y 112 (Guardadas) | #30, #32, #38 | Conflictos con main en #32 |
| Sara | SCRUM-113 y 114 (categorías duplicadas, encuesta del perfil B) | #27 | — |
| Sam | H23 (corregir y deshacer), SCRUM-109 y 110 | #33, #34, #35 | #34 y #35 con conflictos tras los merges del 26–27 oct |

## Planning · lunes 19-oct

- El arquitecto enfoca el sprint en el motor beta: fases 1–2 y encuesta de 3 pasos.
- El arquitecto asigna responsables y el Sprint 3 en Jira.
- Se descartan H9, H12, H14, H15 y H18.
- El catálogo solo se amplía mediante H24.

## Daily · miércoles 21-oct · día 2 de 4

| Persona | Hecho desde el inicio (20-oct) | Sigue | Bloqueos |
|---|---|---|---|
| Ernesto | Registro de decisiones en `ADR/` (ADR-001 a 003, fuente única del catálogo); fusiona #21, #22 y #23 | Motor de H22 y retiro de Midi | — |
| David | H24 entrega 1: pruebas en rojo del contrato, esquema de la fuente única, validador, generador, migración y esqueleto del catálogo. PR #21 fusionado (SCRUM-123) | Entregas 2 y 3 de H24 | — |
| German | *Prepara H25 «Hoy busco»* | Pruebas en rojo de H25 | — |
| Sara | *Analiza las categorías repetidas y la encuesta del perfil B (SCRUM-113 y 114)* | Arreglo en mock | — |
| Sam | *Arranca H23 (corregir y deshacer) y los bugs SCRUM-109 y 110* | H23 | — |

**Decisiones (20-oct):**
- El catálogo usa marcas reales de El Salvador con ofertas ficticias, sin verificar licencias de imágenes.
- El equipo decide lo técnico y lo registra en ADR.

**Avisos:** entre el 20 y el 22 de octubre se hace la validación externa:
- Victor López revisa Para ti.
- Leandro Iraheta revisa la encuesta.

Sus observaciones están en las fichas de validación externa 1 y 2.

## Daily · viernes 23-oct · día 4 de 4 (fin planificado)

| Persona | Hecho desde el miércoles | Sigue | Bloqueos |
|---|---|---|---|
| Ernesto | 22-oct: retira Midi (ADR-008); ADR-007 (deuda hasta la feria); taller de deuda técnica (crea SCRUM-129 a 132); H22: motor fases 1–2, `/api/para-ti`, `/api/senales`, ADR-009. 23-oct: H21, reglas de la encuesta en 3 pasos y hoja sobre Para ti; ADR-010; sistema visual (SCRUM-127) y ADR-011 | Sistema visual v3 | La v1 del sistema visual (PR #28) se rechaza y se cierra |
| David | *Prepara la entrega 2 de H24 (muestra de Restaurantes)* | H24 entrega 2 | — |
| German | H25: pruebas unitarias y de integración en rojo | Implementar «Hoy busco» | — |
| Sara | Corrige las categorías repetidas y la encuesta del perfil B en mock (SCRUM-113 y 114) | PR #27 | — |
| Sam | *Avanza H23 y SCRUM-109 y 110* | Abrir los PR | — |

**Decisiones:**
- A partir de la validación externa, se rediseñan Para ti y la encuesta.
- La encuesta se ofrece sin insistir (ADR-010).
- El sprint no se cierra: sigue abierto.

## Daily · miércoles 28-oct · Sprint 3 extendido (Sprint 4 empezó el lunes 26 en Jira)

| Persona | Hecho desde el viernes | Sigue | Bloqueos |
|---|---|---|---|
| Ernesto | **24-oct:** sistema visual v3, hoja Filtros, carrusel de avisos; Para ti con todas las tarjetas (SCRUM-133); fusiona #24 y #25. **25-oct:** pestañas Para ti · Cerca de ti · Explorar; días con reloj; «Cómo usarla»; H8: Cerca de ti con mapa y coordenadas verificadas contra OpenStreetMap; fusiona #29 y #30. **26-oct:** marcas de la encuesta por usuario; paso 3 en una página por pregunta; mejoras de carga; fusiona #36, #37 y #26. **27-oct:** fusiona #40 (H21) y #41 (carga y bugs). **28-oct:** fusiona #27 y #33; comenta #31, #32, #34, #35 y #38 | Arreglar #31 | El emulador no dibuja las teselas del mapa |
| David | *Sigue con la entrega 2 de H24* | H24 entrega 2 | — |
| German | H25: «Hoy busco», reordenamiento y chips en Para ti (#30, fusionado el 25-oct). QA-AUD-03 y 04: pruebas en rojo y arreglos de Guardadas (SCRUM-111 y 112). Resuelve conflictos de #32 con main | Revisión de #32 y #38 | Conflictos de #32 con main |
| Sara | PR #27 fusionado (SCRUM-113 y 114) | *Revisión de PR asignados* | — |
| Sam | H23: corregir desde la tarjeta y deshacer; SCRUM-109 (tarjetas propias en Perfil); SCRUM-110 (#33, fusionado hoy) | #34 y #35 | #34 y #35 con conflictos con main tras los merges del 26–27 oct |

**Decisiones desde el viernes:**
- **24-oct:**
  - Tarjetas mezcladas.
  - «Disponibles hoy» pasa a Filtros.
  - Área táctil de 44 px.
  - H8 por zona, con Waze.
  - Los chips de H25 van como tira ligera.
  - H26 descartada; se crea H29 (SCRUM-134).
- **26-oct:**
  - Cerca de ti mezcla distancia e interés con el mismo peso.
  - «Listo» exige al menos una categoría.
  - El arquitecto reporta 5 bugs de Promociones, arreglados en #41.

## Daily · viernes 30-oct · cierre del Sprint 3 en persona

Ese día, en persona, también se hicieron la review y la retro del Sprint 3 y la planning del Sprint 4 (ver sus documentos).

| Persona | Hecho desde el miércoles | Sigue | Bloqueos |
|---|---|---|---|
| Ernesto | Prepara Jira para cerrar el Sprint 3; cierra #35 sin fusionar | Arreglar #31; bugs altos (135–137) | — |
| David | Comenta en #35 el descarte de H23 | Revisar #32, #34 y #38; H24 entrega 2 | — |
| German | Prueba producción en Android y reporta 18 bugs (SCRUM-135 a 152) | Arreglar #32 y #38; revisar #34 y #31 | — |
| Sara | *Revisión de PR asignados* | Bugs 138, 140 y 146; verificar bugs «En revisión» | — |
| Sam | *Atiende las revisiones de #34* | Bugs 139, 150 y 152; verificar bugs «En revisión» | #34 con conflictos |

**Decisiones:**
- 29-oct:
  - Se publica la rúbrica de la feria (3 o 5 de noviembre).
  - David comentará en los PR las decisiones tomadas por WhatsApp.
  - Se acuerda un plan de revisiones cruzadas.
- 30-oct:
  - H23 queda fuera de la feria.
  - El Sprint 4 pasa a llamarse «Estabilización».
  - Se reparten los bugs y las revisiones.

## Después de la última daily · sábado 31-oct – lunes 2-nov

No hubo daily: eran fin de semana y lunes. Se cuenta para que no se pierda.

| Persona | Hecho | Sigue |
|---|---|---|
| Ernesto | Registra los PR 36, 37, 40 y 41; encuentra el causante del bug de iPhone en el motor de Safari. Fusiona #31, #34 y #32. Arregla con TDD los bugs 135, 136, 137, 141, 142, 143, 144 y 148. Abre #50 a #57 | Merge cuando lleguen las aprobaciones |
| David | H24 entrega 2: muestra de Restaurantes con sucursales e imágenes, en TDD; transición de regreso; atiende la revisión de #43. Revisa #32, #34 y #38; comenta #31. Abre #58, #59 y #60 (bugs 145, 149 y 151) | Aprobación final de los PR de bugs |
| German | Guardadas: advertencia de exclusión mixta (#32) y distinción entre error de tarjeta y de existencia (403/404, #38), en TDD. Aprueba #34 y #31 | Revisar 135–138, 140 y 148; iPhone para #52 |
| Sara | Arregla con TDD los bugs 138, 140 y 146; comenta #43. Abre #47, #48 y #49 | Revisar 139, 141, 142 y 151 |
| Sam | SCRUM-109: describe varias tarjetas por sus tipos (#34). Arregla con TDD los bugs 139, 150 y 152. Abre #44, #45 y #46 | Revisar 143–145 y 149 |

**Jira:**
- **31-oct:** H8, H21 y H22 pasan a Done.
- **1-nov:**
  - SCRUM-109, 110, 111, 113 y 114 pasan a Done.
  - Se cierra el Sprint 3.
  - Decisión: solo se fusiona si el último mensaje del PR es la aprobación de David y no hay bugs abiertos.

---

# Sprint 4 «Estabilización» · 26 de octubre – 2 de noviembre

Se cruzó con el Sprint 3. Sus dailys son las del miércoles 28 y el viernes 30, y el tramo del 31-oct al 2-nov, ya contados arriba.

## Resumen por persona

| Persona | Historias y bugs trabajados | PR | Bloqueos que se repitieron |
|---|---|---|---|
| Ernesto | Arreglos de #31; bugs 135–137, 141–144 y 148; merges | #31, #50–#57 | SCRUM-147 sin PR |
| David | H24 entrega 2; bugs 145, 149 y 151; aprobación final de los PR | #43, #58–#60 | — |
| German | Arreglos de #32 y #38; prueba en producción con 18 bugs; revisión | #32, #38 | Falta un iPhone real para #52 |
| Sara | Bugs 138, 140 y 146; verificación de 11 bugs | #47–#49 | — |
| Sam | Arreglos de #34; bugs 139, 150 y 152; verificación de 10 bugs | #34, #44–#46 | — |

**Estado al cierre (2-nov):**
- 17 PR de bugs abiertos, ninguno fusionado.
- SCRUM-147 sin PR.
- Los 38 bugs viejos siguen «En revisión» en Jira.
- El taller de deuda (SCRUM-129 a 132) no empezó.
