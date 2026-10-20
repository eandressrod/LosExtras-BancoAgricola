# ADR-002: Implementar la lógica de la aplicación en JavaScript

- Estado: aceptada; registro retrospectivo de una decisión existente.
- Fecha del registro: 20 de octubre de 2026.
- Fecha de la decisión: no precisada en el PDF; el stack consta en los registros del 7 de octubre de 2026.
- Clasificación: puerta de una vía dentro del plazo del proyecto.

## Contexto

El frontend ya utiliza HTML, CSS y JavaScript. La API y las reglas de promociones necesitan integrarse con ese recorrido y poder mantenerse por un equipo académico pequeño.

El PDF indica que usar JavaScript en la lógica fue una decisión intencional para reducir la variedad de lenguajes que el equipo debe mantener. Migrar esa lógica implicaría reescribirla, adaptar dependencias y verificar nuevamente su funcionamiento.

## Decisión

Mantener JavaScript para la lógica del navegador y del backend. El backend utiliza Node.js y módulos ES, con separación entre handlers HTTP, servicios y repositorios. El frontend conserva HTML y CSS con módulos JavaScript, sin introducir React por esta decisión.

El uso de JavaScript se refiere a la lógica de aplicación. El esquema y las funciones de PostgreSQL siguen definidos mediante migraciones SQL; no se afirma que todos los archivos del sistema utilicen un único lenguaje.

## Alternativas

Estas alternativas se reconstruyen para explicar el costo de cambio; no constan como una comparación formal realizada por el equipo.

| Alternativa | Implicación |
| --- | --- |
| Backend en otro lenguaje | Introduce otro entorno y exige portar servicios, repositorios y pruebas, preservando los contratos HTTP. |
| Migración a TypeScript | Conserva cercanía con JavaScript, pero requiere acordar tipado, herramientas y adaptación del código; no fue adoptada en este alcance. |

## Consecuencias

- El equipo mantiene la lógica de frontend y backend con el mismo lenguaje.
- Puede reutilizar conocimientos y herramientas de módulos y pruebas de Node.js.
- JavaScript no comprueba por sí solo los contratos de datos antes de ejecutar: JSDoc documenta las formas, y las validaciones y pruebas deben comprobar el comportamiento.
- Cambiar de lenguaje exige adaptar la implementación y volver a verificar la integración, aunque se mantengan las URL y los formatos de la API.

## Reversibilidad

La decisión puede cambiar, pero su costo crece con los servicios, adaptadores y pruebas existentes. Se clasifica como puerta de una vía por el esfuerzo de reescritura y regresión dentro de los sprints disponibles, no por una imposibilidad técnica.

## Evidencia y referencias

- Documento aportado: *Decisiones de arquitectura*, página 1, apartado 1, segunda decisión.
- Registro histórico consultado: «Propuesta de preparación frontend/backend» y «Preparación ejecutada», 7 de octubre de 2026: separación de HTML, JavaScript por pantalla, API y backend.
- [Entorno y comandos](../package.json): módulos ES, Node.js 24.x y pruebas con `node --test`.
- [Contrato documentado con JSDoc](../backend/repositorios/contrato.js).
- [Servicio de autenticación](../backend/servicios/autenticacion.js) y [consumo de sesión en el navegador](../public/js/comun.js), ejemplos de la separación actual.
- [Guía de desarrollo](../docs/GUIA_DESARROLLO.md), apartado 5.

Los comandos y archivos se inspeccionaron para documentar el stack. No se ejecutó la suite ni se atribuye TDD nuevo a esta tarea documental.
