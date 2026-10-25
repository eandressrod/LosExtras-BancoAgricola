# ADR-009: Implementar el motor beta de Para ti (fases 1–2) con señales declaradas

- Estado: aceptada.
- Fecha del registro y de la decisión: 22 de octubre de 2026.
- Decide: Product Owner operativo, al planificar las subtareas 2 y 3 de H22 ([SCRUM-128](https://somos-agilistas.atlassian.net/browse/SCRUM-128) y [SCRUM-133](https://somos-agilistas.atlassian.net/browse/SCRUM-133)).
- Clasificación: puerta de dos vías en el código (endpoint, ubicación del motor, helper de sesión e instantánea). La tabla `senales_usuario` es aditiva ([ADR-005](<0005-Decision de versionar con regreso y respaldo de datos.md>)); retirarla exigiría una migración posterior.
- Relacionado: [ADR-004](<0004-Decision de usar un motor de promociones recomendadas.md>) (diseño del motor), [ADR-006](<0006-Decision de usar una fuente unica para el catalogo.md>) (catálogo), [ADR-007](<0007-Decision de aceptar deuda tecnica hasta la feria.md>) y el [taller de deuda técnica](<../docs/TALLER_DEUDA_TECNICA.md>).

## Contexto

ADR-004 definió el motor de forma teórica. Faltaba llevarlo al sistema sin rehacer el frontend, porque el diseño propio de Promociones llega después (SCRUM-127). Las restricciones de esta entrega son:

- **Vercel Hobby.** Ya se usan las 12 funciones serverless, y `/api/promociones` responde un arreglo plano cuyo orden comprueban las pruebas de H5, H10, H16 y H17.
- **Categorías en otra tabla.** Las categorías elegidas viven en `preferencias_usuario`, y la versión de regreso (ADR-005) las lee de ahí.
- **Vista previa de H21.** H21 necesita el mismo motor en el navegador.
- **Taller del 22 de octubre.** La validación de sesión copiada es desorden (T3, SCRUM-130); cada repositorio nuevo entra con su mock, su variante Supabase y su contrato (ADR-007).

## Decisión

1. **Endpoint nuevo `/api/para-ti`.** Entra por la función compartida `api/recursos.js`, con su rewrite, igual que `/api/senales`.
   - Responde un sobre: `{version, estrategia, vacio, promociones, descartadas}`.
   - `/api/promociones` conserva su contrato.
   - Ambos endpoints leen la consulta con `backend/servicios/consulta-promociones.js`, sin copiarla.
2. **El motor es un paquete ESM puro en `public/js/motor/`.**
   - No tiene dependencias ni secretos, y el backend lo importa por ruta relativa.
   - Los filtros explícitos (H5, H10, H17) se movieron a `public/js/motor/filtros.js`; `backend/promociones.js` los reexporta.
   - Los parámetros viven en `public/js/motor/config.js`, versionado.
3. **El motor solo lee `senales_usuario`.**
   - `/api/preferencias` conserva su contrato. Escribe en `preferencias_usuario` y sincroniza interés·categoría con origen encuesta.
   - La migración copia las categorías existentes.
   - `encuesta_completada` no se mueve.
4. **Helper `exigirPerfil` en `backend/http.js`.** Lo usan solo `/api/para-ti` y `/api/senales`; T3 migrará los demás handlers.
5. **La instantánea vive solo en el navegador** (`sessionStorage`, clave por perfil).
   - Se reutiliza al volver del detalle si la consulta es la misma, es el mismo día y no han pasado 30 minutos sin usarla.
   - Entrar, cambiar la tarjeta o un filtro, o recargar sin volver del detalle recalcula el orden.
   - Iniciar o cerrar sesión la borra.
   - El servidor no guarda órdenes, puntajes ni impresiones.
6. **Vocabulario de señales.** Las clases interés, criterio y rechazo admiten solo sus ámbitos, y los orígenes son encuesta, pregunta y tarjeta.
   - Canal, beneficio y descubrir aceptan solo las opciones de la encuesta, más `indiferente` para la indiferencia declarada.
   - Categoría, subcategoría, comercio y oferta deben existir en el catálogo vigente.
7. **Puntos de extensión para otras historias.** H23 y H25 aportan reglas puras (`excluir`, `multiplicador`, `intencion`) con efecto neutro por defecto.
8. **Estado vacío `intereses`.** Además de `sin-catalogo` y `filtros`, el motor distingue cuando las categorías declaradas no tienen promociones para la tarjeta, sin filtros activos.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| Ampliar `/api/promociones` con el orden y un sobre | Rompe su contrato y las pruebas de orden de H5, H10, H16 y H17. |
| Leer las categorías de `preferencias_usuario` y el resto de señales en otra tabla | Dos fuentes que pueden contradecirse para el mismo hecho. |
| Hacer T3 completa antes del motor | Retrasa el contrato que esperan H20, H21, H23 y H25; el helper se adelanta solo para los handlers nuevos. |
| Motor en `backend/` con una copia para el cliente | Dos copias y una prueba extra para mantenerlas iguales. |
| Guardar la instantánea en el servidor | H22 la excluye y sería un registro de uso. |

## Consecuencias

**Positivas**

- **Una sola copia del motor y de los filtros** para el servidor, el cliente y las pruebas.
- **Nada cambia para quien no usa Para ti.** `/api/promociones`, `/api/preferencias` y el contrato del menú se mantienen.
- **Pruebas de propiedad.** Los invariantes de H22 se prueban sobre el catálogo del esqueleto para cada tarjeta, perfil de prueba y combinación de filtros.

**Negativas o pendientes**

- **Escritura doble hasta la fase «contract».** `/api/preferencias` escribe en dos tablas. Si falla la segunda escritura, responde 503 y reintentar es idempotente.
- **La tabla nueva rompe la prueba de regreso a PR 21.** Esa versión comprueba de forma fija el número de tablas y la cobertura del respaldo. Se abre una transición en `supabase/versiones.json`, como hizo H24, y el PR del motor se registra como destino de regreso al fusionarse.
- **Rutas en tres lugares.** Agregar una ruta sigue exigiendo tocar `api/recursos.js`, `vercel.json` y `scripts/dev.js` hasta T3.
- **Restaurar un respaldo.** Se insertan los ids de la foto; en una base vacía hay que ajustar después la secuencia de `senales_usuario`.
- **Las preferencias dejan de filtrar Para ti.** Ahora definen el alcance del motor; un filtro de categoría abre su alcance en esa consulta. Las promociones vencidas o próximas ya no entran en Para ti, por el criterio 1 de H22.

## Reversibilidad

- Volver a `/api/promociones` en el listado es cambiar `urlConsulta` y la lectura de la respuesta en `public/js/promociones.js`.
- La tabla de señales puede quedar sin uso sin afectar a ninguna versión anterior.

Este registro documenta la decisión. No acredita la aprobación del PO de las funciones, la verificación externa ni el cumplimiento íntegro de la DoD de H22.
