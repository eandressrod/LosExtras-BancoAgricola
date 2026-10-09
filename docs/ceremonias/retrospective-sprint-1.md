# Sprint Retrospective · Sprint 1 «Perfiles y promos»

Registro reconstruido con corte al 9 de octubre. Los cierres posteriores aparecen en Dailys · Semana 1.

- **Fecha:** *viernes 9 de octubre, en clase, después de la review*
- **Asistentes:** *Ernesto, David, German, Sara y Sam*
- **Facilita:** Ernesto (Scrum Master)

## 0. Acciones de la retro anterior

Es la primera retro con historias: el Sprint 0 solo preparó el repositorio y el despliegue (H0).

## 1. Datos del sprint

- **Comprometido:** 5 historias (H1, H2, H3, H4 y H7).
- **Terminado al 9-oct:** H1, H2 y H3. H4 y H7 siguen en proceso.
- **Duración:**
  - planificada, del 7 al 9 de octubre;
  - el sprint seguía abierto al momento de esta retro.

## 2. Qué salió bien

- H1, H2 y H3 llegaron a main antes de la retro; H4 y H7 seguían en trabajo.
- Cada persona tuvo una historia propia: David H1, Sam H2, German H3, Ernesto H4 y Sara H7.
- Se empezó con TDD: hay commits de pruebas en rojo antes del código en H1 y en H3.
- El login y la sesión quedaron validados por backend, con Supabase.

## 3. Qué no salió bien

- **Arranque con una sola historia y una sola épica.** Hasta el Sprint 0 se trabajó solo H0 bajo una épica general (SCRUM-5) que mezclaba alcance, DoD y producto. No se entendía que una épica agrupa historias de una misma capacidad. Se corrigió a mitad de camino.
- **H7 dependía de H4** y seguía pendiente de integración al momento de la retro.
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
