# Sprint Retrospective · Los Extras

Fuentes:
- Jira;
- GitHub;
- los ADR;
- las fichas de validación externa;
- las decisiones del equipo hasta el 2 de noviembre de 2026.

**Las retros se hicieron en clase y en persona, y no se anotaban.** Este documento se reconstruyó después con lo que muestran los datos de cada sprint. Fecha, asistentes y responsables se completaron por lógica y están marcados con *cursiva*. Cada retro revisa las acciones de la anterior, para que se vea la evolución.

---

## Formato

```markdown
# Retrospective · Sprint N «Nombre»

- **Fecha:** · **Asistentes:** · **Facilita:** Scrum Master

## 0. Acciones de la retro anterior
| Acción | ¿Se cumplió? | Comentario |
|---|---|---|

## 1. Datos del sprint
- Comprometido: · Terminado: · Duración planificada / real:

## 2. Qué salió bien (seguir haciendo)
-

## 3. Qué no salió bien (dejar de hacer)
-

## 4. Qué aprendimos / qué probar (empezar a hacer)
-

## 5. Acciones (máximo 3)
| Acción | Responsable | Para cuándo |
|---|---|---|
```

---

# Sprint 1 «Perfiles y promos»

- **Fecha:** *viernes 9 de octubre, en clase, después de la review*
- **Asistentes:** *Ernesto, David, German, Sara y Sam*
- **Facilita:** Ernesto (Scrum Master)

## 0. Acciones de la retro anterior

Es la primera retro con historias: el Sprint 0 solo preparó el repositorio y el despliegue (H0).

## 1. Datos del sprint

- **Comprometido:** 5 historias (H1, H2, H3, H4 y H7).
- **Terminado:** las 5.
- **Duración:**
  - planificada, del 7 al 9 de octubre;
  - cerrado en Jira el 12 de octubre, 3 días después.

## 2. Qué salió bien

- Las cinco historias llegaron a main en tres días.
- Cada persona tuvo una historia propia: David H1, Sam H2, German H3, Ernesto H4 y Sara H7.
- Se empezó con TDD: hay commits de pruebas en rojo antes del código en H1 y en H3.
- El login y la sesión quedaron validados por backend, con Supabase.

## 3. Qué no salió bien

- **Arranque con una sola historia y una sola épica.** Hasta el Sprint 0 se trabajó solo H0 bajo una épica general (SCRUM-5) que mezclaba alcance, DoD y producto. No se entendía que una épica agrupa historias de una misma capacidad. Se corrigió a mitad de camino.
- **H7 se implementó dentro del PR de H4** (#5) y no por su responsable.
- **El objetivo del sprint** quedó como hipótesis, sin acordar la capacidad ni las tareas.
- **No había pruebas automáticas en cada PR.**

## 4. Qué aprendimos / qué probar

- Las épicas son los pasos del flujo y las historias son entregas pequeñas dentro de cada paso.
- Una historia por persona, con su propio PR.
- Ejecutar las pruebas en cada PR (CI).

## 5. Acciones

| Acción | Responsable | Para cuándo |
|---|---|---|
| Mantener una historia por persona con su propio PR | Todos | Sprint 2 |
| Agregar CI con pruebas unitarias y de integración | *Ernesto* | Antes del Sprint 2 |
| Escribir el objetivo del sprint en Jira durante la planning | *Ernesto* | Planning del Sprint 2 |

---

# Sprint 2 «Preferencias»

- **Fecha:** *viernes 16 de octubre, en clase, después de la review*
- **Asistentes:** *Ernesto, David, German, Sara y Sam*
- **Facilita:** Ernesto (Scrum Master)

## 0. Acciones de la retro anterior

| Acción | ¿Se cumplió? | Comentario |
|---|---|---|
| Una historia por persona con su propio PR | Sí | David (H5, H16), Sam (H17), Sara (H11), German (H10), Ernesto (H13, H19) |
| CI con pruebas | Sí | PR #6, 12 de octubre |
| Objetivo del sprint en Jira | No | Quedó el texto genérico «Meta y selección pendientes de Planning» |

## 1. Datos del sprint

- **Comprometido:** 7 historias (H5, H10, H11, H13, H16, H17 y H19).
- **Terminado:** las 7. H10 se cerró el 18 de octubre, dos días tarde.
- **Duración:**
  - planificada, del 13 al 16 de octubre;
  - cerrado en Jira el 19 de octubre.

## 2. Qué salió bien

- Siete historias terminadas, todas con un responsable distinto.
- TDD visible: pruebas en rojo antes del código en H5 y H16.
- Prueba e2e del camino principal (PR #17) y respaldo de versiones de la base (ADR-005).
- La app ya se instala en el celular (H13) y el menú se parece al del banco (H19).

## 3. Qué no salió bien

- **Integración el último día:** 22 commits en main solo el 16 de octubre. La confusión llevó a un rollback local que luego se canceló.
- **Para cerrar se difirieron dos condiciones de la DoD:** la validación externa y la revisión por otra persona.
- **Herramienta auxiliar de más:** Midi se agregó como herramienta local y después hubo que retirarla (ADR-008).
- **El objetivo del sprint siguió sin escribirse en Jira.**

## 4. Qué aprendimos / qué probar

- Fusionar seguido, en PR pequeños, y no dejar la integración para el último día.
- La validación externa no puede seguir aplazada: hay que hacerla con personas ajenas al equipo.

## 5. Acciones

| Acción | Responsable | Para cuándo |
|---|---|---|
| Hacer la validación externa con personas ajenas al equipo | *Ernesto* | Sprint 3 |
| Fusionar seguido, en PR pequeños | Todos | Sprint 3 |
| Escribir el objetivo del sprint en Jira | *Ernesto* | Planning del Sprint 3 |

---

# Sprint 3 «Filtros»

- **Fecha:** *viernes 30 de octubre, en persona, junto con la review y la planning del Sprint 4*
- **Asistentes:** *Ernesto, David, German, Sara y Sam*
- **Facilita:** Ernesto (Scrum Master)

## 0. Acciones de la retro anterior

| Acción | ¿Se cumplió? | Comentario |
|---|---|---|
| Validación externa con personas ajenas | Sí | Victor López (Para ti) y Leandro Iraheta (encuesta), del 20 al 22 de octubre; sus observaciones motivaron los dos rediseños |
| Fusionar seguido, en PR pequeños | No | Los merges grandes se juntaron el 26 y el 27 de octubre |
| Objetivo del sprint en Jira | No | Sigue el texto genérico |

## 1. Datos del sprint

- **Comprometido:** 7 historias (H8, H20, H21, H22, H23, H24 y H25) y 6 bugs de la auditoría de QA (SCRUM-109 a 114).
- **Terminado:** 4 historias (H8, H21, H22 y H25) y 5 bugs (109, 110, 111, 113 y 114).
- **No terminado:**
  - H23 y H20, descartadas para la feria;
  - H24 y SCRUM-112, que pasan al Sprint 4.
- **Duración:** planificado del 20 al 23 de octubre; se cerró en Jira el 1 de noviembre (9 días más).
- **Commits en main:** 87, de los cuales 72 son de una sola persona.
- **ADR registrados:** del 001 al 012.

## 2. Qué salió bien

- Las cuatro historias principales del motor beta (H21, H22, H25 y H8) llegaron a main y a producción.
- **La validación externa se hizo y cambió el producto:**
  - Para ti pasó a ser Promociones, con las secciones Cerca de ti y Explorar.
  - La encuesta pasó a ser visual, con menos texto.
  - En la re-verificación, las dos personas dijeron que todo se veía muy bien.
- TDD visible: commits de prueba en rojo antes del arreglo en H24, H25 y en los bugs de la auditoría.
- Las decisiones técnicas quedaron en ADR y las de producto en comentarios de Jira.
- El arquitecto decidió rápido sobre el alcance: tarjetas mezcladas, H26 descartada y «Disponibles hoy» a Filtros, todo el 24 de octubre.

## 3. Qué no salió bien

- **El sprint se alargó 9 días** y se cruzó con el Sprint 4.
- **Carga desigual:** 72 de 87 commits en main son de una persona.
- **Integración tardía:** los merges grandes del 26 y 27 de octubre dejaron con conflictos los PR #34 y #35.
- **El atraso con los bugs obligó a descartar trabajo:**
  - H23 se descartó después de trabajarla (PR #35, conflictos en 9 archivos y una migración sin aplicar);
  - H20 salió con ella.
- **La primera versión del sistema visual se rechazó** (PR #28) y hubo que rehacerla.
- **El mapa no se pudo probar en el emulador**, que no dibuja las teselas. Se vio funcionando en un iPhone durante la re-verificación externa.

## 4. Qué aprendimos / qué probar

- Fusionar seguido y en PR pequeños; esta acción sigue pendiente desde el Sprint 2.
- Acordar el alcance visual con una especificación antes de implementar.
- Probar en un teléfono real lo que el emulador no muestra.
- Medir el atraso a mitad del sprint para descartar a tiempo, no al final.

## 5. Acciones

| Acción | Responsable | Para cuándo |
|---|---|---|
| Escribir el objetivo del Sprint 4 en Jira | *Ernesto* | Planning del Sprint 4 (30-oct) |
| Un bug por rama y por PR, con revisión cruzada (nadie revisa lo suyo) | Todos | Sprint 4 |
| Repartir el taller de deuda técnica para que cada quien tenga trabajo propio en el código | *Equipo en la planning* | Planning del Sprint 4 (30-oct) |

---

# Sprint 4 «Estabilización»

- **Fecha:** *en el siguiente encuentro presencial después del cierre (2 de noviembre), antes de la feria*
- **Asistentes:** *Ernesto, David, German, Sara y Sam*
- **Facilita:** Ernesto (Scrum Master)

## 0. Acciones de la retro anterior

| Acción | ¿Se cumplió? | Comentario |
|---|---|---|
| Escribir el objetivo del sprint en Jira | No | Cambió el nombre del sprint, pero el objetivo sigue con el texto genérico. Lleva cuatro sprints sin cumplirse |
| Un bug por rama y por PR, con revisión cruzada | Sí | PR #44 a #60, uno por bug, cada uno con revisor asignado |
| Repartir el taller de deuda técnica | No | SCRUM-129 a 132 siguen en To Do y sin asignar; los bugs tuvieron prioridad |

## 1. Datos del sprint

- **Comprometido:**
  - arreglar los PR revisados (#31, #32, #34 y #38);
  - verificar los 38 bugs «En revisión»;
  - arreglar los 18 bugs de producción del 30-oct (SCRUM-135 a 152);
  - hacer el taller de deuda (SCRUM-129 a 132);
  - continuar H24.
- **Terminado al 2-nov:**
  - #31, #32 y #34 fusionados;
  - 17 de los 18 bugs con PR abierto, con prueba en rojo y luego en verde; ninguno fusionado todavía.
- **Pendiente:**
  - #38;
  - H24 (#43);
  - SCRUM-147 sin PR;
  - los 38 bugs siguen «En revisión» en Jira;
  - el taller de deuda sin empezar.
- **Participación en el código:** las cinco personas tienen commits propios: Ernesto (#50–#57), Sara (#47–#49), Sam (#44–#46), David (#43, #58–#60) y German (#38).

## 2. Qué salió bien

- QA probó producción en un teléfono real y encontró 18 bugs con pasos para reproducirlos, antes de la feria.
- El causante del bug de iPhone (SCRUM-135) se encontró y se probó en el motor de Safari desde la PC.
- Todos aplicaron TDD en sus arreglos.
- Reparto claro: cada persona arregla unos bugs y revisa los de otra.
- Todo el equipo tiene commits en el sprint: se corrigió la carga desigual del Sprint 3.
- Regla de merge clara: el último mensaje del PR debe ser la aprobación de David.

## 3. Qué no salió bien

- **17 PR abiertos el último día del sprint** y ninguno fusionado: la revisión y el merge se juntan antes de la feria. Es el mismo problema de integración tardía de los Sprints 2 y 3.
- **El taller de deuda técnica no empezó.**
- **Los bugs verificados en persona no cambiaron de estado en Jira**, y no se anotó cuántos fueron.
- **El objetivo del sprint sigue sin estar en Jira.**
- **Sprints solapados:** en Jira el Sprint 4 empieza el 26-oct, pero el Sprint 3 se cerró el 1-nov.

## 4. Qué aprendimos / qué probar

- Abrir el PR apenas esté el arreglo, no todos el mismo día.
- Cerrar el sprint anterior antes de empezar el siguiente.
- Mover el estado en Jira el mismo día que se verifica un bug.
- Anotar en Jira lo que se acuerda en persona; si no, se pierde.

## 5. Acciones

| Acción | Responsable | Para cuándo |
|---|---|---|
| Revisar y fusionar los PR de bugs aprobados, empezando por los altos (135, 136 y 137) | Revisores asignados, David (aprobación final) y Ernesto (merge) | Antes de la feria |
| Pasar a Done en Jira los bugs ya verificados | *David y Ernesto* | Antes de la feria |
| Probar el arreglo de iPhone (#52) en un iPhone real | German | Antes de la feria |
