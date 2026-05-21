# CaromChamps v6.6.0

Plataforma web para gestión integral de campeonatos de billar carambola a 3 bandas FECOBI / ASOBIGRIE: jugadores, campeonatos normales, campeonatos ranking, doble fase de grupos, calendario, captura de partidas, planillas físicas, llaves/brackets, reportes PDF/Excel, ranking, cierre y auditoría.

## Versión activa

**CaromChamps v6.6.0** mantiene la **Interface ProV** como experiencia predeterminada y conserva disponibles las interfaces **IA** y **Clásica** para transición controlada. La selección de interface se guarda en `localStorage`.

### Cambios principales v6.6.0

- Llaves Face to Face: estandarización visual de los cards con la visualización Continua, usando tamaños, tipografía, colores, espaciado y estructura de información equivalentes.
- Llaves Continua y Face to Face: el label **Ganador** y el nombre del jugador ganador se muestran en color azul claro en todos los cards.
- Llaves Face to Face: el card de Campeón/Ganador queda debajo del card de la Final con separación aproximada de 3 cm y con conector vertical.
- PDF Face to Face: reducción adicional del sizing del modo Todo 1 Página en aproximadamente 12% para mejorar la probabilidad de salida en una sola página.
- Grand Dashboard: agregado card informativo con la versión actual de la plataforma en ejecución, igual al criterio usado en dashboards de campeonato.
- Planillas PDF: la primera planilla base del torneo conserva el nombre del campeonato en el encabezado y se identifica como **Planilla Base del Torneo**.
- Planillas PDF: renglones superiores de información y jugadores ampliados aproximadamente 50% para mayor legibilidad.
- README reestructurado y verificado con historial consolidado de versiones y comandos actualizados.

## Interfaces disponibles

1. **Interface ProV** — predeterminada, con Grand Dashboard, menú izquierdo simplificado y tabs internos por campeonato.
2. **Interface IA** — interface guiada introducida en v5.9.0.
3. **Interface Clásica** — experiencia base utilizada hasta v5.8 y versiones anteriores.

## Instalación y validación local

```powershell
npm.cmd install --registry=https://registry.npmjs.org/
npm.cmd run check:syntax
npm.cmd run build
npm.cmd run dev
```

Abrir localmente:

```text
http://localhost:5173/
```

## Ejecución recomendada en Windows

```powershell
cd C:\proyectos\caromchamps
.\START_CAROMCHAMPS.bat
```

Alternativa con PowerShell:

```powershell
cd C:\proyectos\caromchamps
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\START_CAROMCHAMPS.ps1
```

## Historial de versiones consolidadas

### v6.6.0 — UI consistente en llaves, PDF Face to Face y planillas base

- Face to Face toma el diseño visual de cards de la visualización Continua.
- Ganador y nombre del ganador en azul claro en todos los cards de llaves.
- Campeón/Ganador debajo de la Final con separación aproximada de 3 cm.
- PDF Face to Face con sizing reducido 12%.
- Grand Dashboard muestra versión actual de plataforma.
- Planilla base incluye nombre del campeonato y encabezado de plantilla base.
- Renglones superiores de planillas ampliados para legibilidad.

### v6.5.0 — Planillas aisladas y corrección Face to Face

- Restaurada primera planilla en blanco como plantilla base del torneo.
- Aislamiento total del área imprimible para que ProV, tabs o menús no aparezcan en el PDF.
- Corrección del salto de la primera planilla a dos páginas.
- Face to Face: corrección del posicionamiento de Final y Campeón hacia el centro superior solicitado.
- Conectores centrales recalculados desde Semis hacia Final.

### v6.4.0 — Launcher local, planillas y Face to Face

- Scripts `START_CAROMCHAMPS.bat`, `START_CAROMCHAMPS.ps1`, `INSTALL_CAROMCHAMPS_AUTOSTART.ps1` y `REMOVE_CAROMCHAMPS_AUTOSTART.ps1` para operar localmente.
- Mejora operativa para evitar confusión con `localhost refused to connect` cuando el servidor local no está corriendo.
- Planillas PDF centradas horizontal y verticalmente.
- Ajuste para una planilla por página en tamaño Carta.
- Face to Face: Final y Campeón movidos hacia zona superior con conectores desde Semis.
- Control de Promedios desactivado: cierre, acta y ranking evitan mostrar AVG/entradas cuando no aplica.

### v6.3.0 — ProV, Control de Promedios y estabilidad SPA

- Rollback del fondo azul claro completo del panel de tabs ProV en modo oscuro.
- Flechas del proceso en modo oscuro con fondo azul.
- Grand Dashboard: gráficos enlazados al tab Reportes del campeonato y Top de jugadores con historial.
- Dashboard del campeonato: AVG final integrado a gráfica por fase y Top 7 de AVG del torneo.
- Navegación local estabilizada con hash para refresh, back/forward y reapertura.
- Nuevo parámetro Control de Promedios Sí/No.
- Si Control de Promedios = No, se ocultan entradas/promedios y se ajustan desempates.
- Planillas PDF con sizing reducido 10%.

### v6.2.0 — ProV, Doble Fase Grupos y ajustes operativos

- Tab Reportes agregado al panel ProV.
- Nueva funcionalidad Doble Fase Grupos con tipo de campeonato y tab Grupos F2.
- Wizard permite crear campeonatos Normal o Doble Fase Grupos.
- Grupos F2 se alimenta de clasificados de la primera fase.
- Bloqueos de Setup al clasificar/cerrar campeonato en ProV, IA y Clásico.
- Ranking: detalle por campeonato enlaza al tab Reportes del campeonato asociado.

### v6.1.0 — Wizard overlay y Ranking Dashboard

- Wizard de campeonatos convertido en pantalla sobrepuesta.
- Wizard incluye divisiones Selectivo e Internacional.
- Tabs ProV rediseñados como flechas de proceso y sticky al hacer scroll.
- Dashboard de campeonato con lista de partidas pendientes.
- Ranking Dashboard con Top 10, participantes por campeonato y AVG por campeonato asociado.
- Botón Abrir habilitado para campeonatos activos.

### v6.0.0 — Interface ProV

- Nueva Interface ProV como experiencia predeterminada.
- Grand Dashboard acumulado de plataforma.
- Menú izquierdo: Grand Dashboard, Campeonatos, Ranking y Administración.
- Menú Campeonatos muestra campeonatos normales.
- Menú Ranking muestra campeonatos tipo Ranking.
- Tabs internos: Dashboard, Campeonato, Grupos, Calendario, Partidas, Llaves, Cierre y Reportes.
- Wizard para campeonatos normales y rankings.
- Zoom In/Out independiente para llaves Continua y Face to Face.

### v5.9.0 — Interface IA y fallback clásico

- Nueva Interface IA guiada por flujo.
- Opción para volver a Interface Clásica.
- Dashboard como centro de control operativo.
- Siguiente acción recomendada, alertas operativas y checklist de cierre.
- Catálogo de reportes y vista previa tipo tablero para agenda.
- Base `DataTableCarom` para tablas futuras.

### v5.8.0 — Face to Face y Ranking PDF

- Compactación vertical superior del Face to Face.
- Conectores centrales entre Semis y Final.
- Ranking PDF con C1, C2, etc. y detalle por campeonato.
- Ranking resumen por campeonato con PRG, CAR, ENT, AVG y Pos#.

### v5.7.0 — Final, campeón y ranking

- Separación visual de Final y Semis.
- Campeón/Ganador debajo de la Final en Face to Face.
- Ranking con jugador, historial, asociación y bandera.
- Ranking filtra solo jugadores participantes.
- Rankings no requieren selección directa de jugadores.

### v5.6.0 — Face to Face árbol y Ranking avanzado

- Face to Face reconstruido con geometría tipo árbol.
- Conectores SVG basados en fuentes reales de partidas.
- R0 integrado como alimentador visual.
- Ranking con PRG en rojo.
- Métricas PRG, PJ, PG, PP, PE, CAR, ENT y AVG.
- PDF de ranking.

### v5.5.0 — Ranking mode, menús y llaves

- Campeonatos Ranking ocultan pasos operativos normales.
- Grupos: banderas alineadas.
- Llaves: mensajes de confirmación en acciones principales.
- Face to Face usa `source_match1_id` y `source_match2_id`.
- Menú con scroll vertical.
- Ranking acumulado por jugador y matriz por campeonato.

### v5.4.0 — Login premium y Ranking inicial

- Login premium y modo claro por defecto.
- Menú lateral colapsable.
- Perfil de usuario con foto, país y teléfono.
- División objetivo en Paso 1.
- R0 para cantidades no mágicas.
- Reabrir grupos con validaciones.
- PDF continuo con Dieciseisavos/R32 optimizado.
- Primera funcionalidad Ranking.

### v5.2.0 — Plataforma multiusuario Supabase

- Supabase Auth con correo, Google y Facebook.
- Perfil de usuario y roles.
- Separación de datos por usuario.
- Sincronización en `user_app_states`.
- Enlaces compartidos de campeonato en solo lectura.
- Vista compartida con grupos, llaves, KO y ranking público.

### v5.0.0 — Capa inicial Supabase

- Integración inicial de Supabase Auth.
- Formulario de registro.
- Supabase Storage para fotos de perfil.
- `.env.example` y scripts SQL base.

### v4.14.0 — Rebranding CaromChamps

- Rebranding a CaromChamps.
- Repositorio oficial `vsolanos/caromchamps`.
- Dashboard actualizado.
- PDF tabular R32 optimizado.
- Intercambio de jugadores en grupos.

### v4.13.0 a v4.1.0 — Base funcional histórica

- Llave Continua con R0/preclasificación.
- Planillas físicas imprimibles con QR y firmas.
- Carga de planillas firmadas.
- Intercambio y sustitución de jugadores.
- Regreso ordenado de fase con auditoría.
- Historial de jugador con gráfico de promedio.
- Exportaciones institucionales PDF/CSV.

## Configuración Supabase

Ejecutar en Supabase:

```text
docs/supabase_schema_v5.sql
```

Variables de entorno:

```text
VITE_SUPABASE_URL=https://vmcbaexkbenbesygxccu.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable/anon key de Supabase>
```

Redirect URLs recomendadas:

```text
https://caromchamps.com/*
http://localhost:5173/*
```

## Publicación GitHub sugerida

```powershell
git status
git add .
git commit -m "Release v6.6.0 - Bracket UI standardization, Face to Face PDF sizing and score sheet refinements"
git push origin main
git tag -a v6.6.0 -m "CaromChamps v6.6.0"
git push origin v6.6.0
```
