# Sprint Review · Sprint 4 «Estabilización» (preliminar; review pendiente)

Estado preliminar reconstruido con corte informativo al 2 de noviembre. La review aún está pendiente.

- **Fechas:**
  - En Jira: del 26 de octubre al 2 de noviembre.
  - El trabajo de estabilización empezó al cerrar el Sprint 3 (30-oct – 1-nov).
  - Review: pendiente de confirmar; prevista para el siguiente encuentro presencial antes de la feria.
- **Objetivo del sprint:** «Estabilizar para la Feria: taller de deuda técnica y bugs pendientes», acordado el 30-oct. En Jira sigue el texto genérico.
- **Asistentes:** pendientes de confirmar cuando se celebre la review.
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

## 3. Recorrido previsto

Recorrido propuesto; todavía no presentado:

1. El recorrido del Sprint 3 con los perfiles del reporte de bugs: Ana López (`h19.usuario.001`) y Luis Pérez (`h19.usuario.002`).
2. Los bugs arreglados:
   - Atrás tras 20 s sin perder la sesión;
   - «Extender sesión» con la hoja Filtros abierta;
   - doble toque en Guardar;
   - mensaje propio sin conexión;
   - aviso cuando Para ti tarda.

## 4. Decisiones y cambios al backlog

| Fecha | Decisión | Dónde quedó registrada |
|---|---|---|
| 30-oct | Sprint 4 pasa a llamarse «Estabilización»; entran los bugs 74–114 y las tareas del taller de deuda | Jira |
| 30-oct | Reparto de bugs y revisiones: nadie verifica ni aprueba lo que corrigió | `REPARTO_POR_PERSONA.md`, `SPRINT4_BUGS.md` |
| 30-oct | Un bug por rama y por PR, con TDD | `SPRINT4_BUGS.md` |
| 1-nov | Solo se fusiona si la revisión técnica del PR está aprobada y no hay bugs abiertos; para los PR #44 a #60, David (PO) figuró como revisor final | Acuerdo del equipo en persona y por WhatsApp |
| 1-nov | El arreglo del aviso de sesión en iPhone (SCRUM-135) es obligatorio antes de la feria | PR #52 |

## 5. Comentarios de los interesados

Pendiente de registrar después de la review.

## 6. Próximos pasos

- Fusionar los PR de bugs aprobados antes de la feria del 6 de noviembre.
- Del 2 al 5 de noviembre, solo estabilización, sin capacidades nuevas.
