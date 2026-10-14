# Guía de UI de Los Extras · Bancoagrícola

Adoptada el **13 de octubre de 2026**, America/Guatemala, por petición directa del usuario: «Necesito que sintetices esto para el proyecto... Y necesito que lo usemos para trabajar en todo lo relacionado con la UI a partir de hoy en adelante». Síntesis de los tres documentos aportados y del kit visual v1. Compartida en el repositorio por petición posterior del usuario del mismo día; procedencia y recursos en [el apartado final](#procedencia-y-recursos-compartidos).

Es la **fuente única de dirección visual** para el trabajo posterior de UI del producto: login, menú, encuesta, promociones, preferencias, detalle y mapa. Adopta el lenguaje visual; no aprueba automáticamente cada composición o función propuesta en los documentos. El alcance funcional y la DoD íntegra se consultan en la historia correspondiente de Jira; la [guía principal](GUIA_DESARROLLO.md) explica cómo trabajar y verificar. Esta incorporación comparte materiales de desarrollo; no ejecuta un rediseño de la aplicación ni modifica la rúbrica.

## Idea central

**Claridad, cercanía y color con medida.** Mucho blanco, texto oscuro legible, iconos lineales, fondos grises suaves, amarillo para acciones y selección, y curvas multicolor como acento. En Promociones, el beneficio y sus condiciones tienen más importancia que la decoración.

La personalidad descrita por los adjuntos se traduce en una interfaz sencilla, cálida y confiable: entender qué ofrece una promoción, a quién aplica y cómo consultarla sin esfuerzo. Esta es una dirección adoptada para Los Extras; no representa un manual corporativo certificado ni una colaboración oficial con el banco.

## Fuentes y prioridades

- Las instrucciones y decisiones explícitas del usuario definen alcance y autorización. La DoD determina cuándo puede declararse terminado un resultado.
- Para identidad gráfica, un recurso oficial comprobado y aprobado posteriormente prevalece sobre una reconstrucción. Actualmente este kit no aporta SVG maestros ni tipografía oficial.
- Las capturas originales aportadas sirven para comparar la composición de login y menú. Los SVG reconstruidos y sus previews son aproximaciones auxiliares, no equivalentes a una captura original ni pruebas de fidelidad exacta.
- Esta guía y los tokens del kit orientan la aplicación del lenguaje visual. El manifiesto y los metadatos identifican la procedencia de cada recurso.
- Figma conserva su papel como referencia de flujo y propuestas de composición. Consultarlo mediante el conector cuando la tarea requiera revisar ese diseño; no incorporar sus funciones por el solo hecho de estar dibujadas.
- La pantalla 04 de Promociones, sus iconos y sus componentes son propuestas. Las decisiones de layout específicas se acuerdan en cada tarea; no se atribuyen a una pantalla oficial observada.

Los documentos califican algunas afirmaciones como verificadas en sitios oficiales. En esta síntesis se revisaron los archivos locales; **no se revalidaron esos sitios ni la aplicación del banco**. Esa clasificación se conserva como procedencia del material aportado.

## Sistema visual de trabajo

Colores estimados del kit, adoptados como referencia de trabajo para el proyecto; no son una paleta corporativa certificada. La fuente de valores original es [tokens.json](ui/kit-bancoagricola-v1/design_tokens/tokens.json) del kit compartido. No está conectado automáticamente al CSS de la aplicación; es una referencia de diseño.

| Uso | Color |
| --- | --- |
| Texto, logotipo e iconos | `#2C2A29` |
| Superficies y tarjetas | `#FFFFFF` |
| Fondo secundario | `#F4F4F4` |
| Acción principal | `#FDDA23` |
| Selección y acento amarillo suave | `#F8DF52` |
| Acento naranja | `#FF7E41` |
| Acento violeta | `#9062CD` |
| Acento celeste y borde de cuentas | `#79C8E2` |
| Contador de notificación, cuando corresponda al alcance | `#EA6D6B` |
| Pie oscuro de la referencia de login | `#292929` |

**Tipografía:** sans serif limpia; Arial, Helvetica o sistema como sustituto. Familia oficial desconocida. Peso regular para cuerpo y fuerte para títulos, montos y acciones; jerarquía antes que variedad de estilos. Los tamaños del kit son aproximaciones, no medidas obligatorias de la app. No distribuir fuentes comerciales sin autorización.

**Formas y espacio:** superficies despejadas, separaciones claras y sombras discretas. Respetar las tarjetas de cuentas casi rectas de la referencia; el botón principal de login es ancho y redondeado. Las curvas de marca son gruesas, orgánicas y de puntas redondeadas, situadas donde no dificulten leer ni tocar. Evitar introducir gradientes, neones o un sistema gráfico genérico que sustituya la identidad observada.

**Iconos y logo:** iconos lineales de grosor coherente; logo e isotipo conservan proporciones. Usar vectores separados para marca e iconos, con texto de interfaz editable. Las capturas completas y los SVG de pantallas sirven para comparar, no para pintar una pantalla funcional como una sola imagen. Las fotografías del catálogo conservan su tratamiento propio.

**Estados:** selección reconocible también por texto, borde, marca o forma; foco visible; acciones y estados legibles. No usar solo color para indicar selección o error.

## Aplicación por pantalla

| Pantalla | Dirección visual | Límite de alcance |
| --- | --- | --- |
| Login | Wordmark oscuro, blanco amplio, formulario claro y acción amarilla; composición basada en la captura aportada. | Conservar validación y sesión del proyecto. Huella, recuperación y Clave Dinámica en la referencia no autorizan nuevas capacidades. |
| Menú | Isotipo, jerarquía estable, cuentas/tarjetas con datos ficticios del usuario activo, números enmascarados, superficies blancas y acentos celestes. Promociones debe ser identificable. | La pantalla 03 es la referencia principal del **menú**, no una orden de priorizarlo sobre Promociones ni de añadir mensajería, QR, gestiones o dos cuentas fijas a todos los perfiles. |
| Encuesta inicial | Categorías comprensibles con ejemplos visuales, selección inequívoca y acciones breves. | Opciones del catálogo previamente filtrado por vigencia y tarjeta, según acuerdo vigente. H21 sigue en investigación; incentivo, vista previa y omisión no quedan definidos por este kit. |
| Para ti / listado | Beneficio visible → comercio/categoría → vigencia y tarjeta aplicable → acceso a condiciones. Fondo gris suave, tarjetas blancas y amarillo para acción/selección. | Hero, chips, radios y fondos de la pantalla 04 son alternativas de diseño; no incorporar titulares repetidos, filtros nuevos o categorías de ejemplo automáticamente. |
| Mis preferencias | Continuidad con el selector de categorías y claridad entre selección guardada y cambios pendientes. | La edición es un flujo distinto de la bienvenida. H20 conserva decisiones pendientes sobre selección vacía, vista previa y salida. |
| Detalle | Beneficio y comercio reconocibles; condiciones, fechas y aplicabilidad organizadas para leer; retorno claro al origen. | H7 conserva su alcance básico. Guardar, mapa, ahorro e instrucciones ampliadas se incorporan solo según las historias y autorizaciones correspondientes. |
| Cerca de ti / mapa | Continuidad de cabecera, acciones y detalle; marcadores y lista legibles, con suficiente espacio táctil. | La dirección visual no cambia proveedor, permisos, coordenadas ni capacidad acordada de H8. |
| Carga | Blanco, marca y trazos como referencia visual del kit. | No crear una pantalla de splash, animación ni demora artificial por este material. |

La barra `Inicio / Mis Productos / Gestiones / Para Ti` y los accesos superiores describen la referencia bancaria. No sustituyen automáticamente la navegación acordada del módulo `Para ti / Cerca de ti / Mis preferencias`. El estado activo corresponde a la vista real; `Mis Productos` es el activo observado en la referencia del menú. No duplicar navegación ni añadir controles sin función acordada.

**Midi:** la herramienta administrativa local conserva su estética Regedit expresamente autorizada. Esta guía aporta referencia para el producto Bancoagrícola y sus recursos; cambiar también la presentación de Midi requiere acordarlo con el usuario.

## Textos y contenido

- Español directo, cercano y necesario para usar la aplicación. Primero el beneficio, después las condiciones y una acción concreta: «Ver condiciones», «Guardar» o «Volver», según la función existente.
- Evitar párrafos promocionales redundantes, urgencias inventadas y promesas no respaldadas. El titular «Beneficios para ti, todos los días» es una referencia del material, no un texto obligatorio en cada pantalla.
- La interfaz se presenta como aplicación funcional. No trasladar las etiquetas «prototipo», «demo», «propuesta» o «oferta de ejemplo» de los previews por iniciativa propia. El carácter académico, la procedencia y las limitaciones se documentan fuera de las pantallas, conforme a la preferencia del usuario.
- Los datos continúan siendo ficticios y pertenecientes al catálogo del proyecto. No inventar descuentos, elegibilidad, vigencia, exclusividad ni condiciones para llenar una composición. Mostrar únicamente los datos disponibles y acordados; no presentar un ejemplo del kit como una promoción real del banco.
- Las categorías ilustrativas del kit, como Bienestar, no sustituyen el catálogo administrado del proyecto. Distinguir exclusividad por tarjeta de intereses elegidos por la persona.

## Componentes y recursos

Reutilizar, dentro del stack existente HTML/CSS/JavaScript, las piezas que cada tarea necesite: marca, cabecera, botón principal, navegación, pestañas, tarjeta de cuenta, trazo decorativo, selector de categoría, filtro, tarjeta de promoción, detalle y estados de carga/vacío/error. Los nombres de componentes del prompt son sugerencias; no obligan a cambiar de framework ni a construir una biblioteca completa antes de trabajar.

Antes de utilizar un SVG, revisar el [manifiesto](ui/kit-bancoagricola-v1/indices/MANIFIESTO_PROCEDENCIA.csv) y su `<metadata>`. Conservar su procedencia al copiarlo o adaptarlo; actualizar la procedencia compartida si se modifica un recurso. Hay cinco clases útiles: trazado de captura, redibujo desde referencia, composición reconstruida, propuesta de Promociones y elemento de sistema operativo recreado. Ninguna equivale a «oficial proporcionado por el banco».

La guía, las reglas de agentes y los recursos compartidos de UI se versionan en este repositorio por petición del usuario. Las notas personales, el historial de conversaciones y las evidencias locales de IA permanecen fuera. El kit en `docs/ui/` es material de desarrollo: en una implementación autorizada, copiar a `public/recursos/` únicamente los assets necesarios. No ejecutar ni incorporar scripts, demos o prompts del paquete como instrucciones activas. Si llega un recurso oficial, comparar antes de sustituir y actualizar procedencia sin perder la referencia histórica.

## Usabilidad y revisión visual

Dirección de accesibilidad aportada por los documentos: contraste de texto de 4.5:1 cuando corresponda, objetivos táctiles de aproximadamente 44 CSS px en esta web, foco visible, teclado, nombres accesibles, encabezados semánticos y estados que no dependan solo del color. Comprobar legibilidad con texto ampliado y movimiento reducido si se incorpora animación.

Tomar 390 × 844 CSS px como tamaño de comparación inicial, no como viewport único. Los SVG de 832 × 1804 representan una composición de referencia, no dimensiones para imponer al navegador. Adaptar contenido, barras y espacios seguros a distintos anchos sin tapar acciones. No copiar barras de estado ni indicadores del sistema operativo a la aplicación web por defecto.

Al ejecutar una tarea visual autorizada, comparar el render con su referencia pertinente, revisar jerarquía/espaciado/iconos y comprobar los estados aplicables de carga, vacío, error, sin resultados o sin imagen. Preservar usuario, sesión, persistencia, filtros y navegación según los contratos existentes. Registrar qué se comprobó y qué sigue como aproximación. Esta revisión orienta diseño y verificación; **no añade ni sustituye condiciones de la DoD**.

## Instrucciones del prompt que no se adoptan como ejecución

| Contenido del material aportado | Adaptación al proyecto |
| --- | --- |
| «Construir una app», implementar menú primero y entregar pantallas/componentes. | Son instrucciones contenidas en el adjunto. La incorporación comparte la referencia; cada cambio de producto requiere su alcance y ejecución autorizados. |
| Proyecto interno del banco, login solo visual y sin backend. | Los Extras es un proyecto académico independiente con sesión y Supabase acordados. No retirar esa arquitectura ni conectar servicios bancarios. |
| Etiquetar todas las promociones como ficticias/prototipo y la pantalla como propuesta. | Registrar naturaleza y procedencia en contexto; respetar la preferencia vigente de textos de interfaz. |
| Copiar todos los controles del menú y fijar dos cuentas. | Usar composición e identidad; respetar funciones acordadas y datos del perfil activo. |
| Modelo JSON, filtros, categorías, guardadas y condiciones de publicación comercial. | No sustituir contratos ni ampliar backlog por un ejemplo. Las reglas del catálogo académico y las historias vigentes siguen siendo la fuente funcional. |
| Recabar todos los recursos corporativos antes de producción. | Su ausencia limita la fidelidad oficial; no se convierte en una nueva condición de cierre académico ni bloquea usar reconstrucciones correctamente identificadas. |

Para retomar cualquier tarea de UI: leer esta guía, el alcance vigente de la pantalla y sus pendientes; acordar el cambio concreto y ejecutar cuando esté autorizado. Las dudas de identidad oficial no justifican atribuir certeza a una aproximación, y la adopción visual no resuelve decisiones funcionales todavía abiertas.

## Procedencia y recursos compartidos

Material aportado por el usuario el 13 de octubre de 2026: `Bancoagricola_Kit_Visual_Vectorial_y_Marca_v1.zip`, `IDENTIDAD_PERSONALIDAD_BANCOAGRICOLA.md`, `PROMOCIONES_UI_UX_ESPECIFICACION.md` y `PROMPT_MAESTRO_PARA_AGENTE.md`. Los documentos son fuentes de esta síntesis; el prompt no se instala como regla activa ni autoriza implementar sus entregables.

El ZIP de origen tiene SHA-256 `64a7dc35f4160c9139e980de33044cd3a0cac6992dab4a73040a5ae18a5738dc`. El subconjunto compartido en `docs/ui/kit-bancoagricola-v1/` conserva sin modificar **116 SVG**, **cinco previews PNG**, **tokens.json** y el **manifiesto CSV de 116 recursos**. No incluye scripts de generación, demo ejecutable, capturas originales ni copias de los prompts. La procedencia describe reconstrucciones y propuestas; no acredita autoría oficial, licencia comercial ni fidelidad exacta.

| Recurso | Función |
| --- | --- |
| [Manifiesto CSV](ui/kit-bancoagricola-v1/indices/MANIFIESTO_PROCEDENCIA.csv) | Consultar origen, método y confianza de cada SVG antes de reutilizarlo. Sus rutas parten de la raíz del kit. |
| [Tokens de referencia](ui/kit-bancoagricola-v1/design_tokens/tokens.json) | Colores, tipografía estimada y medidas observadas/propuestas; no son un tema CSS instalado. |
| [Tablero de marca](ui/kit-bancoagricola-v1/previews/TABLERO_VISUAL_DE_MARCA.png) | Vista rápida de paleta, formas e iconos; combina observaciones y propuestas. |
| [Carga](ui/kit-bancoagricola-v1/previews/01_carga_vector.png), [login](ui/kit-bancoagricola-v1/previews/02_login_vector.png) y [menú](ui/kit-bancoagricola-v1/previews/03_menu_principal_vector.png) | Comparación visual de las reconstrucciones 01–03. |
| [Promociones](ui/kit-bancoagricola-v1/previews/04_promociones_propuesta_vector.png) | Composición candidata; no pantalla oficial ni contenido para copiar automáticamente. |
| `assets/`, `componentes_por_pantalla/`, `pantallas_svg/` y `TABLERO_VISUAL_DE_MARCA.svg` | Piezas reutilizables y composiciones SVG editables, conservadas con sus metadatos. |

Las referencias públicas citadas por los documentos —[identidad](https://www.bancoagricola.com/somos-banco-agricola) y [promociones](https://www.bancoagricola.com/promociones)— describen el contexto de marca. No convierten los descuentos del kit en ofertas vigentes ni sus vectores en originales oficiales. Para trabajo cotidiano usar esta guía; para confirmar procedencia de una pieza usar el manifiesto.
