# Dailys · Semana 3 · 19 – 25 de octubre

Registro reconstruido. Última daily de la semana: 23 de octubre.

**Sprint 3 «Filtros» · 20 de octubre – 1 de noviembre**

## Resumen por persona

| Persona | Historias y bugs trabajados | PR | Bloqueos que se repitieron |
|---|---|---|---|
| Ernesto | H22 (motor, señales, API, sistema visual), H21 (encuesta), H8 (mapa), retiro de Midi, ADR 001–012 | #22–#26, #29, #31, #36, #37, #40, #41 | Emulador sin teselas del mapa; conflictos al integrar |
| David | H24 entrega 1 (contratos y esqueleto del catálogo) | #21 | — |
| German | H25 (Hoy busco), SCRUM-111 y 112 (Guardadas) | #30, #32, #38 | Conflictos con main en #32 |
| Sara | SCRUM-113 y 114 (categorías duplicadas, encuesta del perfil B) | #27 | — |
| Sam | H23 (corregir y deshacer), SCRUM-109 y 110 | #33, #34, #35 | #34 y #35 con conflictos tras los merges del 26–27 oct |

## Planning · lunes 19-oct

- El arquitecto general enfoca el sprint en el motor beta: fases 1–2 y encuesta de 3 pasos.
- El arquitecto general asigna responsables y el Sprint 3 en Jira.
- Se descartan H9, H12, H14, H15 y H18.
- El catálogo solo se amplía mediante H24.

## Daily · miércoles 21-oct · día 2 de 4

| Persona | Hecho desde el inicio (20-oct) | Sigue | Bloqueos |
|---|---|---|---|
| Ernesto | Registro de decisiones en `ADR/` (ADR-001 a 003, fuente única del catálogo); fusiona #21, #22 y #23 | Motor de H22 y retiro de Midi | — |
| David | H24 entrega 1: pruebas en rojo del contrato, esquema de la fuente única, validador, generador, migración y esqueleto del catálogo. PR #21 fusionado (SCRUM-123) | Entregas 2 y 3 de H24 | — |
| German | *Prepara H25 «Hoy busco»* | Pruebas en rojo de H25 | — |
| Sara | *Analiza las categorías repetidas y la encuesta del perfil B (SCRUM-113 y 114)* | Arreglo en mock | — |
| Sam | *Arranca H23 (corregir y deshacer) y los bugs SCRUM-109 y 110* | H23 | — |

**Decisiones (20-oct):**
- El catálogo usa marcas reales de El Salvador con ofertas ficticias, sin verificar licencias de imágenes.
- El equipo decide lo técnico y lo registra en ADR.

**Avisos:** entre el 20 y el 22 de octubre se hace la validación externa:
- Victor López revisa Para ti.
- Leandro Iraheta revisa la encuesta.

Sus observaciones están en las fichas de validación externa 1 y 2.

## Daily · viernes 23-oct · día 4 de 4 (fin planificado)

| Persona | Hecho desde el miércoles | Sigue | Bloqueos |
|---|---|---|---|
| Ernesto | 22-oct: retira Midi (ADR-008); ADR-007 (deuda hasta la feria); taller de deuda técnica (crea SCRUM-129 a 132); H22: motor fases 1–2, `/api/para-ti`, `/api/senales`, ADR-009. 23-oct: H21, reglas de la encuesta en 3 pasos y hoja sobre Para ti; ADR-010; sistema visual (SCRUM-127) y ADR-011 | Sistema visual v3 | La v1 del sistema visual (PR #28) se rechaza y se cierra |
| David | *Prepara la entrega 2 de H24 (muestra de Restaurantes)* | H24 entrega 2 | — |
| German | H25: pruebas unitarias y de integración en rojo | Implementar «Hoy busco» | — |
| Sara | Corrige las categorías repetidas y la encuesta del perfil B en mock (SCRUM-113 y 114) | PR #27 | — |
| Sam | *Avanza H23 y SCRUM-109 y 110* | Abrir los PR | — |

**Decisiones:**
- A partir de la validación externa, se rediseñan Para ti y la encuesta.
- La encuesta se ofrece sin insistir (ADR-010).
- El sprint no se cierra: sigue abierto.
