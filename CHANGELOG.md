## v6.6.0

- Llaves Face to Face: cards estandarizados con el mismo diseño visual de la vista Continua.
- Llaves Continua y Face to Face: label Ganador y nombre del ganador en azul claro.
- Face to Face: card de Campeón/Ganador debajo de la Final con separación aproximada de 3 cm.
- PDF Face to Face: sizing reducido aproximadamente 12% para mejorar salida de una sola página.
- Grand Dashboard: agregado card de versión actual de plataforma.
- Planillas PDF: plantilla base incluye nombre del campeonato y renglones superiores más anchos.
- README reestructurado con historial completo y comandos actualizados.


## v6.5.0

- Planillas PDF: se restaura la primera planilla en blanco como plantilla base del torneo.
- Planillas PDF: se aísla completamente el área de impresión para que no aparezcan tabs, menús ni controles de ProV en la primera página.
- Planillas PDF: ajuste de tamaño, centrado horizontal y vertical operativo para una planilla por página en Carta.
- Llaves Face to Face: rediseño de posicionamiento central mediante layout absoluto para mover Final y Campeón desde la zona inferior hacia el centro superior solicitado.
- Llaves Face to Face: conectores centrales recalculados para enlazar Semis con la Final en la nueva posición.

## v6.4.0

- Agregados scripts de inicio local y autoarranque para evitar confusión por servidor local detenido (`localhost refused to connect`).
- Corregida generación de planillas: sin hoja en blanco inicial, centrado horizontal/vertical, una página por planilla en tamaño Carta.
- Reubicada la Final y el Campeón en Face to Face hacia la zona superior solicitada, manteniendo conectores desde Semis.
- Ajustado cierre/acta para campeonatos con Control de Promedios = No.

## v6.3.0

- ProV: ajustes de tabs en modo oscuro, links en Grand Dashboard/Ranking y mejoras del Dashboard de campeonato.
- Face to Face: reposicionamiento dinámico de Final y campeón, conectores centrales y PDF al 85% relativo.
- Estabilidad SPA local con hash navigation para refresh/forward/back.
- Control de Promedios configurable por campeonato y planillas PDF con sizing reducido.

## v6.2.0

- Correcciones ProV de modo oscuro, tabs, Grand Dashboard y Dashboard de campeonato.
- Enlaces operativos desde gráficos y ranking a dashboards/reportes/historial.
- Bloqueo de Setup posterior a clasificación/cierre en todas las interfaces.
- Face to Face: Final y campeón reposicionados; PDF ajustado a una página.
- Nueva funcionalidad Doble Fase Grupos con tab Grupos F2 y flujo de clasificación hacia KO.


## v6.1.0

- Interface ProV: Wizard en overlay modal, con opciones SELECTIVO e INTERNACIONAL en División.
- Interface ProV: tabs del campeonato rediseñados como flechas de proceso y sticky durante scroll.
- Dashboard de campeonato: AVG acumulado por fase reducido 25%, reubicado al final después de agenda/lista; agregada lista de partidas pendientes.
- Grand Dashboard: gráfica de campeonatos con más jugadores inscritos usando nombres reales.
- Ranking: dashboard con Top 10, participantes por campeonato asociado y AVG general por campeonato asociado.
- Campeonatos: botón Abrir habilitado para campeonato activo y navegación directa al Dashboard.
- Llaves Face to Face: margen superior compactado, conectores Semis→Final corregidos, PDF ampliado y card de campeón más bajo.


## v6.0.0

- Nueva Interface ProV como interface predeterminada de apertura.
- Se mantienen tres interfaces seleccionables: Interface ProV, Interface IA e Interface Clásica.
- La preferencia de interface se recuerda en localStorage.
- Nuevo Grand Dashboard con estadísticas acumuladas, gráficos de AVG, top 7 de jugadores por AVG y campeonatos con más inscripciones.
- Menú Campeonatos filtra únicamente campeonatos tipo Normal.
- Menú Ranking filtra únicamente campeonatos tipo Ranking.
- Módulos operativos del campeonato convertidos en tabs en el panel derecho: Dashboard, Campeonato, Grupos, Calendario, Partidas, Llaves y Cierre.
- Wizard guiado para creación de campeonatos normales.
- Wizard guiado simplificado para creación de campeonatos Ranking sin asociación manual de jugadores.
- Dashboard de campeonato con gráfica de AVG general acumulado por fase.
- Llaves Continua y Face to Face con Zoom In/Zoom Out independiente de la aplicación.
- Face to Face ajustado para acercar margen superior y encabezados de columnas a la visualización Continua.
- README reestructurado con historial consolidado de versiones y cambios.
- package.json actualizado a 6.0.0.


## v5.9.0

- Nueva interface UX guiada opcional, con navegación agrupada por flujo real de operación.
- Se mantiene la interface clásica sin eliminarla; el usuario puede alternar entre la nueva UX y la anterior desde el topbar o menú lateral.
- Dashboard convertido en centro de control con siguiente acción recomendada, alertas, stepper operativo, catálogo de reportes y checklist de cierre.
- Modo Ranking con banner explicativo y comportamiento guiado para evitar confundir ausencia de menús con errores.
- Se incorpora base técnica `DataTableCarom` para estandarizar tablas futuras con búsqueda, ordenamiento, densidad y CSV.
- Se agregan estilos responsive para nueva navegación, panel contextual y componentes UX sin modificar el flujo clásico existente.


## v5.8.0

- Llaves Face to Face: compactación vertical superior para acercar encabezados de columnas a la geometría de la visualización continua.
- Llaves Face to Face: conectores centrales visibles entre Semis y Final; card de campeón bajado un poco más debajo de la Final.
- PDF Face to Face en modo Todo 1 Página: escala ampliada ~20% y mejor aprovechamiento del espacio superior.
- Ranking: celda de jugador reorganizada con nombre/historial y asociación en bloque izquierdo, bandera alineada a la derecha.
- Ranking PDF: columnas resumen de campeonatos referenciadas como C1, C2, etc., con detalle por campeonato rotulado del mismo modo.
- Ranking resumen por campeonato ajustado a PRG, CAR, ENT, AVG y Pos#.

# v5.7.0 - 2026-05-18

- Ajustada la visualización Face to Face para bajar la Final y evitar que se vea pegada a semifinales.
- Reubicado el card de Campeón/Ganador debajo de la Final con conector vertical.
- Ampliada la escala del PDF Face to Face en modo Todo 1 Página para reducir espacio en blanco y mejorar legibilidad.
- Mejorada la tabla Ranking: columna Jugador con historial clicable, asociación y bandera del país alineadas.
- Corregido Ranking para incluir únicamente jugadores participantes en campeonatos normales asociados.
- Ajustado campeonato tipo Ranking para no requerir selección/asociación de jugadores.
- package.json actualizado a `5.7.0`.

# v5.6.0 - 2026-05-18

- Reconstruida la visualización Face to Face con árbol de asociaciones, conectores SVG y posicionamiento derivado de la lógica continua.
- Corregida la integración visual de R0 como ronda alimentadora de Dieciseisavos/Octavos según corresponda.
- Ranking actualizado para mostrar PRG en rojo en todos los puntos donde aparece.
- Ranking ahora muestra PRG, PJ, PG, PP, PE, CAR, ENT y AVG a nivel general y por campeonato jugado.
- Agregado reporte PDF de tabla de posiciones de ranking con controles institucionales de tamaño, orientación y escala.
- package.json actualizado a `5.6.0`.

# v5.5.0 - 2026-05-18

- Ranking: los campeonatos tipo Ranking ya no muestran pasos operativos normales posteriores al Paso 1.
- Ranking: el menú oculta Grupos, Calendario, Partidas, Llaves, Reportes, Árbitros y Cierre cuando el campeonato activo es Ranking.
- Ranking: agregada matriz de puntos por campeonato jugado y detalle por campeonato asociado.
- Grupos: corregida la alineación de banderas en tablas de posiciones y tablas derivadas.
- Llaves: agregados mensajes de confirmación para procesos principales.
- Face to Face: corregida la asociación de ramas con base en fuentes reales de partidas y agregado soporte visual de R0.
- Menú: agregado scroll vertical/responsivo para visualizar opciones finales en pantallas pequeñas.
- package.json actualizado a `5.5.0`.

# v5.3.0 - 2026-05-18

- Eliminado el botón **Bracket después R0** para evitar duplicidad de llaves.
- `Generar siguiente ronda` asume automáticamente la generación del bracket principal posterior a R0.
- Agregada auditoría `DUPLICATE_BRACKET_BLOCKED` para intentos bloqueados de duplicar bracket.
- Rediseñada visualización **Face to Face** como llave izquierda/derecha con final central y campeón.
- PDF **Face to Face** configurado en horizontal y Todo 1 Página.
- Forzado color azul para toda la data de **Clasificados de primera fase** en modo claro y PDF.
- Agregado `public/_redirects` para fallback SPA en Cloudflare Pages al refrescar la página.


## v5.2.0 - Corrección crítica de acceso post-login

- Corrige error crítico que dejaba la aplicación en blanco después de iniciar sesión.
- Agrega estado faltante `menuCollapsed` requerido por el shell principal de la aplicación.
- Agrega `AppErrorBoundary` para evitar pantallas completamente en blanco ante errores de runtime.
- Mantiene la integración Supabase, pantalla de inicio v5.1, perfil, menú colapsable y funcionalidades Ranking.


## v5.2.0 - Ajustes de usabilidad, ranking y producción

- Rediseño completo de pantalla de ingreso basado en layout premium de CaromChamps.
- Tema inicial cambiado a modo claro.
- Agregado menú colapsable: expandido muestra texto e íconos; contraído muestra solo íconos.
- Agregados accesos de Perfil y Cerrar sesión desde el menú.
- Nuevo módulo de perfil para actualizar nombre, país, teléfono y foto.
- En modo oscuro, clasificados de grupos usan fondo azul claro y texto azul.
- Eliminada validación de cantidad par de clasificados a F2; R0 queda como mecanismo de reducción.
- División objetivo movida al Paso 1 de configuración del campeonato.
- Agregada preferencia de idioma para fechas: español, inglés y coreano.
- Agregada reapertura controlada de grupos cuando no existen fases posteriores activas.
- Ajustado PDF continuo vertical Legal con Dieciseisavos para mayor uso de la hoja.
- Agregados campeonatos tipo Ranking, asociación desde campeonatos Normal y tabla acumulada de puntos.

# Changelog

## v5.2.0

- Nueva pantalla de inicio con autenticación Supabase.
- Registro con nombre, correo, país, código telefónico, teléfono validado y foto opcional de perfil.
- Login por correo/contraseña, Google y Facebook; Instagram queda reservado para fase posterior.
- Usuario `vsolanos@gmail.com` definido como Admin mediante trigger/perfil Supabase.
- Separación de datos por usuario y sincronización central en tabla `user_app_states`.
- Los datos actuales pueden migrarse al usuario Admin desde el respaldo local del navegador.
- Enlaces compartidos de campeonatos para cualquier usuario activo con link, en modo solo lectura.
- Nueva vista compartida con grupos, llaves, partidas KO y ranking público.
- Supabase Storage para fotos de perfil en bucket `user-avatars`, máximo 5 MB.
- Se agregan `docs/supabase_schema_v5.sql`, `docs/SUPABASE_SETUP_v5.md` y `.env.example`.
- `package.json` actualizado a versión `5.0.0` y dependencia `@supabase/supabase-js`.

## v4.14.0

- Rebranding inicial a **CaromChamps** para el repositorio oficial `vsolanos/caromchamps`.
- `package.json` actualizado a `caromchamps` versión `4.14.0`.
- Título del navegador actualizado a CaromChamps.
- Dashboard actualizado para mostrar CaromChamps v4.14 como versión activa.
- PDF de Llave Tabular con Dieciseisavos/R32: aumento aproximado de 25% del contenido solo cuando el bracket incluye R32 y se imprime en modo Todo 1 Página.
- Grupos: el intercambio de jugadores vuelve a ser el modo predeterminado; se elimina el botón Modo intercambio.
- Grupos: el Modo sustitución queda como acción explícita e independiente.
- Grupos: en tablas de posiciones se muestra el nombre del jugador junto a la bandera del país, alineados en la misma línea.
- Se agrega `.gitignore` recomendado para uso con GitHub.

# CHANGELOG

## v4.13

- PDF Llave Continua: corrección específica para brackets que inician en Dieciseisavos/R32 o superiores.
- PDF Llave Continua: cuando hay R32/R64/R128 o una columna alimentadora R0 extensa, el exportador usa Legal Todo 1 Página y agrega la clase `bracket-continuous-r32plus`.
- PDF Llave Continua: escala especial de impresión para evitar que el bracket se divida en varias páginas o genere una primera hoja en blanco.
- PDF Llave Continua: reglas de impresión reforzadas para eliminar saltos de página accidentales en `pdf-page-table`, `bracket-print-scope` y `bracket-premium-panel`.
- Grupos: rediseño operativo de Intercambio/Sustitución para que sean modos separados y no se ejecuten simultáneamente.
- Grupos: Modo intercambio selecciona dos líneas y aplica el cambio inmediato, sin renderizar selector de sustitución.
- Grupos: Modo sustitución selecciona un jugador origen y luego muestra la lista de jugadores externos disponibles.
- Grupos: cálculo de bloqueo y lista de sustitutos optimizados con `useMemo` para reducir consumo de recursos.
- package.json actualizado a 4.13.0.
- README.md actualizado a v4.13.

## v4.12

- Corrección crítica en Grupos: al seleccionar un jugador para intercambio o sustitución la aplicación quedaba en blanco.
- Causa técnica: `src/modules/Groups.js` utilizaba el componente `Select` sin importarlo desde `src/components/ui.js`, provocando un `ReferenceError` al renderizar la barra de sustitución.
- Se agregó `Select` al import de `Groups.js`.
- Se conserva sin cambios la lógica de intercambio, sustitución, validación de grupos cerrados, partidas finalizadas y fases posteriores.
- package.json actualizado a 4.12.0.
- README.md actualizado a v4.12.

## v4.11

- Grupos: bandera y nombre del jugador alineados en tablas de posiciones.
- Grupos: función de sustitución de jugador por un jugador externo al campeonato, disponible solo mientras grupos estén abiertos.
- Grupos: intercambio y sustitución bloqueados si hay grupos cerrados, partidas de grupo finalizadas, clasificados o fases posteriores.
- Grupos: advertencia de impacto al volver a generar grupos después de existir datos.
- Partidas/Planillas: carga, visualización y eliminación de planilla firmada desde cada card de partida.
- Partidas/Planillas: asociación masiva automática por nombre P-### y lectura QR en archivos de imagen mediante jsqr.
- Planillas PDF: primera hoja en blanco y ajuste para ocupar mejor página Carta con resumen al final.
- Historial de jugador: panel derecho reemplazado por gráfico de línea de promedio por partida, con comparativa por campeonato y navegación a detalle por campeonato.
- package.json actualizado a 4.11.0.
- README.md actualizado a v4.11.

## v4.10

- PDF Llave Continua: aumentado 9% el tamaño de las cards de Octavos/R16 respecto al ajuste v4.9.
- PDF Llave Continua: aplicado el mismo tamaño visual de card a Cuartos, Semifinal, Final, R0 y rondas mayores para mantener consistencia de columnas.
- PDF Llave Continua: conectores horizontales y verticales reforzados y recalculados para evitar líneas incompletas entre cards y fases.
- package.json actualizado a 4.10.0.
- README.md actualizado a v4.10.

## v4.7

- Llaves continua: se elimina el renderizado especial de la fase activa; la fase actual usa el mismo template, altura y geometría de las fases anteriores.
- Llaves continua: corrección del traslape del card Campeón/Ganador sobre la partida Final cuando la Final ya está completada.
- Llaves continua: el card Campeón/Ganador se posiciona como nodo independiente a la derecha de la Final, 30% más grande, y aparece únicamente cuando la Final está finalizada.
- Llaves continua: se agrega conector visual entre la Final y el card Campeón/Ganador.
- PDF llave continua: se replica la misma lógica de separación de campeón y renderizado unificado en impresión Carta/Legal Todo 1 Página.
- package.json actualizado a 4.7.0.
- README.md actualizado a v4.7.

## v4.6

- Llaves continua: corrección de la fase activa para que se despliegue con la misma estructura y alineación de las fases anteriores.
- Llaves continua: la fase activa mantiene altura fija de card, stack completo de jugadores y comportamiento visual consistente.
- Llaves continua: los placeholders de ganadores ahora muestran códigos legibles tipo Ganador P-### en lugar de IDs internos largos.
- Planillas físicas: la cantidad de filas usa el campo Límite entradas default del campeonato como fuente principal.
- Planillas físicas: si Límite entradas default es 0, se generan 60 líneas máximas.
- Planillas físicas: se duplicó la altura útil de los renglones del resumen inferior para Jugador 1, Árbitro y Jugador 2.
- package.json actualizado a 4.6.0.
- README.md actualizado a v4.6.


## v4.4

- Jugadores: normalización de Tirso González como República Dominicana / Internacional.
- Jugadores: normalización de Marcos Valencia, William Pitty, Carlos Núñez, Ricardo Espinoza, Victor Espinoza, Rafael Bardayán, Julio Atencio, Daniel Acosta, Faustino Murillo, Carlos Patiño y Pablo Beltrán como Panamá / Internacional.
- Grupos: nueva función de intercambio de jugadores entre grupos o dentro del mismo grupo seleccionando dos líneas.
- Grupos: al intercambiar jugadores se limpian resultados afectados, clasificaciones y llaves posteriores para proteger la consistencia deportiva.
- Historial: nombres de jugadores clicables en jugadores, grupos, partidas y llaves; se despliega historial por campeonato con fase, partida, carambolas, entradas, promedio por partida, promedio total y detalle de partida.
- Llaves: corrección de visualización continua cuando existe preclasificación/R0 para evitar cards cortadas y mejorar asociación visual hacia el bracket principal.
- PDF Llave continua: aumento de escala/tamaño visual para aprovechar mejor el espacio disponible en formatos fijos Carta/Legal Todo 1 Página.
- Planillas físicas: ajuste de impresión a Carta vertical en una página por planilla.
- Planillas físicas: columnas actualizadas a CONT, CAR, ACUM y espacio en blanco para cada jugador.
- Planillas físicas: resumen final con Total Carambolas, SM1, SM2 y firmas de Jugador 1, Árbitro y Jugador 2.
- package.json actualizado a 4.4.0.
- README.md actualizado a v4.4.

## v4.3

- Llaves: agregada función de regreso ordenado a fase anterior con motivo, confirmación y auditoría.
- Llaves: si se regresa desde Final, Semifinal, Cuartos, Octavos, Dieciseisavos o R0, se elimina solo la fase activa más avanzada y se conservan las fases previas.
- Campeonato: selección de jugadores reubicada como Paso 2 y mejorada con filtros avanzados, estado, selección, cabeza de serie y acciones masivas.
- Jugadores: normalización de asociaciones/códigos de la carga Gran Prix: S.J. y C.R. a AJOBI, ALAJ a ASOBIGRIE, P a Internacional/Panamá.
- Partidas: agregado módulo de planillas físicas imprimibles para todas las partidas, por fase, por vista filtrada, pendientes o seleccionadas.
- Partidas: planillas con logo configurable, encabezado del campeonato, código de partida, QR, datos precargados, tabla de entradas según límite del campeonato y firmas.
- Partidas: carga de planillas firmadas con asociación automática por nombre P-###, asociación manual asistida, IndexedDB y auditoría.
- Partidas: lectura experimental de pistas de texto en archivos TXT/CSV/JSON; las imágenes/PDF manuscritos se guardan como respaldo documental.
- package.json actualizado a 4.3.0 y nueva dependencia qrcode.react.
- README.md actualizado a v4.3.

## v4.2

- Data de prueba: agregados 43 jugadores nuevos desde la lista del Gran Prix Centroamericano Costa Rica Mayo 2026.
- Data de prueba: omitidos jugadores repetidos ya existentes en el MVP para evitar duplicidad en el maestro de jugadores.
- Jugadores: agregada trazabilidad de código fuente mediante notas, `source_association_label` y `source_seed_number`.
- Asociaciones de prueba: agregados códigos S.J., ALAJ, P y C.R. para filtros y visualización de los jugadores cargados desde la imagen.
- Inicialización: fusión automática de jugadores nuevos con datos existentes en `localStorage`, sin sobrescribir jugadores ya registrados.
- package.json actualizado a 4.2.0.
- README.md actualizado a v4.2.

## v4.1

- PDF Llaves / Continua Vertical Carta Todo 1 Página: incremento aproximado del 35% en el tamaño visual del bracket para aprovechar mejor el espacio disponible.
- PDF Llaves / Continua Vertical Legal Todo 1 Página: incremento equivalente de escalado para brackets que inician en Dieciseisavos/R32 o más.
- PDF Llaves / Continua: menor espacio reservado al encabezado institucional y mayor área útil para el bracket, manteniendo separación segura.
- PDF Llaves / Continua: mayor tamaño de textos en fase, orden, AVG, CAR, ENT, jugadores, ganador, marcador y estado de partida.
- package.json actualizado a 4.1.0.
- README.md actualizado a v4.1.

## v4.0

- PDF Llaves / Continua: textos superiores del card —Fase, Orden, AVG, CAR y ENT— cambiados a azul oscuro.
- PDF Llaves / Continua: nombres de jugadores y texto de ganador cambiados a azul oscuro.
- PDF Llaves / Continua: formato fijo Vertical Carta Todo 1 Página para brackets que inician en Octavos/R16.
- PDF Llaves / Continua: formato fijo Vertical Legal Todo 1 Página para brackets que inician en Dieciseisavos/R32 o fases mayores.
- Motor de impresión: `startPdfPrint` ahora permite clases múltiples de impresión y escalado diferenciado por subreporte continuo.
- package.json actualizado a 4.0.0.
- README.md actualizado a v4.0.

## v3.9

- Dashboard: texto de versión actualizado dinámicamente desde `package.json`.
- PDF Llaves / Continua: corrección de traslape del contenido sobre el encabezado institucional.
- PDF Llaves Continua Horizontal con sizing Todo 1 Página: escalado ajustado para usar mejor el espacio disponible y reducir compresión innecesaria.
- PDF Llaves / Continua: el escalado de Todo 1 Página se aplica al cuerpo del bracket, conservando el encabezado y su separación.
- Llaves / Continua: textos superiores de Fase, Orden, AVG, CAR y ENT en celeste claro.
- package.json actualizado a 3.9.0.
- README.md actualizado a v3.9.

## v3.8

- Llaves / Continua: aumento adicional del 30% en la altura de las cards de Octavos/R16 respecto a v3.7.
- Llaves / Continua: card de Campeón reubicada 25% más abajo bajo la card de Final.
- Llaves / Continua: texto de Jugador/Ganador dentro de las cards en celeste claro.
- PDF Llaves / Continua: campo Estado de partida ampliado para evitar corte o salto de texto.
- PDF Llaves Continua Horizontal con sizing Todo 1 Página: compresión especial reforzada para compensar la mayor altura de Octavos/R16.
- package.json actualizado a 3.8.0.
- README.md actualizado a v3.8.


## v3.7

- Llaves / Continua: aumento adicional del 25% en la altura de las cards de Octavos/R16 para evitar recortes de información.
- Llaves / Continua: card de Campeón reubicada directamente bajo la card de Final.
- PDF Llaves Continua Horizontal con sizing Todo 1 Página: compresión especial de impresión para salida en una sola página.
- Reporte General / Ranking Final Consolidado: Estado Eliminado y Subcampeón en azul oscuro.
- Reporte Clasificados de primera fase: eliminada columna Clasificación.
- Modo claro / Clasificados de primera fase: columnas en azul oscuro excepto Jugador.
- package.json actualizado a 3.7.0.
- README.md actualizado a v3.7.

## v3.6

- PDF de Llaves Tabular: ganador con fondo celeste oscuro en toda la fila.
- PDFs: refuerzo de alineación izquierda para todo campo/columna Jugador en Reportes, Grupos, Cierre y Bracket Tabular.
- PDF de Llaves Continua: marcador/carambolas con texto celeste claro.
- Llaves Continua: cards más altas y geometría de slots recalculada para que Octavos/R16 muestre la información completa de ambos jugadores sin romper conectores ni asociaciones entre rondas.

## v3.5

- Ajuste de margen izquierdo/derecho del encabezado PDF.
- Centrado de tablas PDF en Bracket Tabular y Reportes, con excepción de columnas de jugador.
- Corrección de alineación de visualización continua de llaves mediante posiciones absolutas por ronda.
- Fondo celeste claro para jugador ganador en PDF de Bracket continuo.
- Colores PDF de estados Eliminado y No clasificado en Reportes.

# CHANGELOG
## v3.4.0
- PDFs: corrección estructural de encabezado repetido sin traslape usando tabla de encabezado (`PdfDocument`).
- PDF de Grupos: tablas con celdas centradas excepto jugador; eliminada columna ULT AVG REG de conformación de grupo.
- PDF de Llaves continua: jugador ganador en celeste oscuro.
- Llaves continua: conectores y alineación de cards mejorados para asociaciones entre rondas.


## v3.3

- Ajuste de color en Partidas modo oscuro para Tipo de resultado y Ganador manual.
- Ajuste de PDF de Grupos: estado No Definido en Azul Oscuro.
- Corrección para preservar No CBZ/cabeza de serie de campeonato al editar datos maestros del jugador.
- Corrección de márgenes de impresión: el encabezado fijo no se mueve y el espacio de página se reserva desde @page para evitar traslapes en páginas sin corte manual.

# CHANGELOG
## v3.2
- Eliminada la primera página en blanco en todos los PDFs.
- Grupos modo oscuro: estado No Definido en azul claro y No calificado en celeste oscuro.
- Partidas modo oscuro: datos de resultados capturados en azul.
- Llaves / Continua modo claro: fecha/hora en azul claro, ronda en azul oscuro y marcadores en gris claro.

## v3.0.0
- Ajustes de color en sección Jugadores modo oscuro: textos secundarios/auxiliares celeste oscuro, deshabilitados gris azulado oscuro, hints gris azulado y botones desactivar/deshabilitados gris azulado.
- Ajustes de color en sección Grupos modo claro: filas clasificadas celeste oscuro, texto finalizada azul oscuro y badge finalizada gris azulado claro.
- Umbrales de Primera y Segunda División editables con tres decimales mediante campos de texto con normalización al salir del campo.
- PDFs forzados a modo claro independientemente del tema activo de la aplicación.
- PDF de Grupos con corte antes de la sección de continuación del Ordenamiento final fase de grupos.
- Agregado PDF de Partidas.
- Agregado PDF de Calendario.

## v2.9.0
- Fechas visibles en español para pantallas y PDFs.
- Agenda de grupos con Estado alineado visualmente a Clasificación.
- PDFs con data de tablas tamaño 12, jugador destacado y cortes de página por sección interna de Reportes.
- Ajustes de colores PDF: texto auxiliar azul oscuro, fondo clasificado celeste, borde tabla azul oscuro.
- Generar Partidas Proy. revisado para calendarizar hasta final y habilitar rondas solamente mediante Generar siguiente ronda, conservando fecha/hora/mesa.
- Bracket proyectado soporta rutas con R0/preclasificación y rondas iniciales R32/R16/QF/SF/F según corresponda.


## v2.8

- Agregado corte de página por sección al imprimir/PDF en Reportes.
- Aplicada tabla oficial de tokens globales CSS para modo oscuro y modo claro.
- Normalizadas variables de color para app, tablas, resaltados, scores, puntos y PDF.


## v2.7.0
- Revisión de calendarización con mesas activas, días de torneo, horarios diarios, blackouts, distribución por bloques y orden round-robin aprobado.
- `Generar Partidas Proy.` ahora genera estructura hasta final y agenda todas las fases con fechas, horas y mesas.
- README actualizado a v2.7 y CHANGELOG reconstruido desde v0.2.
- Instalación corregida: sin `package-lock.json`, `.npmrc` en registro público y dependencias fijadas.
- PDFs: nueva reserva vertical para encabezados repetidos y cortes de página con espacio superior para evitar solapamientos.
- Ordenamiento final de grupos dividido en páginas lógicas para reducir traslapes con encabezado.
- Umbrales de divisiones se muestran con 3 decimales.
- Colores PDF ajustados según solicitud: secundario celeste oscuro, auxiliar gris oscuro, clasificado celeste oscuro y bordes de tabla azul oscuro.

## v2.6.0
- Agregado `src/styles/theme.css` con variables globales para modo oscuro y modo claro.
- Ajustes de color en modo oscuro: bordes dorados, texto principal azul claro, éxito dorado, inputs azul claro, brackets con card gris claro, borde dorado y líneas dorado oscuro.
- Ajustes PDF con encabezado de tabla azul claro y borde azul claro.
- Nuevo `STORAGE_KEY` para evitar contaminación de datos locales.

## v2.5.0
- Agregados campos Director Técnico, Representante 1 y Representante 2 en información general del campeonato.
- Tamaño y orientación PDF por defecto convertidos en combos de configuración.
- `Generar Partidas Proy.` crea rondas planificadas no capturables y conserva fecha/hora/mesa al generar rondas reales.
- Bloqueo de captura sobre partidas planificadas.

## v2.4.1
- ZIP sin `package-lock.json` y con `.npmrc` apuntando a npm público para evitar registros internos.

## v2.4.0
- Modo oscuro / modo claro en Configuración.
- Corrección de encabezados PDF y agenda de grupos.
- Regla de negocio: penales eliminados de fase de grupos.
- Reporte de clasificación de primera fase muestra solo clasificados.
- Reporte de rendimiento ordenado por promedio, puntos, SM1 y SM2.
- Botón `Generar Partidas Proy.` agregado al calendario.

## v2.3.0
- Configuración global para rangos de ascenso/descenso y PDF por defecto.
- Agenda y partidas completadas resaltadas en celeste oscuro.
- Reportes alineados al estilo de tablas de posiciones.
- Ranking final normaliza estado `Direct`/`Extra` como `Clasificado`.

## v2.2.0
- PDF de Grupos con corte de página por grupo.
- PDF de Bracket tabular con corte por fase.
- Sizing `Todo 1 Página`.
- Menú inicia con Campeonatos.

## v2.1.0
- Sizing PDF 50% y 60%.
- Mejora de impresión vertical y tablas.
- Visualización de número y nombre de grupo en PDF.

## v2.0.0
- PDF en sección Grupos.
- Branding ASOBIGRIE + FECOBI en PDFs.
- Configuración de impresión: tamaño, orientación y sizing.

## v1.9.0
- PDF desde sección Llaves/Bracket según visualización activa: Tabular, Continua o Face to Face.

## v1.8.0
- Reportería filtrada por campeonato actual y jugadores participantes.
- ASOBIGRIE como marca principal y FECOBI como marca secundaria.
- Ajustes visuales en ranking y bracket continuo.

## v1.7.0
- Foto/avatar en conformación de grupos.
- Estados completados en partidas con celeste oscuro.
- Brackets ordenados con patrones aprobados para 4, 8, 16 y 32 clasificados.
- División objetivo `Selectivo` y promedios especiales para Selectivo e Internacional.
- Calendario con estructura proyectada hasta final.

## v1.6.0
- Bracket continuo rediseñado con tarjetas, foto, bandera, marcador, entradas, promedio, SM1/SM2 y campeón.
- Bracket tabular rediseñado con secciones por fase.
- Orden de partidas por grupo aprobado para grupos de 3, 4, 5 y 6.
- Look & feel premium oscuro con menú lateral y branding.

## v1.5.0
- Corrección de guardado de jugadores y fotografía.
- Seed movido desde jugador a inscripción del campeonato.
- Internacional: asociación INTERNACIONAL y división NA.
- Captura renombrada como Partidas.
- Lógica de bloques por mesa: 0, 1-6, 2D2, 3D2, etc.

## v1.4.0
- Gestión de campeonatos múltiples.
- Captura avanzada y guardado masivo.
- Cierre deportivo `FINALIZED` y administrativo `COMPLETED`.
- Reporte 5 y reclasificación de divisiones.
- Acta final institucional y exportaciones CSV.

## v1.3.0
- Paquete funcional de cierre deportivo base, bloqueo y reapertura controlada iniciado.

## v1.2.0
- Tres visualizaciones de bracket: tabular, continua y face-to-face.
- Filtros por ronda en Partidas y Agenda.
- Mejoras de Árbitros, Cierre y Reportes.

## v1.1.0
- Bracket completo con números mágicos, preclasificación/R0, R16, QF, SF y Final.
- Reportes de fase final y ranking consolidado.

## v1.0.0
- Selección internacional en campeonato muestra todos los jugadores activos.
- ID consecutivo de partida en calendario, grupos y captura.
- Agenda refleja marcadores capturados.

## v0.9.0
- Selección manual de jugadores por campeonato.
- Tablas de posiciones con estado No Definido hasta completar partidas.
- Agenda editable con filtros, ordenamientos e intercambio de horarios.
- Captura en tarjetas por partida.

## v0.8.0
- Construcción de secciones Campeonato, Grupos y Calendario.
- Reglas por fase/ronda y administración de mesas.

## v0.7.0
- Carga masiva de jugadores por CSV.
- Eliminada dependencia vulnerable `xlsx`.

## v0.6.0
- Carga masiva Excel inicial.
- Banderas del continente americano.
- Asociación INTERNACIONAL automática.
- Promedios con 3 decimales.

## v0.5.0
- Banderas SVG internas para países.

## v0.4.0
- Código visible de jugador `JUG-0001`.
- Carga de fotografía JPEG/PNG con vista previa.

## v0.3.0
- Mantenimiento de jugadores con campos extendidos.

## v0.2.0
- Primer paquete modular React/Vite de preproducción fuera de Canvas.
## v3.1
- Forzado de todos los PDFs a modo claro independiente del tema activo de la app.
- Selector discreto de secciones imprimibles en PDF dentro de Reportes, con persistencia de la última configuración.
- Inserción de primera página en blanco en PDFs para impresión manual desde página 2.
- Corte de página por sección interna en Reportes conservado.
- Ajuste visual en modo claro para que Clasificados de primera fase use el mismo look & feel que Ranking final consolidado.



## v4.5.0

- Mejora visual de banderas, especialmente Panamá y República Dominicana.
- Corrección del PDF de llave continua para permitir Carta/Legal y evitar desorden por altura excesiva.
- Cards de bracket continuo más anchas y mejor espaciadas; campeón 30% más grande y ubicado a la derecha de la Final.
- Historial de jugador: línea seleccionada en rojo y panel de detalle reducido 35%.
- Ajustes de colores en modo claro para la visualización continua.
- Planillas oficiales: columnas NUM, CON, CAR, ACU; hora/mesa en blanco; estructura centrada en Carta y resumen final fijo.


### Hotfix v5.3.0 - carga post-login
- Se reforzó AuthGate para que la app principal cargue inmediatamente después del login usando un perfil local de sesión.
- La sincronización con Supabase queda asincrónica y no bloquea el render de la aplicación.
- Se agregaron timeouts y manejo seguro de errores en perfil, estado remoto y auditoría para evitar pantallas en blanco por red/RLS/Supabase.


## v5.4.0

- Hotfix de estabilidad local: servidor Vite fijado en localhost:5173 con strictPort.
- AuthGate ahora libera la pantalla si Supabase no responde al refrescar sesión.
- Agregado script `dev:clean` para limpiar cache local de Vite y `dist`.
- Agregado `public/_headers` para evitar cache agresivo de `index.html` en Cloudflare Pages.
