# Dailys · Semana 1 · 5 – 11 de octubre

Registro reconstruido. La semana se registra del 5 al 11 de octubre; la sección final actualiza el seguimiento hasta el 12 de octubre.

**Sprint 1 «Perfiles y promos» · 7 – 9 de octubre**

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

## Seguimiento posterior a la última daily · sábado 10 – lunes 12-oct

| Persona | Hecho |
|---|---|
| Ernesto | 10-oct: promociones por tarjeta y preferencias (H4) con el detalle básico (H7), PR #5. 12-oct: CI de pruebas unitarias y de integración (PR #6) |

**Jira:** H4 y H7 pasan a Done el 10-oct y el Sprint 1 se cierra el 12-oct.
