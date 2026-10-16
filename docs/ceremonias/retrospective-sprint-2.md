# Sprint Retrospective · Sprint 2 «Preferencias»

Registro reconstruido con corte al 16 de octubre. El cierre posterior se registra en Dailys · Semana 2.

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
- **Terminado al 16-oct:** 6 de las 7 historias. H10 seguía en curso.
- **Duración:**
  - planificada, del 13 al 16 de octubre;
  - el sprint seguía abierto al momento de esta retro.

## 2. Qué salió bien

- Seis historias terminadas, con responsables distribuidos; H10 seguía en curso.
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
