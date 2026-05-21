import { useEffect, useState } from 'react';
import { E, Card, Button, SectionTitle, Badge } from '../components/ui.js';
import { PdfControls, PdfDocument } from '../components/Print.js';
import { startPdfPrint } from '../lib/print.js';
import { buildActaFinal, buildFinalRankings, buildReport5Rows, buildStats, downloadCsv, fmtAvg, groupStandings, usesAverageControl, matchCode, matchDetailedScore, matchDisplayStatus, matchPlayerStats, matchRoundKey, matchRoundLabel, playerName, roundDisplayName, getEligiblePlayers } from '../lib/tournament.js';


function statusLabel(value) {
  return ['DIRECT', 'EXTRA', 'DIRECT_GROUP', 'EXTRA_POSITION'].includes(value) ? 'Clasificado' : (value || 'No clasificado');
}

const REPORT_PRINT_SETTINGS_KEY = 'fecobi-report-print-sections-v3-1';
const REPORT_SECTIONS = [
  ['summary', 'Resumen por fases'],
  ['ranking', 'Ranking final consolidado'],
  ['bracket', 'Reporte detallado de bracket'],
  ['report5', 'Reporte 5 preliminar'],
  ['firstPhase', 'Clasificados de primera fase'],
  ['performance', 'Posiciones generales por rendimiento']
];
const DEFAULT_REPORT_SECTIONS = Object.fromEntries(REPORT_SECTIONS.map(([key]) => [key, true]));
function loadReportPrintSections() {
  try {
    const raw = localStorage.getItem(REPORT_PRINT_SETTINGS_KEY);
    return raw ? { ...DEFAULT_REPORT_SECTIONS, ...JSON.parse(raw) } : DEFAULT_REPORT_SECTIONS;
  } catch {
    return DEFAULT_REPORT_SECTIONS;
  }
}

function tablePlayerCell(player) {
  return E('div', { className: 'report-player-cell' }, E('b', null, playerName(player)), E('div', { className: 'small player-submeta' }, player.association_code || player.country_iso || ''));
}

function rankingRow(row, avgEnabled = true) {
  const shownStatus = statusLabel(row.final_status);
  const kind = shownStatus === 'Campeón' ? 'success' : shownStatus === 'Subcampeón' ? 'info' : shownStatus === 'Clasificado' ? 'info' : shownStatus === 'Eliminado' ? 'warning' : 'neutral';
  const statusClass = shownStatus === 'Eliminado' ? 'report-status-eliminado' : shownStatus === 'Subcampeón' ? 'report-status-subcampeon' : shownStatus === 'No clasificado' ? 'report-status-no-clasificado' : '';
  return E('tr', { key: row.player.player_id, className: shownStatus === 'Clasificado' ? 'qualified-row' : '' },
    E('td', null, row.final_position),
    E('td', null, tablePlayerCell(row.player)),
    E('td', { className: statusClass }, E(Badge, { kind }, shownStatus)),
    E('td', null, row.final_phase),
    E('td', null, row.played), E('td', null, row.wins), E('td', null, row.draws), E('td', null, row.losses),
    E('td', null, row.caroms), avgEnabled ? E('td', null, row.innings) : null, E('td', null, row.s1), E('td', null, row.s2), avgEnabled ? E('td', null, fmtAvg(row.avg)) : null, E('td', null, row.points)
  );
}

function phaseSummary(matches) {
  const map = new Map();
  matches.forEach((m) => {
    const key = m.phase === 'GROUPS' ? 'GROUPS' : matchRoundKey(m);
    const row = map.get(key) || { key, label: m.phase === 'GROUPS' ? 'Grupos' : roundDisplayName(key), total: 0, completed: 0, pending: 0 };
    row.total += 1;
    if (m.match_status === 'COMPLETED') row.completed += 1; else row.pending += 1;
    map.set(key, row);
  });
  const order = { GROUPS: -1, R0: 0, R128: 1, R64: 2, R32: 3, R16: 4, QF: 5, SF: 6, F: 7 };
  return [...map.values()].sort((a, b) => (order[a.key] ?? 99) - (order[b.key] ?? 99));
}

function matchReportRow(match, playerMap, avgEnabled = true) {
  const p1 = matchPlayerStats(match, 1);
  const p2 = matchPlayerStats(match, 2);
  return E('tr', { key: match.match_id, className: match.match_status === 'COMPLETED' ? 'completed-row' : '' },
    E('td', null, matchCode(match)),
    E('td', null, matchRoundLabel(match)),
    E('td', null, playerName(playerMap[match.player1_id])),
    E('td', null, playerName(playerMap[match.player2_id])),
    E('td', null, `${p1.caroms}-${p2.caroms}`),
    avgEnabled ? E('td', null, `${p1.innings}/${p2.innings}`) : null,
    E('td', null, `${p1.s1}/${p2.s1}`),
    E('td', null, `${p1.s2}/${p2.s2}`),
    avgEnabled ? E('td', null, `${p1.avg}/${p2.avg}`) : null,
    E('td', null, matchDisplayStatus(match)),
    E('td', null, match.winner_id ? playerName(playerMap[match.winner_id]) : '-'),
    E('td', null, match.match_result_type || 'NORMAL')
  );
}

export function ReportsModule({ players, matches, groups, seeds, championship = {} }) {
  const [pageSize, setPageSize] = useState(championship.global_settings?.pdf_default_page_size || 'A4');
  const [orientation, setOrientation] = useState(championship.global_settings?.pdf_default_orientation || 'portrait');
  const [scale, setScale] = useState('100');
  const [printSections, setPrintSections] = useState(loadReportPrintSections);
  useEffect(() => {
    localStorage.setItem(REPORT_PRINT_SETTINGS_KEY, JSON.stringify(printSections));
  }, [printSections]);
  const togglePrintSection = (sectionKey) => setPrintSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  const eligiblePlayers = getEligiblePlayers(championship, players);
  const allowedIds = new Set(eligiblePlayers.map((p) => p.player_id));
  const playerMap = Object.fromEntries(eligiblePlayers.map((p) => [p.player_id, p]));
  const avgEnabled = usesAverageControl(championship);
  const scopedMatches = matches.filter((m) => {
    const ids = [m.player1_id, m.player2_id, m.winner_id].filter(Boolean).filter((id) => !String(id).startsWith('WINNER:'));
    return ids.length === 0 || ids.some((id) => allowedIds.has(id));
  });
  const stats = buildStats(scopedMatches, eligiblePlayers, championship);
  const groupsWithStandings = groupStandings(groups, scopedMatches, championship);
  const finalRankings = buildFinalRankings(eligiblePlayers, scopedMatches, seeds, championship);
  const eliminationMatches = scopedMatches.filter((m) => ['PRE_ELIMINATION', 'KO'].includes(m.phase));
  const summaries = phaseSummary(scopedMatches);
  const report5 = buildReport5Rows(eligiblePlayers, scopedMatches, championship);
  const acta = buildActaFinal(championship, eligiblePlayers, scopedMatches, seeds);
  const seedByPlayer = new Map(seeds.map((seed) => [seed.player?.player_id || seed.player_id, seed]));
  const firstPhaseQualifiedRows = groupsWithStandings
    .flatMap((group) => (group.standings || []).map((row) => ({ ...row, group_name: group.group_name })))
    .filter((row) => seedByPlayer.has(row.player.player_id))
    .sort((a, b) => (seedByPlayer.get(a.player.player_id)?.seed_position || 9999) - (seedByPlayer.get(b.player.player_id)?.seed_position || 9999));
  const performanceRows = [...stats].sort((a, b) => avgEnabled ? (b.avg || 0) - (a.avg || 0) || b.points - a.points || b.s1 - a.s1 || b.s2 - a.s2 : b.points - a.points || b.wins - a.wins || a.losses - b.losses || b.caroms - a.caroms);

  const exportPositions = () => downloadCsv('posiciones_finales.csv', finalRankings.map((row) => ({
    NUM: row.final_position, 'NOMBRE DEL JUGADOR': playerName(row.player), ESTADO: statusLabel(row.final_status), FASE: row.final_phase,
    PJ: row.played, PG: row.wins, PE: row.draws, PP: row.losses, CAR: row.caroms, ...(avgEnabled ? { ENTR: row.innings } : {}),
    SM1: row.s1, SM2: row.s2, ...(avgEnabled ? { PROM: fmtAvg(row.avg) } : {}), PUNTOS: row.points, POS: row.final_position
  })));
  const exportGroups = () => downloadCsv('reporte_grupos.csv', groupsWithStandings.flatMap((g) => g.standings?.map((s) => ({ GRUPO: g.group_name, NUM: s.group_position, 'NOMBRE DEL JUGADOR': playerName(s.player), PJ: s.played, PG: s.wins, PE: s.draws, PP: s.losses, CAR: s.caroms, ...(avgEnabled ? { ENTR: s.innings } : {}), SM1: s.s1, SM2: s.s2, ...(avgEnabled ? { PROM: fmtAvg(s.avg) } : {}), PUNTOS: s.points, POS: s.group_position, CLASIFICADO: seeds.some((seed) => seed.player?.player_id === s.player.player_id) ? 'Clasificado' : 'No clasificado' })) || []));
  const exportBracket = () => downloadCsv('reporte_bracket.csv', eliminationMatches.map((m) => ({
    Ronda: matchRoundLabel(m), Numero_partido: matchCode(m), Seed_1: m.seed1_position || '', Seed_2: m.seed2_position || '', Jugador_1: playerName(playerMap[m.player1_id]), Jugador_2: playerName(playerMap[m.player2_id]), Carambolas_1: m.caroms_p1, Carambolas_2: m.caroms_p2, ...(avgEnabled ? { Entradas: `${m.innings_p1}/${m.innings_p2}` } : {}), SM1: `${m.s1_p1}/${m.s1_p2}`, SM2: `${m.s2_p1}/${m.s2_p2}`, ...(avgEnabled ? { Promedio: `${matchPlayerStats(m, 1).avg}/${matchPlayerStats(m, 2).avg}` } : {}), Ganador: m.winner_id ? playerName(playerMap[m.winner_id]) : '', Penales: `${m.penalties_p1 || ''}/${m.penalties_p2 || ''}`, Tipo_resultado: m.match_result_type || 'NORMAL'
  })));
  const exportReport5 = () => downloadCsv('reporte_5_reclasificacion.csv', report5.map((r) => ({ Jugador: playerName(r.player), Division_previa: r.previous_division, AVG_previo: fmtAvg(r.previous_average), AVG_torneo: fmtAvg(r.avg_at_close), Partidas_validas: r.valid_matches, Minimo_requerido: r.minimum_required, Division_sugerida: r.suggested_division, Movimiento: r.movement, Confirmacion: r.confirmed ? 'Aprobado' : 'Pendiente', Observacion: r.observation || '' })));
  const exportActa = () => downloadCsv('acta_final.csv', [
    { Campo: 'Campeonato', Valor: acta.championship }, { Campo: 'Sede', Valor: acta.venue || '' }, { Campo: 'Campeón', Valor: acta.champion ? playerName(acta.champion.player) : '' }, { Campo: 'Subcampeón', Valor: acta.runnerUp ? playerName(acta.runnerUp.player) : '' }, { Campo: 'Mejor AVG', Valor: acta.bestAvg ? `${playerName(acta.bestAvg.player)} · ${fmtAvg(acta.bestAvg.avg)}` : '' }, { Campo: 'Serie Mayor', Valor: acta.bestSeries ? `${playerName(acta.bestSeries.player)} · ${acta.bestSeries.s1}` : '' }, { Campo: 'Fecha emisión', Valor: acta.date }
  ]);

  const exportReportsPdf = () => startPdfPrint({
    bodyClass: 'printing-reports',
    title: `Reportes - ${championship.name || 'Campeonato'}`,
    pageSize,
    orientation,
    scale
  });

  return E('div', { className: 'grid reports-export-root' },
    E(Card, { className: 'reports-control-card' },
      E(SectionTitle, { title: 'Reportería institucional', subtitle: 'Exportaciones equivalentes a grupos, clasificados, bracket, posiciones finales, Reporte 5 y acta final.' }),
      E('div', { className: 'toolbar', style: { marginTop: 12 } },
        E(Button, { onClick: exportGroups, kind: 'soft' }, 'Exportar reporte grupos'),
        E(Button, { onClick: exportPositions }, 'Exportar posiciones finales'),
        E(Button, { onClick: exportBracket, kind: 'soft' }, 'Exportar bracket'),
        E(Button, { onClick: exportReport5, kind: 'soft' }, 'Exportar Reporte 5'),
        E(Button, { onClick: exportActa, kind: 'soft' }, 'Exportar acta final'),
        E(Button, { onClick: exportReportsPdf, kind: 'soft' }, 'Imprimir / PDF')
      ),
      E(PdfControls, { pageSize, setPageSize, orientation, setOrientation, scale, setScale }),
      E('div', { className: 'report-print-section-picker' },
        E('p', { className: 'small' }, 'Secciones a incluir en PDF'),
        E('div', { className: 'report-print-section-grid' }, REPORT_SECTIONS.map(([key, label]) => E('label', { key, className: 'report-print-check' },
          E('input', { type: 'checkbox', checked: Boolean(printSections[key]), onChange: () => togglePrintSection(key) }),
          E('span', null, label)
        )))
      )
    ),
    E(PdfDocument, { title: 'Reportería institucional', subtitle: 'Reportes oficiales del campeonato activo', championship, meta: [`Jugadores: ${eligiblePlayers.length}`, `Partidas: ${scopedMatches.length}`, `Clasificados: ${seeds.length}`] },
    printSections.summary && E(Card, { className: 'report-page-break report-page-first' },
      E(SectionTitle, { title: 'Resumen por fases', subtitle: 'Estado ejecutivo de grupos, R0, octavos, cuartos, semifinales y final.' }),
      E('div', { className: 'grid grid-4', style: { marginTop: 12 } }, summaries.map((s) => E('div', { key: s.key, className: 'round-card' }, E('b', null, s.label), E('p', { className: 'small' }, `${s.completed}/${s.total} finalizadas · ${s.pending} pendientes`))))
    ),
    printSections.ranking && E(Card, { className: 'report-standings-card report-page-break' },
      E(SectionTitle, { title: 'Ranking final consolidado', subtitle: 'Datos filtrados al campeonato activo y a los jugadores seleccionados. Primero clasificados, luego eliminados y no clasificados.' }),
      E('div', { className: 'table-wrap', style: { marginTop: 12 } }, E('table', { className: 'report-standings-table' },
        E('thead', null, E('tr', null, (avgEnabled ? ['POS', 'Jugador', 'Estado', 'Fase', 'PJ', 'PG', 'PE', 'PP', 'CAR', 'ENTR', 'SM1', 'SM2', 'PROM', 'PTS'] : ['POS', 'Jugador', 'Estado', 'Fase', 'PJ', 'PG', 'PE', 'PP', 'CAR', 'SM1', 'SM2', 'PTS']).map((h) => E('th', { key: h }, h)))),
        E('tbody', null, finalRankings.map((row) => rankingRow(row, avgEnabled)))
      ))
    ),
    printSections.bracket && E(Card, { className: 'report-page-break' },
      E(SectionTitle, { title: 'Reporte detallado de bracket', subtitle: 'Marcador, entradas, series, promedio, ganador, penales y tipo de resultado.' }),
      E('div', { className: 'table-wrap', style: { marginTop: 12 } }, E('table', { className: 'report-bracket-table' },
        E('thead', null, E('tr', null, (avgEnabled ? ['ID', 'Ronda', 'Jugador 1', 'Jugador 2', 'Marcador', 'Entradas', 'SM1', 'SM2', 'Promedio', 'Estado', 'Ganador', 'Tipo'] : ['ID', 'Ronda', 'Jugador 1', 'Jugador 2', 'Marcador', 'SM1', 'SM2', 'Estado', 'Ganador', 'Tipo']).map((h) => E('th', { key: h }, h)))),
        E('tbody', null, eliminationMatches.map((m) => matchReportRow(m, playerMap, avgEnabled)))
      ))
    ),
    printSections.report5 && E(Card, { className: 'report-page-break' },
      E(SectionTitle, { title: 'Reporte 5 preliminar', subtitle: 'Vista previa de reclasificación antes de cierre administrativo.' }),
      E('div', { className: 'table-wrap', style: { marginTop: 12 } }, E('table', { className: 'report5-table' },
        E('thead', null, E('tr', null, ['Jugador', 'División previa', 'AVG previo', 'AVG torneo', 'Partidas válidas', 'Mínimo', 'División sugerida', 'Movimiento'].map((h) => E('th', { key: h }, h)))),
        E('tbody', null, report5.map((r) => E('tr', { key: r.player_id }, E('td', null, playerName(r.player)), E('td', null, r.previous_division), E('td', null, fmtAvg(r.previous_average)), E('td', null, fmtAvg(r.avg_at_close)), E('td', null, r.valid_matches), E('td', null, r.minimum_required), E('td', null, r.suggested_division), E('td', null, r.movement))))
      ))
    ),
    printSections.firstPhase && E(Card, { className: 'report-standings-card report-page-break first-phase-qualified-report' },
      E(SectionTitle, { title: 'Clasificados de primera fase', subtitle: 'Misma estructura del ordenamiento final de fase de grupos.' }),
      E('div', { className: 'table-wrap', style: { marginTop: 12 } }, E('table', { className: 'report-standings-table first-phase-table' },
        E('thead', null, E('tr', null, (avgEnabled ? ['ORDEN', 'GRUPO', 'POS', 'JUGADOR', 'PJ', 'PG', 'PE', 'PP', 'CAR', 'ENTR', 'SM1', 'SM2', 'PROM', 'PUNTOS'] : ['ORDEN', 'GRUPO', 'POS', 'JUGADOR', 'PJ', 'PG', 'PE', 'PP', 'CAR', 'SM1', 'SM2', 'PUNTOS']).map((h) => E('th', { key: h }, h)))),
        E('tbody', null, firstPhaseQualifiedRows.map((row, index) => {
          return E('tr', { key: `${row.group_name || row.group_id}-${row.player.player_id}`, className: 'qualified-row' },
            E('td', null, index + 1), E('td', null, row.group_name || row.group_id || '-'), E('td', null, row.group_position), E('td', null, tablePlayerCell(row.player)),
            E('td', null, row.played), E('td', null, row.wins), E('td', null, row.draws), E('td', null, row.losses),
            E('td', null, row.caroms), avgEnabled ? E('td', null, row.innings) : null, E('td', null, row.s1), E('td', null, row.s2), avgEnabled ? E('td', null, fmtAvg(row.avg)) : null, E('td', null, row.points)
          );
        }))
      ))
    ),
    printSections.performance && E(Card, { className: 'report-standings-card report-page-break' },
      E(SectionTitle, { title: 'Posiciones generales por rendimiento', subtitle: 'Vista auxiliar tabular calculada con partidas completadas.' }),
      E('div', { className: 'table-wrap', style: { marginTop: 12 } }, E('table', { className: 'report-standings-table' },
        E('thead', null, E('tr', null, (avgEnabled ? ['POS', 'Jugador', 'PJ', 'PG', 'PE', 'PP', 'CAR', 'ENTR', 'SM1', 'SM2', 'PROM', 'PTS'] : ['POS', 'Jugador', 'PJ', 'PG', 'PE', 'PP', 'CAR', 'SM1', 'SM2', 'PTS']).map((h) => E('th', { key: h }, h)))),
        E('tbody', null, performanceRows.map((s, i) => E('tr', { key: s.player.player_id },
          E('td', null, i + 1), E('td', null, tablePlayerCell(s.player)), E('td', null, s.played), E('td', null, s.wins), E('td', null, s.draws), E('td', null, s.losses), E('td', null, s.caroms), avgEnabled ? E('td', null, s.innings) : null, E('td', null, s.s1), E('td', null, s.s2), avgEnabled ? E('td', null, fmtAvg(s.avg)) : null, E('td', null, s.points)
        )))
      ))
    )
    )
  );
}
