# ADR-001: Entregar el flujo como una web orientada a teléfonos

- Estado: aceptada; registro retrospectivo de una decisión existente.
- Fecha del registro: 20 de octubre de 2026.
- Fecha de la decisión: 7 de octubre de 2026.
- Clasificación: puerta de una vía dentro del plazo del proyecto.

## Contexto

El proyecto académico se concentra en consultar promociones aplicables a las tarjetas del usuario y entender sus condiciones. Login, menú y tarjetas acompañan ese recorrido. El equipo necesita desarrollar, integrar y probar ese flujo durante los sprints disponibles, con una carga académica adicional.

El equipo acordó una aplicación web orientada al uso en teléfono, con frontend, API y backend en un mismo proyecto Vercel. Pasar a una aplicación nativa exigiría rehacer una parte importante de la interfaz, la navegación y el despliegue.

## Decisión

Mantener una aplicación web con HTML, CSS y JavaScript, diseñada para el uso en teléfonos. Servir las pantallas y recursos desde `public/`, las rutas HTTP desde `api/` y la lógica reutilizable desde `backend/`, dentro del mismo proyecto y dominio de Vercel.

La PWA complementa esta decisión con manifest, iconos y apertura independiente del navegador. Su recuperación sin conexión se limita a una página con opción de reintentar: las pantallas funcionales y los datos privados requieren red.

## Alternativas

Estas alternativas se reconstruyen para explicar la decisión; las fuentes no acreditan una evaluación formal de todas ellas.

| Alternativa | Motivo para conservar la decisión actual |
| --- | --- |
| Aplicación nativa | Cambia el desarrollo de interfaz, navegación, distribución y pruebas, con un costo alto para los sprints disponibles. |
| Web sin orientación móvil | Conserva el despliegue web, pero no responde al recorrido y presentación de teléfono elegidos. |

## Consecuencias

- Permite mantener un solo producto web y probar el recorrido con el mismo frontend y API.
- Facilita compartir la aplicación mediante una URL y preparar su instalación como PWA.
- La experiencia depende del navegador y del sistema operativo; el código de instalación no acredita una prueba física en Android o iPhone.
- Requiere conexión para consultar o modificar datos. El service worker no convierte el producto en una aplicación con operación offline.

## Reversibilidad

No es irreversible en términos absolutos. Se clasifica como puerta de una vía por el costo de sustituirla dentro del calendario académico. Un cambio a nativo tendría que acordar qué contratos HTTP se conservan y presupuestar la reconstrucción y verificación del recorrido.

## Evidencia y referencias

- Acuerdo de arquitectura del equipo: «Propuesta de preparación frontend/backend», 7 de octubre de 2026: un proyecto Vercel con frontend en `public/`, rutas en `api/` y lógica en `backend/`.
- Decisión de producto posterior: «H13 PWA e inactividad», 14 de octubre de 2026, que establece instalación Android/iOS y recuperación mínima sin conexión. Son antecedentes, no una verificación actual de producción.
- [Configuración de publicación](../vercel.json).
- [Manifest de la PWA](../public/pwa/manifest.webmanifest) y [service worker](../public/pwa/sw.js).
- [Guía de desarrollo](../docs/GUIA_DESARROLLO.md), apartados de ejecución local y H13.

Este registro documenta la arquitectura; no acredita instalación física ni cumplimiento íntegro de la Definition of Done.
