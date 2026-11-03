# Borrador de retrospectiva · Sprint 4 «Estabilización»

Borrador reconstruido con información disponible al 2 de noviembre. La realización y los acuerdos de la retro están pendientes de confirmar.

- **Fecha:** pendiente de confirmar; se propone realizarla después del cierre del sprint y antes de la feria.
- **Asistentes:** pendientes de confirmar.
- **Facilita:** pendiente de confirmar.

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

## 2. Observaciones preliminares por validar

- QA probó producción en un teléfono real y encontró 18 bugs con pasos para reproducirlos, antes de la feria.
- El causante del bug de iPhone (SCRUM-135) se encontró y se probó en el motor de Safari desde la PC.
- Todos aplicaron TDD en sus arreglos.
- Reparto claro: cada persona arregla unos bugs y revisa los de otra.
- Todo el equipo tiene commits en el sprint: se corrigió la carga desigual del Sprint 3.
- Regla de merge clara: el último mensaje del PR debe ser la aprobación de David.

## 3. Problemas pendientes por discutir

- **17 PR abiertos el último día del sprint** y ninguno fusionado: la revisión y el merge se juntan antes de la feria. Es el mismo problema de integración tardía de los Sprints 2 y 3.
- **El taller de deuda técnica no empezó.**
- **Los bugs verificados en persona no cambiaron de estado en Jira**, y no se anotó cuántos fueron.
- **El objetivo del sprint sigue sin estar en Jira.**
- **Sprints solapados:** en Jira el Sprint 4 empieza el 26-oct, pero el Sprint 3 se cerró el 1-nov.

## 4. Temas de aprendizaje propuestos

- Abrir el PR apenas esté el arreglo, no todos el mismo día.
- Cerrar el sprint anterior antes de empezar el siguiente.
- Mover el estado en Jira el mismo día que se verifica un bug.
- Anotar en Jira lo que se acuerda en persona; si no, se pierde.

## 5. Acciones propuestas, pendientes de validar

| Acción | Responsable | Para cuándo |
|---|---|---|
| Revisar y fusionar los PR de bugs aprobados, empezando por los altos (135, 136 y 137) | Revisores asignados, David (PO y revisor final de esos PR) y Ernesto (merge) | Antes de la feria |
| Pasar a Done en Jira los bugs ya verificados | *David y Ernesto* | Antes de la feria |
| Probar el arreglo de iPhone (#52) en un iPhone real | German | Antes de la feria |
