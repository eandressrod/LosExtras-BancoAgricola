# ADR-010: Ofrecer la encuesta de intereses sin insistir

- Estado: aceptada.
- Fecha del registro y de la decisión: 23 de octubre de 2026.
- Decide: Product Owner operativo, al planificar H21 ([SCRUM-71](https://somos-agilistas.atlassian.net/browse/SCRUM-71)).
- Clasificación: puerta de dos vías. La parte 1 no cambia el backend; la persistencia de la parte 2 sería una migración aditiva ([ADR-005](<0005-Decision de versionar con regreso y respaldo de datos.md>)).
- Relacionado: [ADR-004](<0004-Decision de usar un motor de promociones recomendadas.md>) (señales declaradas), [ADR-009](<0009-Decision de implementar el motor beta de Para ti.md>) (registro de señales y vista previa) y los principios UX/UI registrados en el [comentario de SCRUM-71](https://somos-agilistas.atlassian.net/browse/SCRUM-71?focusedCommentId=10029).

## Contexto

El documento «Encuesta inicial · Bases de diseño (beta)» y el criterio 8 de H21 piden una tarjeta «Personaliza en 3 pasos» que desaparece tras **dos descartes**. Al mismo tiempo, con la encuesta pendiente la hoja se abre en cada entrada, y «Omitir» la deja pendiente (H3). Juntas, las dos reglas no encajan:

- **Si la hoja se reabre en cada visita,** la tarjeta sobra y nunca llega a sus dos descartes.
- **Insistir molesta.** En banca móvil la persona entra a algo puntual. Un mensaje repetido se habitúa: la atención y la respuesta neural caen con cada repetición (Anderson, Vance, Kirwan et al., 2014 y 2016; Vance et al., 2018). La interrupción persistente («nagging») figura entre los patrones oscuros (Gray et al., CHI 2018).
- **Sin persistencia.** No existe lugar en la base para contar descartes ni para saber si la hoja ya se mostró, y `encuesta_completada` solo se marca con `POST /api/preferencias`, que exige al menos una categoría.

## Decisión

1. **La hoja se abre sola solo la primera vez** que la persona entra a Promociones con la encuesta pendiente.
2. **Después, un aviso discreto dentro de la lista** («Personaliza tus promociones en 3 pasos»), sin ventana ni bloqueo. Sigue visible hasta que la persona lo cierra **una vez**, y no vuelve. Sustituye la regla de los dos descartes.
3. **La encuesta queda siempre disponible** desde «Mis preferencias».
4. **Parte 1 de H21 (sin cambios de backend):**
   - Cada página escribe sus señales en `/api/senales` con origen encuesta, comparando con lo ya confirmado: crea o reactiva con `POST` y desactiva con `PATCH`.
   - Solo «Listo» marca la encuesta como completada, con `POST /api/preferencias` y las categorías activas. Si la persona termina sin ninguna categoría, la encuesta queda pendiente; lo confirmado se conserva igual.
   - `encuesta.html` redirige a Promociones, donde se abre la hoja. El contrato del menú (`encuestaPendiente`, `destinoPromociones`) no cambia.
   - **Transición:** mientras falte la persistencia, la hoja se abre al entrar con la encuesta pendiente y «Omitir» evita que vuelva a abrirse en la misma sesión (marca en `sessionStorage` por perfil, que se borra al iniciar o cerrar sesión). El aviso del punto 2 no se muestra todavía.
5. **Parte 2 (caso de backend acordado):** guardar por usuario dos marcas, «hoja mostrada» y «aviso cerrado», y exponerlas sin sumar funciones de Vercel. Se puede ampliar `/api/promociones-apertura` o reutilizar `perfiles.promociones_abiertas`, que ya registra la primera apertura, si devuelve su valor anterior. Esa elección se documenta al implementarla.
   - **Elección (26 de octubre):** dos columnas nuevas en `perfiles` (`encuesta_hoja_mostrada` y `encuesta_aviso_cerrado`) y `POST /api/promociones-apertura` ampliado con una `marca` opcional, que siempre devuelve las marcas guardadas. No se reutiliza `promociones_abiertas`, porque ya es verdadera en perfiles que nunca vieron la hoja: no volverían a ver la encuesta. Contrato en la sección 12 de la [guía de desarrollo](<../docs/GUIA_DESARROLLO.md>).

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| Reabrir la hoja en cada visita mientras esté pendiente | Interrumpe tareas puntuales y genera habituación; la tarjeta perdería sentido. |
| Tarjeta con dos descartes (diseño original) | Mantiene la invitación más tiempo del necesario y exige un contador, dato más fino que dos marcas. |
| Mostrar el aviso una sola vez, aunque no se lea | Quien entró con prisa pierde la invitación sin haberla decidido. |
| Guardar las marcas en el navegador | Otro navegador volvería a insistir; el criterio 9 pide recuperar lo guardado entre navegadores. |
| Usar `senales_usuario` para los descartes | No es una preferencia: el motor la leería como señal y su restricción no admite ese ámbito. |
| Completar la encuesta sin categorías en la parte 1 | Exige cambiar el contrato de `/api/preferencias`, fuera del alcance acordado para la parte 1. |

## Consecuencias

**Positivas**

- La encuesta se ofrece de forma visible una vez y de forma discreta otra; después la decisión queda en manos de la persona.
- La parte 1 se entrega sin migraciones ni endpoints nuevos.
- Las marcas son estado de interfaz, como `encuesta_completada`. No son impresiones ni analítica, que la decisión del 19 de octubre excluye.

**Negativas o pendientes**

- Hasta la parte 2, la hoja puede volver a abrirse en una sesión nueva si la encuesta sigue pendiente.
- Terminar con «Listo» sin categorías deja la encuesta pendiente.
- El criterio 8 de H21 en Jira todavía describe la regla de los dos descartes; actualizarlo requiere la decisión del PO.

## Reversibilidad

- Volver a reabrir la hoja en cada entrada es quitar la marca de sesión en el cliente.
- Las marcas de la parte 2 serían columnas aditivas; dejarlas sin uso no afecta versiones anteriores.

Este registro documenta la decisión. No acredita la aprobación del PO de las funciones, la verificación externa ni el cumplimiento íntegro de la DoD de H21.
