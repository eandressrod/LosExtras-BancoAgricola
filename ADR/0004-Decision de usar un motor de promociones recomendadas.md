# ADR-004: Motor de promociones recomendadas (beta)

- Estado: aceptada.
- Fecha del registro y de la decisión: 20 de octubre de 2026.
- Decide: Product Owner operativo.
- Clasificación: puerta de dos vías: cada fase tiene interruptor y la estrategia base funciona sola.
- Fuente de diseño: «Algoritmo de promociones personalizadas · Beta» (18 de octubre de 2026).
- Historias relacionadas en Jira: H21, H22, H23 (principales); H24 (catálogo), H20, H25, H26, H27, H8 (mapa). Jira es la fuente de estados y responsables.
- Relacionado: el catálogo que lee el motor se define en [ADR-006](<0006-Decision de usar una fuente unica para el catalogo.md>).

## Contexto

El valor principal de la aplicación está en Promociones: ayudar a encontrar beneficios aplicables a las tarjetas del usuario. Con un catálogo creciente, un listado cronológico deja de ser útil, pero el proyecto es académico, de alcance pequeño, con datos ficticios, y debe mostrarse en la feria del 6 de noviembre de 2026.

Restricciones que condicionan la decisión:

- Stack fijo: HTML/CSS/JavaScript sin React, backend/API y Supabase, publicado en Vercel.
- Sin analítica, panel analítico ni ranking por consumo; no se inventan datos financieros.
- La persona debe poder entender y corregir por qué ve cada promoción.
- Capacidad de un equipo de estudiantes con otras materias.

## Decisión

Se adopta un motor de ordenamiento **determinista, explicable y por capas**, implementado como función pura en el backend, que ordena solo lo que la tarjeta puede usar según lo que la persona declara.

1. **Elegibilidad antes que puntaje.** Los filtros (tarjeta, vigencia, días, canal, sucursales, cobertura) deciden qué entra. Lo no aplicable nunca se puntúa. Las preferencias solo ordenan, con un piso que impide esconder ofertas.
2. **Una sola fórmula, con tope.** `R = F · (20C + 45·max(M, 0.65A)) + 15B + 15T`, máximo 95. Los pesos están elegidos para que lo declarado siempre gane: un comercio no elegido llega como máximo a 64.25 frente a 65 de uno elegido con la misma T.
3. **El perfil guarda hechos, nunca puntajes.** Intereses, criterios, rechazos y guardadas se registran con origen, fecha y estado activo. Anclas, afinidad y sensibilidad se recalculan al ordenar; quitar una señal borra todo lo derivado y toda corrección se puede deshacer.
4. **Catálogo en cuatro capas** (filtros, taxonomía, ocasiones, atributos de criterio). Solo las 11 ocasiones se etiquetan a mano; el resto se deriva.
5. **Similitud por coseno con máximo, no promedio**, y un «puente» (+0.15) para relaciones que el vector no expresa. Agregar un gusto nunca baja la afinidad de otro.
6. **Estrategia base separable.** Elegibilidad + orden por fecha de alta + variedad mínima funciona sola y es la referencia de toda comparación.
7. **Despliegue por fases con interruptor.** Cada fase debe ganar a ciegas a la anterior o se apaga.

   | Fase | Activa |
   | --- | --- |
   | 1 | Elegibilidad, alcance, estrategia base, instantánea y registro |
   | 2 | C, M, correcciones, variedad y explicaciones |
   | 3 | A, puentes, F y B |

   Esta entrega cubre las fases 1–2 y la encuesta de tres pasos.
8. **Parámetros en un archivo versionado**; cada instantánea registra la versión usada.
9. **Instantánea por visita.** El orden se calcula al iniciar visita, al confirmar intereses, cambiar tarjeta o filtros, o al pedir actualizar; nunca mientras la persona lee o vuelve del detalle.
10. **Diez invariantes verificables** (nada no elegible aparece, mismo input → mismo orden, B ≤ 1, F ≥ 0.5, un filtro explícito nunca se altera, etc.), que sirven como pruebas de propiedad.

Reglas de producto que el diseño garantiza por mecanismo, no por disciplina: aplicable antes que atractiva; los filtros delimitan y las preferencias ordenan; lo declarado manda; explicable y corregible; sin urgencia, novedad ni popularidad inventadas (el vencimiento no suma puntaje).

## Por qué esta opción

- **Escala sin reescritura.** Al ser función pura sobre datos declarados, crece añadiendo catálogo, señales o fases, no cambiando la arquitectura. Los pesos y umbrales se ajustan por configuración.
- **Funciona bien en la demo.** Con perfil vacío devuelve todo lo elegible; con encuesta de tres pasos ya hay orden personalizado y razón visible. No necesita historial ni volumen de uso para verse correcto.
- **Cabe en el stack y el alcance.** No requiere entrenamiento, servicios externos ni infraestructura nueva.
- **Auditable.** Cada resultado lleva sus componentes y la razón sale del término dominante; el equipo y la docente pueden verificar por qué quedó en esa posición.
- **Alineado con el producto.** No hay analítica ni ranking por consumo: el motor lee solo lo que la persona dijo.

## Alternativas consideradas

- **Orden cronológico simple:** se conserva como estrategia base y referencia, pero no personaliza.
- **Filtrado colaborativo / popularidad:** exige volumen de usuarios y datos de comportamiento que no existen, y contradice «sin trucos».
- **Modelo aprendido:** no explicable ni corregible por la persona, y desproporcionado para el alcance.
- **Guardar puntajes en el perfil:** se descartó; quitar una señal dejaría residuos y rompería la corregibilidad.

## Consecuencias

**Positivas**

- Comportamiento predecible y probable con TDD (fórmula, invariantes, empates con orden fijo).
- Personalización separable: se puede apagar una fase sin perder la anterior.
- Correcciones reversibles y razones honestas (los criterios inferidos nunca se muestran como razón).

**Negativas / riesgos**

- **Dependencia fuerte de la base de datos (riesgo principal).** El motor lee en cada visita el catálogo con sus cuatro capas, las señales del perfil, las sucursales y coberturas, las relaciones entre intereses y las instantáneas por sección, además de similitudes precalculadas cuando cambia el catálogo. Más catálogo y más señales implican más lecturas por visita y más filas por usuario.
  - *Mitigaciones previstas por el diseño:* similitudes precalculadas al cambiar el catálogo; perfil solo con hechos (sin puntajes derivados); instantánea por visita en lugar de recálculo continuo; estrategia base que no lee perfil, vectores ni comportamiento y sirve de degradación.
  - *Pendiente de medir:* costo real de lectura por visita con el catálogo ampliado por H24 y límites del plan de Supabase.
- **Etiquetado manual de ocasiones:** hay que validar el vocabulario (cada ocasión en 2+ categorías y 5–50 % de comercios, correlación < 0.7, 80 % de acuerdo entre etiquetadores).
- **Calidad del catálogo:** una promoción sin tarjeta, vigencia, días o canal queda fuera con su motivo; el validador debe correr tras cada cambio de catálogo.
- **Parámetros iniciales sin evidencia de uso real:** la validación a ciegas por fase aún está pendiente.

## Alcance y límites de esta entrega

- **Solo se guardan señales declaradas:** intereses, criterios, rechazos y guardadas. **No se registran impresiones, aperturas ni analítica.** El documento de diseño contempla un registro de interacciones (impresiones con instantánea y posición, aperturas); eso queda **fuera de esta entrega** y, si se retoma, requiere decisión expresa del PO por la restricción de no analítica. Por lo mismo, V y O (comportamiento) pertenecen a la fase 3.
- Fuera de la beta: notificaciones, tasas de apertura, simular el cambio de la pregunta en el top 10, precio efectivo con promoción aplicada y ubicación precisa permanente.
- Mapa y ubicación real dependen de H8 y solo con solución gratuita, sin registro ni claves.

## Referencias

- «Algoritmo de promociones personalizadas · Beta» y «Encuesta inicial · Bases de diseño (beta)».
- Protocolo de validación a ciegas: documento «Prototipo externo».
- Jira SCRUM (H21–H28).
