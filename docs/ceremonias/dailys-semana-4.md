# Dailys · Semana 4 · 26 de octubre – 2 de noviembre

Registro reconstruido con información hasta el 2 de noviembre.

**Sprint 3 «Filtros» · continuación**

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
  - El arquitecto general reporta 5 bugs de Promociones, arreglados en #41.

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
  - Se publica la rúbrica de la feria del 6 de noviembre.
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

**Sprint 4 «Estabilización» · 26 de octubre – 2 de noviembre**

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
