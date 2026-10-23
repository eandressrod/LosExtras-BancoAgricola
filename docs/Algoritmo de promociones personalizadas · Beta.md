# Algoritmo de promociones personalizadas · Beta

Oct 18, 2026 · @Nocky

La beta ordena las promociones que la persona puede usar según lo que declara, lo que se parece a ello y cómo prefiere aprovecharlas. Los filtros siempre deciden qué entra.

## Reglas que no se negocian

Cinco reglas gobiernan el sistema, y cada una se cumple por un mecanismo, no por disciplina del equipo.

| Regla | Mecanismo que la garantiza |
| --- | --- |
| Aplicable antes que atractiva | La elegibilidad filtra antes de puntuar: lo que la tarjeta no puede usar nunca entra. |
| Los filtros delimitan; las preferencias ordenan | Solo un filtro explícito restringe. Intereses y criterios suben o bajan, con un piso que impide esconder. |
| Lo declarado manda | Un comercio elegido siempre queda arriba de uno no elegido con la misma intención del día. |
| Explicable y corregible | Cada resultado lleva sus componentes; la razón sale del dominante y toda corrección se puede deshacer. |
| Sin trucos | No hay urgencia, novedad ni popularidad sin datos reales. El vencimiento no suma puntaje. |

La personalización es separable. La estrategia base (filtros, orden por fecha de alta y variedad mínima) funciona sola y es la referencia de toda comparación. La encuesta que alimenta el perfil está en Encuesta inicial · Bases de diseño (beta).

## Flujo completo

&#91;embedded content: flujo del sistema · 7 piezas y un ciclo\]

La encuesta, las preguntas en contexto y las interacciones solo escriben hechos en el registro. El motor los lee en cada visita y nunca guarda puntajes.

## Datos del catálogo

Cada promoción se describe en cuatro capas, y solo las 11 ocasiones se etiquetan a mano.

| Capa | Responde | Contenido | Uso |
| --- | --- | --- | --- |
| Filtros | ¿Se puede usar? | Tarjetas, vigencia y días, canales, sucursales y cobertura | Sí o no, antes de puntuar |
| Taxonomía | ¿Qué es? | \~15 categorías y \~50 subcategorías | C, alcance y una columna por subcategoría en el vector |
| Ocasiones | ¿Para qué sirve? | 11 valores de 0, 0.5 o 1 | Similitud entre categorías |
| Atributos de criterio | ¿Cómo se aprovecha? | Nivel de precio, canal y tipo de beneficio | Factores propios de cada persona |

**Entidades**

| Entidad | Campos |
| --- | --- |
| Comercio | id, nombre, categoría, subcategoría, ocasiones, nivelPrecio (1–3, relativo a su categoría), reconocible, sensible, afinarPor (comercio, subcategoría o no) |
| Promoción | id, comercio, título, tarjetas, vigencia, días, canales, sucursales, condición decisiva, tipoBeneficio, etiquetasIntención, alta; ocasiones y nivelPrecio opcionales, que sobrescriben los del comercio |
| Sucursal | id, comercio, coordenadas, zona |
| Cobertura | comercio, zona y estado: sí, no o desconocida |
| Relación | interés A, interés B, ocasión requerida y nota |

**Las 11 ocasiones**

| Ocasión | Atraviesa, por ejemplo |
| --- | --- |
| Compras del día a día | Supermercados, farmacias, gasolineras, panaderías |
| Rápido y práctico | Comida rápida, tiendas de conveniencia, servicios exprés |
| Darse un gusto | Postres, restaurantes de mesa, spa, perfumería |
| Salir con amigos o pareja | Restaurantes, bares, cine, eventos |
| Planes en familia | Restaurantes familiares, cine, juguetes, parques |
| Bienestar y vida activa | Gimnasios, artículos deportivos, comida saludable, yoga |
| Entretenimiento | Cine, videojuegos, conciertos, streaming |
| Estilo personal | Ropa, calzado, belleza, accesorios |
| Tecnología | Electrónica, celulares, videojuegos, telefonía |
| Hogar | Muebles, electrodomésticos, ferretería, decoración |
| Viajes y escapadas | Aerolíneas, hoteles, turismo local, renta de autos |

En la rúbrica, 1 significa que la oferta gira en torno a esa ocasión; 0.5, que la incluye en parte; y 0, que no aplica. Cada valor se escribe con una definición y un ejemplo.

Quedan fuera del vector a propósito:

- **Comercios sensibles, como los de salud:** sus ocasiones quedan vacías y solo conservan su columna de subcategoría, así que nunca generan sugerencias en otras categorías.
- **Regalos:** son una etiqueta de intención de la visita, no un gusto.
- **Mascotas, automotriz y educación:** no atraviesan categorías, así que son categorías.
- **Precio y canal:** son atributos de criterio.

**Validación del vocabulario.** Tras etiquetar el catálogo, cada ocasión debe aparecer en 2 o más categorías y en 5–50 % de los comercios. También debe tener correlación menor a 0.7 con las demás, 80 % de acuerdo entre dos etiquetadores y un nombre de 4 palabras o menos. Se espera que queden entre 8 y 12.

**Validador.** Una promoción es ordenable si tiene tarjeta, vigencia, días y canal. Si es presencial, sus sucursales deben existir y participar; si es delivery, su comercio debe declarar cobertura. Las demás quedan fuera con su motivo, y un vector vacío solo genera un aviso.

## Perfil: registro de señales

El perfil guarda hechos, nunca puntajes. Anclas, afinidad, sensibilidad y comportamiento se recalculan al ordenar, así que quitar algo borra todo lo que se derivaba de ello.

| Clase | Ámbito | Efecto en el motor |
| --- | --- | --- |
| interés | categoría | C = 1 y alcance de Para ti |
| interés | subcategoría | Ancla de confianza 1 (categorías sensibles) |
| interés | comercio | M = 1, C = 1 para sus ofertas y ancla de confianza 0.6 |
| interés | ocasión | Ancla de confianza 1 |
| criterio | canal, beneficio, precio, descubrir o zona | Sensibilidad declarada (s = 1) o indiferencia declarada (s = 0) |
| rechazo | oferta, comercio o categoría | Ver «Explicaciones y correcciones» |
| guardada | oferta | G dentro de B |

Cada señal guarda su origen (encuesta, pregunta en contexto o acción en una tarjeta), su fecha y si está activa. Quitar es marcarla inactiva; deshacer es reactivarla.

Las interacciones van en un registro aparte: impresiones con instantánea y posición, aperturas, guardar y quitar, e impresiones de encuesta, es decir, qué opciones vio la persona. Una inferencia nunca se escribe como señal.

## Similitud

A mide cuánto se parece una promoción a lo que la persona eligió. Usa un vector con las 11 ocasiones más una columna por subcategoría, que vale 1 solo para la propia.

```latex
\cos(x, a) = \frac{\sum_d x_d\, a_d}{\sqrt{\sum_d x_d^2}\ \sqrt{\sum_d a_d^2}}
```

| Ancla | Vector | Confianza |
| --- | --- | --- |
| Comercio elegido | El del comercio | 0.6, porque elegir una marca no confirma todos sus productos |
| Subcategoría elegida | Solo su columna | 1 |
| Ocasión guardada | Solo esa ocasión | 1 |

La categoría no es ancla, porque ya actúa como C. Las guardadas tampoco: una oferta guardada no se vuelve un gusto permanente.

```latex
A_{directa} = \max_k \left( \text{confianza}_k \cdot \cos(x, a_k) \right), \qquad A = \min(1,\ A_{directa} + 0.15\,J)
```

Se usa el máximo y no el promedio: el promedio de dos gustos distintos no se parece a ninguno. Con el máximo, agregar un gusto nunca baja la afinidad de otro.

**Puente (J).** J vale 1 si se cumple una relación de la tabla: dos intereses declarados de categorías distintas y un candidato con la ocasión requerida en 0.5 o más. Se suma una sola vez, y la tabla solo guarda relaciones que el vector no expresa bien.

Ejemplo: frente a un gimnasio elegido, un restaurante saludable comparte solo «bienestar». Su coseno es 0.47 y su A, 0.28, debajo del umbral de pertinencia de 0.35. Si la persona también declaró Restaurantes y existe la relación, A sube a 0.43.

Las similitudes entre cada promoción y cada ancla posible se precalculan cuando cambia el catálogo.

## Criterios ponderativos

Los criterios no comparan dos ofertas entre sí: comparan una oferta con lo que prefiere la persona y la ajustan con un factor.

```latex
f_k = 1 - s_k \cdot \text{desajuste}_k, \qquad F = \max\left(0.5,\ \prod_k f_k\right)
```

F vale 1 cuando la persona eligió el comercio, porque su elección no se corrige. El piso de 0.5 hace que los criterios reordenen sin esconder.

| Criterio | Atributo | Desajuste | s declarada | s inferida |
| --- | --- | --- | --- | --- |
| Precio | nivelPrecio, de 1 a 3 | Distancia al nivel objetivo ÷ 2 | 1 con «Priorizar opciones económicas» (objetivo: 1) | n/(n+3) × (1 − dispersión) (objetivo: nivel habitual) |
| Canal | canales | 0 si vale en el canal preferido; 1 si no | 1 al elegir un canal; 0 con «De todo un poco» | No se infiere |
| Tipo de beneficio | tipoBeneficio | 0 si es uno de los preferidos; 1 si no | 1 al elegir hasta 2; 0 con «Me da igual» | No se infiere |

Para el precio inferido, n es el número de comercios elegidos con nivel, el nivel habitual es su mediana y la dispersión es (máximo − mínimo) ÷ 2. Con 2 comercios del mismo nivel, s = 0.4; con 6, s = 0.67.

«Sin dato» y «Me da igual» valen s = 0, pero solo «sin dato» se puede preguntar después. La sensibilidad al precio inferida nunca aparece en una explicación (R-INF-02). Si una promoción cambia el precio efectivo, su nivelPrecio propio sobrescribe el del comercio.

Dos criterios actúan fuera de F. «Apertura a descubrir» regula la exploración (ver «Reordenamiento y exploración») y la zona alimenta la distancia en Cerca de ti.

El mercado local mezcla estos tipos de beneficio: descuentos por día, compras en cuotas, acumulación y cashback en apps de delivery. Ejemplos: [BAC](https://www.baccredomatic.com/es-sv/personas/promociones), [BAC y Walmart](https://www.baccredomatic.com/es-sv/personas/landing/promociones-walmart) y [Cuscatlán con PedidosYa](https://diario.elmundo.sv/empresarial/banco-cuscatlan-visa-y-pedidosya-lanzaron-innovadora-tarjeta-de-credito-con-beneficios-para-el-delivery-y-el-ahorro).

## Puntaje

El orden personalizado sale de una sola fórmula. Su máximo es 95 y expresa una prioridad, no una probabilidad.

```latex
R = F \cdot \left(20C + 45\max(M,\ 0.65A)\right) + 15B + 15T
```

| Componente | Valor | De dónde sale |
| --- | --- | --- |
| C | 0 o 1 | 1 si la categoría está declarada o si M = 1 |
| M | 0 o 1 | 1 si la persona eligió el comercio |
| A | 0 a 1 | Similitud más puente (ver «Similitud») |
| F | 0.5 a 1 | Criterios (ver «Criterios ponderativos») |
| B | 0 a 1 | mín(1, G + V + O) |
| T | 0 o 1 | 1 si coincide con un «Hoy busco» activo |

B suma tres partes. G vale 0.6 si la promoción sigue guardada. V suma 0.05 por cada día con apertura manual, con semivida de 14 días y tope de 0.25. O suma 0.10 por cada otra guardada del mismo comercio, con la misma semivida y tope de 0.15. Recargar o repetir eventos no suma.

T viene de los chips «Hoy busco» de Para ti: ocasiones y etiquetas como «Regalo». Reordenan sin filtrar y nunca cambian el perfil.

Con peso 15 para B, un comercio no elegido llega como máximo a 20 + 29.25 + 15 = 64.25. Eso queda debajo de los 65 de uno elegido con la misma T, así que lo declarado siempre manda.

**Estrategia base.** Usa las mismas etapas de elegibilidad y alcance, ordena por fecha de alta y permite como máximo 2 ofertas por comercio en los primeros 5. No lee comercios elegidos, vectores, criterios ni comportamiento.

**Parámetros iniciales.** Viven en un archivo de configuración versionado, y cada instantánea registra su versión.

| Parámetro | Valor |
| --- | --- |
| Pesos de C, del bloque M/A, de B y de T | 20, 45, 15 y 15 |
| Factor de A frente a M | 0.65 |
| Confianza de ancla: comercio, subcategoría y ocasión | 0.6, 1 y 1 |
| Puente | +0.15, uno por candidato |
| Piso de F | 0.5 |
| Freno del precio inferido | n/(n+3) |
| G, V y O | 0.6; 0.05 con tope 0.25; 0.10 con tope 0.15 |
| Semivida de V y O | 14 días |
| Umbral de pertinencia | A ≥ 0.35 |

## Reordenamiento y exploración

El puntaje decide la prioridad; el reordenamiento evita que la lista se llene de lo mismo.

1. Agrupar: cada oferta aparece una vez. En Cerca de ti, lo hace con su sucursal participante más cercana.
2. Armar la lista posición por posición, eligiendo el mayor valor ajustado: R − 15 × similitud máxima con las ya colocadas − 20 si su comercio ya está en los primeros 5.
3. Limitar a 2 ofertas por comercio en los primeros 5, si existen alternativas pertinentes.
4. Asegurar que cada categoría declarada con candidatos pertinentes aparezca en los primeros 6.
5. Reservar huecos de exploración para la oferta pertinente nunca vista con mayor R. Si no existe, el hueco se libera.

Pertinente significa C = 1, M = 1, A ≥ 0.35 o que responde a un filtro explícito. Los empates se resuelven por este orden: aplica hoy, cobertura confirmada, fecha de alta más reciente e id.

| Apertura a descubrir | Huecos de exploración |
| --- | --- |
| Mis lugares de siempre | Posiciones 10, 20, 30… |
| Un poco de todo (o sin dato) | Posiciones 5, 10, 15… |
| Lugares nuevos | Posiciones 3, 6, 9… |

## Secciones

Las tres vistas usan el mismo motor; solo cambian el alcance, el canal y la clave de orden.

| Sección | Alcance | Orden | Extras |
| --- | --- | --- | --- |
| Para ti | Categorías declaradas y las de comercios elegidos; con perfil vacío, todo lo elegible | R y reordenamiento | Franja «Hoy», fila «Te podría gustar» y «Ver todas», que quita el alcance |
| Cerca de ti | Sucursales participantes a 3 km o menos, dentro del alcance; si no hay, lo más cercano de otras categorías, etiquetado | D × (0.2 + 0.8 × R / 95) | Sin ubicación, se elige una zona |
| A domicilio | Canal delivery o en línea, con cobertura «sí» o «desconocida» (marcada) | R; a igual R, cobertura confirmada primero | «Consultar cobertura» |

D vale 1 hasta 500 m y baja de forma lineal hasta 0.2 a 3 km. El término 0.2 hace que, con R = 0, Cerca de ti ordene por distancia en lugar de empatar.

La franja «Hoy» dice cuántas promociones del alcance aplican hoy. «Te podría gustar» muestra hasta 3 ofertas de categorías no declaradas con A ≥ 0.35. «Nuevas para ti» aparece solo si hay promociones dadas de alta después de la última visita.

Los estados vacíos se distinguen por el motivo de descarte: sin catálogo para la tarjeta, filtros demasiado estrictos, nada dentro del radio o error de carga, este último con reintento.

## Explicaciones y correcciones

Cada tarjeta muestra una sola razón: la del término que más aportó a su puntaje.

| Término dominante | Texto |
| --- | --- |
| M | «Porque elegiste {comercio}» |
| C | «Por tu interés en {categoría}» |
| A, sin puente | «Parecida a {ancla}» |
| A, con puente | «Para descubrir por tus intereses en {A} y {B}» |
| G | «La guardaste» |
| T | «Por lo que buscas hoy» |
| Hueco de exploración | «Para descubrir» |

Los criterios nunca son razón. Uno declarado se muestra como insignia, por ejemplo «A domicilio», y uno inferido no se menciona.

| Acción | Señal | Efecto | Deshacer |
| --- | --- | --- | --- |
| «No me interesa esta promo» | rechazo · oferta | Sale de las recomendaciones; en filtros y búsqueda aparece marcada | En la misma tarjeta |
| «Más de este comercio» | interés · comercio | M = 1 y ancla | En la misma tarjeta |
| «Menos de este comercio» | rechazo · comercio | Si estaba elegido, pierde M y su ancla; si no, su R se multiplica por 0.3 | En la misma tarjeta |
| Excluir categoría | rechazo · categoría | Sale de las tres vistas; un filtro explícito la abre en esa consulta | En «Tus intereses» |

Tres «Menos» en una misma categoría disparan la pregunta en contexto para excluirla.

## Preguntas en contexto

Después de la encuesta, el perfil crece con una pregunta por visita como máximo: la primera de esta tabla cuyo disparador se cumpla.

| Prioridad | Disparador | Pregunta | Señal |
| --- | --- | --- | --- |
| 1 | Abrir Cerca de ti sin ubicación | «¿Qué zona te queda mejor?» | criterio · zona |
| 2 | 3 «Menos» en una misma categoría | «¿Dejamos de mostrarte {categoría}?» | rechazo · categoría |
| 3 | 3 aperturas en 14 días de una categoría no declarada | «¿Agrego {categoría} a tus intereses?» | interés · categoría |
| 4 | El mismo «Hoy busco» en 3 visitas | «¿Guardo {ocasión} como interés?» | interés · ocasión |
| 5 | Canal o beneficio sin dato tras 5 visitas | La fila correspondiente de la encuesta | criterio |

Una pregunta rechazada no vuelve en 30 días, y lo marcado como «Me da igual» no se vuelve a preguntar. El precio no se pregunta: si la s inferida llega a 0.4, el control «Priorizar opciones económicas» se destaca en los filtros.

## Ejecución y validación

El motor es una función pura que corre en el backend. La vista previa de la encuesta usa el mismo paquete en el cliente.

**Instantánea.** Cada sección guarda su orden por visita, junto con la versión de configuración. Se recalcula al iniciar una visita (primer plano tras 30 minutos o cambio de día), al confirmar intereses, al cambiar tarjeta o filtros y al pedir actualizar. Nunca se recalcula mientras la persona lee o vuelve del detalle.

Si una promoción vence durante la visita, conserva su lugar con la etiqueta «Vencida».

**Registro.** Cada impresión guarda la instantánea y la posición; sin eso no se puede separar el interés de la exposición.

**Invariantes que deben pasar siempre**

1. Nada no elegible aparece.
2. Agregar un ancla nunca baja A.
3. B no supera 1, aunque un evento se repita.
4. Un perfil vacío devuelve todo lo elegible.
5. Un comercio no elegido nunca supera a uno elegido con la misma T.
6. F nunca baja de 0.5 ni afecta a un comercio elegido.
7. Descartar una oferta no retira otras de su categoría.
8. Un filtro explícito nunca se altera.
9. La misma entrada produce el mismo orden.
10. Toda razón corresponde a un término mayor que cero.

**Despliegue por fases.** Cada fase debe ganar a ciegas a la anterior, con el protocolo del documento «Prototipo externo».

| Fase | Activa | Se apaga si |
| --- | --- | --- |
| 1 | Elegibilidad, alcance, estrategia base, instantánea y registro | — |
| 2 | C, M, correcciones, variedad y explicaciones | No gana a ciegas a la fase 1 |
| 3 | A, puentes, F y B | No gana a ciegas a la fase 2 |

**En producción** se miden guardadas por impresión, «No me interesa» por impresión, regreso voluntario a las guardadas y correcciones en los primeros 7 días. Más clics o más tiempo en pantalla no cuentan como mejora.

## Faltas corregidas y fuera de la beta

Esta revisión cierra 13 huecos y ambigüedades detectados al juntar «Principios», «Reglas» y las decisiones posteriores.

| Falta o ambigüedad | Corrección |
| --- | --- |
| Los criterios solo multiplicaban A; sin comercios elegidos no tenían efecto | F multiplica C y A |
| Un criterio podía anular por completo una oferta | Piso de F en 0.5 |
| Un comercio elegido fuera de las categorías declaradas quedaba en 45 | M = 1 implica C = 1 para sus ofertas, y su categoría entra al alcance |
| El comportamiento podía superar a lo elegido (69.25 frente a 65) | Peso de B en 15 |
| En Cerca de ti, con R = 0 todo empataba | Clave con piso: D × (0.2 + 0.8 × R / 95) |
| La exploración era igual para todos | Depende de «apertura a descubrir» |
| La intención del día se confundía con los filtros | Los filtros restringen; «Hoy busco» solo reordena |
| El precio dentro del vector no premiaba coincidencias | Nivel aparte, usado como criterio |
| Salud podía generar sugerencias en otras categorías | Comercios sensibles con ocasiones vacías |
| «Sin dato» y «Me da igual» eran indistinguibles | Ambos valen s = 0, pero solo «sin dato» se pregunta |
| Las guardadas se volvían gustos permanentes | Solo alimentan B |
| Una oferta oculta desaparecía también de la búsqueda | Solo sale de las recomendaciones |
| Una oferta vencida durante la visita reordenaba la lista | Conserva su lugar con «Vencida» |

**Fuera de la beta:** notificaciones, tasas de apertura con impresiones (cuando haya volumen), elegir preguntas simulando su cambio en el top 10, precio efectivo con la promoción aplicada y ubicación precisa permanente.
