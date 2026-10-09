# Sprint Review · Sprint 1 «Perfiles y promos»

Registro reconstruido. Corte de lo presentado: 9 de octubre.

- **Fechas:**
  - En Jira: del 7 al 9 de octubre.
  - Review: *viernes 9 de octubre, en clase*.
- **Objetivo del sprint:** que los usuarios de prueba A (Básica) y B (Black) entren por login y menú, y consulten las ofertas y condiciones de su tarjeta y sus intereses. Historias: H1, H2, H3, H4 y H7. El texto estaba en Jira; en la retro posterior de ese día se consideró una hipótesis porque no se acordaron capacidad ni tareas.
- **Asistentes:** *Ernesto (Scrum Master), David (PO), German (QA), Sara y Sam (Developers)*.
- **Producción:** Vercel, con el primer despliegue del Sprint 0 (H0).

## 1. Qué se terminó

| Historia | Responsable | PR | Estado en Jira |
|---|---|---|---|
| H1 · Iniciar sesión con credenciales verificadas y cargar mi perfil (SCRUM-2) | David | #1, #2 | Done (9-oct) |
| H2 · Consultar mi menú, cuentas ficticias y acceso a Promociones (SCRUM-3) | Sam | #3 | Done (9-oct) |
| H3 · Registrar categorías de interés en el primer acceso (SCRUM-6) | German | #4 | Done (9-oct) |
| H4 · Consultar promociones aplicables a mi tarjeta y categorías (SCRUM-7) | Ernesto | — | En curso al 9-oct |
| H7 · Consultar el detalle básico de una promoción (SCRUM-8) | Sara | — | En curso al 9-oct |

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
- Completar H4 y H7 y agregar integración continua de pruebas.
