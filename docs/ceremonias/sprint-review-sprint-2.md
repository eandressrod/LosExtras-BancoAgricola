# Sprint Review · Sprint 2 «Preferencias»

Registro reconstruido. Corte de lo presentado: 16 de octubre.

- **Fechas:**
  - En Jira: del 13 al 16 de octubre.
  - Review: *viernes 16 de octubre, en clase*.
- **Objetivo del sprint:** en Jira quedó el texto genérico. Objetivo real, según lo trabajado: **encontrar promociones en Para ti con filtros, búsqueda, tarjeta elegida y guardadas, con el menú y la app instalable en el celular**.
- **Asistentes:** *Ernesto (Scrum Master), David (PO), German (QA), Sara y Sam (Developers)*.
- **Producción:** Vercel, main del 16 de octubre (H17 y fixes conservados tras cancelar el rollback).

## 1. Qué se terminó

| Historia | Responsable | PR | Estado en Jira |
|---|---|---|---|
| H5 · Filtrar temporalmente por categoría (SCRUM-10) | David | #10 | Done (16-oct) |
| H16 · Elegir una de mis tarjetas (SCRUM-66) | David | #11 | Done (16-oct) |
| H13 · Abrir la aplicación desde un icono en el celular (SCRUM-23) | Ernesto | #12 | Done (15-oct) |
| H19 · Mejorar el menú y el acceso a Promociones en celular (SCRUM-69) | Ernesto | #12 | Done (15-oct) |
| H17 · Encontrar promociones que puedo usar hoy (SCRUM-67) | Sam | #13 | Done (16-oct) |
| H11 · Guardar promociones (SCRUM-21) | Sara | #14 | Done (16-oct) |
| H10 · Buscar por nombre de comercio (SCRUM-20) | German | — | En curso al 16-oct |

Además se entregaron:
- el respaldo y regreso de versiones de la base (PR #15 y #16, ADR-005);
- la prueba e2e del camino principal (PR #17);
- los arreglos de SCRUM-72 y 73 (PR #18).

## 2. Qué no se terminó y por qué

H10 seguía en curso durante la review; las otras seis historias estaban listas. El rollback local se canceló y se conservaron H17 y los arreglos.

## 3. Demo

Recorrido mostrado *(lógico, según lo entregado)*: abrir la app desde el icono → login → menú → Para ti, con estos pasos:
- filtro por categoría;
- «Disponibles hoy»;
- cambio de tarjeta;
- búsqueda por comercio;
- guardar una promoción y abrir Guardadas.

## 4. Decisiones y cambios al backlog

| Fecha | Decisión | Dónde quedó registrada |
|---|---|---|
| 12-oct | Acuerdo operativo del equipo sobre roles y flujo de trabajo | Acuerdo del 12-oct |
| 13-oct | Midi como herramienta local para administrar datos (retirada después, el 22-oct) | PR #8 · ADR-008 |
| 16-oct | Se cancela el rollback y se conservan H17 y los arreglos. Para cerrar las ramas se difieren la validación externa y la revisión por otra persona | Acuerdo del 16-oct |

## 5. Comentarios de los interesados

Se dieron en clase y no se anotaron.

## 6. Próximos pasos

Preparar la planificación y acordar el objetivo del Sprint 3.
