# Sprint Retrospective · Sprint 3 «Filtros»

Registro reconstruido con corte al 30 de octubre. El cierre posterior se registra en Dailys · Semana 4.

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
- **Implementado en main al 30-oct:** H8, H21, H22 y H25; SCRUM-110, 113 y 114.
- **No terminado:**
  - H23 y H20, descartadas para la feria;
  - H24 y SCRUM-109, 111 y 112, que seguían en revisión o pasaban al Sprint 4.
- **Duración:** planificado del 20 al 23 de octubre; seguía abierto al 30-oct y se cruzó con el Sprint 4.
- **ADR registrados:** del 001 al 012.

## 2. Qué salió bien

- Las cuatro historias principales del motor beta (H21, H22, H25 y H8) estaban integradas en main y disponibles en producción para la review.
- **La validación externa se hizo y cambió el producto:**
  - Para ti pasó a ser Promociones, con las secciones Cerca de ti y Explorar.
  - La encuesta pasó a ser visual, con menos texto.
  - En la re-verificación, las dos personas dijeron que todo se veía muy bien.
- TDD visible: commits de prueba en rojo antes del arreglo en H24, H25 y en los bugs de la auditoría.
- Las decisiones técnicas quedaron en ADR y las de producto en comentarios de Jira.
- El arquitecto general decidió rápido sobre el alcance: tarjetas mezcladas, H26 descartada y «Disponibles hoy» a Filtros, todo el 24 de octubre.

## 3. Qué no salió bien

- **El sprint seguía abierto siete días después del fin planificado** y se cruzó con el Sprint 4.
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
