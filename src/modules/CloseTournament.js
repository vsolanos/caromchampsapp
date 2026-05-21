import { useMemo, useState } from 'react';
import { E, Card, Button, Input, Field, SectionTitle, Badge } from '../components/ui.js';
import { PdfControls, PdfDocument, PdfHeader } from '../components/Print.js';
import { startPdfPrint } from '../lib/print.js';
import { applyDivisionMovements, buildActaFinal, buildFinalRankings, buildReport5Rows, downloadCsv, fmtAvg, matchDetailedScore, playerName, getEligiblePlayers, formatDateTimeEs, usesAverageControl } from '../lib/tournament.js';

function statusRow(label, value, ready) {
  return E('div', { className: 'round-card' },
    E('b', null, label),
    E('p', { className: 'small' }, value),
    E(Badge, { kind: ready ? 'success' : 'warning' }, ready ? 'OK' : 'Pendiente')
  );
}

function movementKind(movement) {
  if (movement === 'ASCIENDE') return 'success';
  if (movement === 'DESCIENDE') return 'warning';
  if (movement === 'NO EVALUADO') return 'neutral';
  return 'info';
}

export function CloseTournamentModule({ championship, setChampionship, players, setPlayers, matches, setMatches, seeds, audit }) {
  const [pageSize, setPageSize] = useState(championship.global_settings?.pdf_default_page_size || 'A4');
  const [orientation, setOrientation] = useState(championship.global_settings?.pdf_default_orientation || 'portrait');
  const [scale, setScale] = useState('100');
  const [confirmationNote, setConfirmationNote] = useState(championship.confirmation_note || 'Revisado y aprobado por Dirección Técnica FECOBI.');
  const [confirmAll, setConfirmAll] = useState(false);
  const avgEnabled = usesAverageControl(championship);
  const eligiblePlayers = getEligiblePlayers(championship, players);
  const allowedIds = new Set(eligiblePlayers.map((p) => p.player_id));
  const scopedMatches = matches.filter((m) => {
    const ids = [m.player1_id, m.player2_id, m.winner_id].filter(Boolean).filter((id) => !String(id).startsWith('WINNER:'));
    return ids.length === 0 || ids.some((id) => allowedIds.has(id));
  });
  const groupMatches = scopedMatches.filter((m) => m.phase === 'GROUPS');
  const elimMatches = scopedMatches.filter((m) => ['PRE_ELIMINATION', 'KO'].includes(m.phase));
  const finalMatch = scopedMatches.find((m) => m.phase === 'KO' && m.ko_round === 'F');
  const groupsReady = groupMatches.length > 0 && groupMatches.every((m) => m.match_status === 'COMPLETED');
  const bracketReady = elimMatches.length > 0 && elimMatches.every((m) => m.match_status === 'COMPLETED');
  const finalReady = Boolean(finalMatch && finalMatch.match_status === 'COMPLETED' && finalMatch.winner_id);
  const sportReady = groupsReady && bracketReady && finalReady;
  const finalRankings = buildFinalRankings(eligiblePlayers, scopedMatches, seeds, championship);
  const acta = buildActaFinal(championship, eligiblePlayers, scopedMatches, seeds);
  const [reportRows, setReportRows] = useState(() => buildReport5Rows(eligiblePlayers, scopedMatches, championship));
  const report5 = useMemo(() => reportRows.map((r) => ({ ...r, confirmed: confirmAll ? true : r.confirmed })), [reportRows, confirmAll]);

  const refreshReport5 = () => setReportRows(buildReport5Rows(eligiblePlayers, scopedMatches, championship));
  const toggleRow = (playerId) => setReportRows(reportRows.map((r) => r.player_id === playerId ? { ...r, confirmed: !r.confirmed } : r));
  const setObservation = (playerId, observation) => setReportRows(reportRows.map((r) => r.player_id === playerId ? { ...r, observation } : r));

  const finalizeSport = () => {
    if (!sportReady) return alert('No se puede finalizar deportivamente: faltan grupos, fase final o final por completar.');
    setChampionship({ ...championship, status: 'FINALIZED', finalized_at: formatDateTimeEs(new Date()), finalized_by: 'ADMIN_GLOBAL' });
    audit('SPORT_FINALIZED', 'Cierre deportivo ejecutado. Ranking final congelado pendiente de Reporte 5.');
  };

  const completeAdministrative = () => {
    const confirmedRows = avgEnabled ? report5.filter((r) => r.confirmed && r.avg_at_close !== null && r.avg_at_close !== undefined) : report5.filter((r) => r.confirmed);
    if (championship.status !== 'FINALIZED') return alert('Primero ejecute el cierre deportivo FINALIZED.');
    if (!confirmedRows.length) return alert('Debe confirmar al menos una fila válida del Reporte 5 o usar Confirmar todo.');
    if (!confirmationNote.trim()) return alert('Debe agregar nota de confirmación administrativa.');
    setPlayers(applyDivisionMovements(players, report5, confirmationNote, championship));
    setChampionship({ ...championship, status: 'COMPLETED', closed_at: formatDateTimeEs(new Date()), closed_by: 'ADMIN_GLOBAL', division_movements_confirmed: true, confirmation_note: confirmationNote });
    audit('ADMIN_COMPLETED', `Cierre administrativo confirmado. Movimientos aplicados: ${confirmedRows.length}.`);
  };

  const exportReport5 = () => downloadCsv('reporte_5_reclasificacion.csv', report5.map((r) => ({
    Jugador: playerName(r.player),
    Division_previa: r.previous_division,
    ...(avgEnabled ? { AVG_previo: fmtAvg(r.previous_average), AVG_torneo: fmtAvg(r.avg_at_close), Partidas_validas: r.valid_matches, Minimo_requerido: r.minimum_required } : { Partidas_validas: r.valid_matches }),
    Division_sugerida: avgEnabled ? r.suggested_division : r.previous_division,
    Movimiento: avgEnabled ? r.movement : 'NO EVALUADO',
    Confirmacion: r.confirmed ? 'Aprobado' : 'Pendiente',
    Observacion: r.observation || ''
  })));

  const exportActa = () => downloadCsv('acta_final_institucional.csv', [
    { Seccion: 'Campeonato', Dato: acta.championship },
    { Seccion: 'Sede', Dato: acta.venue || '' },
    { Seccion: 'Campeon', Dato: acta.champion ? playerName(acta.champion.player) : '' },
    { Seccion: 'Subcampeon', Dato: acta.runnerUp ? playerName(acta.runnerUp.player) : '' },
    ...(avgEnabled ? [{ Seccion: 'Mejor_AVG', Dato: acta.bestAvg ? `${playerName(acta.bestAvg.player)} · ${fmtAvg(acta.bestAvg.avg)}` : '' }] : []),
    { Seccion: 'Serie_Mayor', Dato: acta.bestSeries ? `${playerName(acta.bestSeries.player)} · ${acta.bestSeries.s1}` : '' },
    { Seccion: 'Fecha_emision', Dato: acta.date }
  ]);

  const exportClosePdf = () => startPdfPrint({
    bodyClass: 'printing-close',
    title: `Cierre - ${championship.name || 'Campeonato'}`,
    pageSize,
    orientation,
    scale
  });

  return E('div', { className: 'grid close-export-root' },
    E(Card, { className: 'close-control-card' },
      E(SectionTitle, { title: 'Cierre funcional deportivo', subtitle: 'FINALIZED congela ranking deportivo. COMPLETED aplica Reporte 5 y actualiza divisiones.' }),
      E('div', { className: 'grid grid-4', style: { marginTop: 14 } },
        statusRow('Grupos', `${groupMatches.filter((m) => m.match_status === 'COMPLETED').length}/${groupMatches.length} finalizadas`, groupsReady),
        statusRow('Fase final', `${elimMatches.filter((m) => m.match_status === 'COMPLETED').length}/${elimMatches.length} finalizadas`, bracketReady),
        statusRow('Final', finalMatch ? matchDetailedScore(finalMatch) : 'No generada', finalReady),
        statusRow('Estado', championship.status, championship.status === 'FINALIZED' || championship.status === 'COMPLETED')
      ),
      E('div', { className: 'toolbar', style: { marginTop: 14 } },
        E(Button, { onClick: finalizeSport, kind: sportReady ? 'success' : 'warning' }, 'Ejecutar cierre deportivo'),
        E(Button, { onClick: completeAdministrative, kind: championship.status === 'FINALIZED' ? 'success' : 'warning' }, 'Completar cierre administrativo'),
        E(Button, { onClick: exportActa, kind: 'soft' }, 'Exportar acta final'),
        E(Button, { onClick: exportClosePdf, kind: 'soft' }, 'Imprimir / PDF')
      ),
      E(PdfControls, { pageSize, setPageSize, orientation, setOrientation, scale, setScale }),
      E(PdfHeader, { title: 'Cierre deportivo y administrativo', subtitle: avgEnabled ? 'Acta final, Reporte 5 y ranking de cierre' : 'Acta final y ranking sin control de promedios', championship, meta: [`Estado: ${championship.status}`, `Jugadores: ${eligiblePlayers.length}`, `Partidas: ${scopedMatches.length}`, `Control promedios: ${avgEnabled ? 'Sí' : 'No'}`] }),
      championship.finalized_at ? E('p', { className: 'small' }, `Finalizado deportivamente: ${championship.finalized_at} por ${championship.finalized_by}`) : null,
      championship.closed_at ? E('p', { className: 'small' }, `Completado administrativamente: ${championship.closed_at} por ${championship.closed_by}`) : null
    ),
    E(Card, null,
      E(SectionTitle, { title: 'Acta final institucional', subtitle: 'Podio, récords y datos mínimos para archivo/publicación.' }),
      E('div', { className: 'grid grid-4', style: { marginTop: 12 } },
        E('div', { className: 'round-card champion-card' }, E('b', null, 'Campeón'), E('p', null, acta.champion ? playerName(acta.champion.player) : '-'), E('p', { className: 'small' }, acta.champion ? `${avgEnabled ? `AVG ${fmtAvg(acta.champion.avg)} · ` : ''}${acta.champion.points} pts` : 'Pendiente')),
        E('div', { className: 'round-card' }, E('b', null, 'Subcampeón'), E('p', null, acta.runnerUp ? playerName(acta.runnerUp.player) : '-'), E('p', { className: 'small' }, acta.runnerUp ? `${avgEnabled ? `AVG ${fmtAvg(acta.runnerUp.avg)} · ` : ''}${acta.runnerUp.points} pts` : 'Pendiente')),
        avgEnabled ? E('div', { className: 'round-card' }, E('b', null, 'Mejor AVG'), E('p', null, acta.bestAvg ? playerName(acta.bestAvg.player) : '-'), E('p', { className: 'small' }, acta.bestAvg ? fmtAvg(acta.bestAvg.avg) : 'Pendiente')) : E('div', { className: 'round-card' }, E('b', null, 'Control de promedios'), E('p', null, 'No'), E('p', { className: 'small' }, 'Entradas y AVG no aplican')),
        E('div', { className: 'round-card' }, E('b', null, 'Serie mayor'), E('p', null, acta.bestSeries ? playerName(acta.bestSeries.player) : '-'), E('p', { className: 'small' }, acta.bestSeries ? acta.bestSeries.s1 : 'Pendiente'))
      )
    ),
    E(Card, null,
      E(SectionTitle, { title: avgEnabled ? 'Reporte 5 · reclasificación de divisiones' : 'Reporte 5 · sin control de promedios', subtitle: avgEnabled ? 'AVG final, mínimo de partidas, división sugerida, movimiento y confirmación administrativa.' : 'Control de promedios desactivado: no se evalúan entradas ni AVG para reclasificación.' }),
      E('div', { className: 'toolbar', style: { marginTop: 12 } },
        E(Button, { onClick: refreshReport5, kind: 'soft' }, 'Recalcular Reporte 5'),
        E(Button, { onClick: () => setConfirmAll(!confirmAll), kind: confirmAll ? 'warning' : 'success' }, confirmAll ? 'Quitar confirmar todo' : 'Confirmar todo'),
        E(Button, { onClick: exportReport5, kind: 'soft' }, 'Exportar Reporte 5')
      ),
      E('div', { className: 'grid grid-2', style: { marginTop: 12 } },
        E(Field, { label: 'Nota de confirmación' }, E(Input, { value: confirmationNote, onChange: (e) => setConfirmationNote(e.target.value) })),
        avgEnabled ? E('div', { className: 'round-card' }, E('b', null, 'Umbrales'), E('p', { className: 'small' }, `1ra >= ${fmtAvg(championship.global_settings?.avg_threshold_1ra)} · 2da >= ${fmtAvg(championship.global_settings?.avg_threshold_2da)} · mínimo ${championship.minimum_matches_for_avg_close || 0}`)) : E('div', { className: 'round-card' }, E('b', null, 'Control de promedios'), E('p', { className: 'small' }, 'Desactivado para este campeonato.'))
      ),
      E('div', { className: 'table-wrap', style: { marginTop: 12 } }, E('table', { className: 'close-report5-table' },
        E('thead', null, E('tr', null, (avgEnabled ? ['Confirmar', 'Jugador', 'División previa', 'AVG previo', 'AVG torneo', 'Partidas válidas', 'Mínimo', 'División sugerida', 'Movimiento', 'Observación'] : ['Confirmar', 'Jugador', 'División previa', 'Partidas válidas', 'Movimiento', 'Observación']).map((h) => E('th', { key: h }, h)))),
        E('tbody', null, report5.map((r) => E('tr', { key: r.player_id, className: r.confirmed || confirmAll ? 'qualified-row' : '' },
          E('td', null, E('input', { type: 'checkbox', checked: Boolean(r.confirmed || confirmAll), onChange: () => toggleRow(r.player_id) })),
          E('td', null, E('b', null, playerName(r.player)), E('div', { className: 'small' }, r.player.player_code || r.player.player_id)),
          E('td', null, r.previous_division),
          avgEnabled ? E('td', null, fmtAvg(r.previous_average)) : null,
          avgEnabled ? E('td', null, fmtAvg(r.avg_at_close)) : null,
          E('td', null, r.valid_matches),
          avgEnabled ? E('td', null, r.minimum_required) : null,
          avgEnabled ? E('td', null, r.suggested_division) : null,
          E('td', null, E(Badge, { kind: avgEnabled ? movementKind(r.movement) : 'neutral' }, avgEnabled ? r.movement : 'NO EVALUADO')),
          E('td', null, E(Input, { value: r.observation || '', onChange: (e) => setObservation(r.player_id, e.target.value), placeholder: 'Comentario administrativo' }))
        )))
      ))
    ),
    E(Card, null,
      E(SectionTitle, { title: 'Top 10 ranking final', subtitle: 'Orden consolidado para reporte de cierre.' }),
      E('div', { className: 'table-wrap', style: { marginTop: 12 } }, E('table', { className: 'close-ranking-table' },
        E('thead', null, E('tr', null, (avgEnabled ? ['POS', 'Jugador', 'Estado', 'Fase', 'PJ', 'AVG', 'PTS'] : ['POS', 'Jugador', 'Estado', 'Fase', 'PJ', 'PTS']).map((h) => E('th', { key: h }, h)))),
        E('tbody', null, finalRankings.slice(0, 10).map((r) => E('tr', { key: r.player.player_id, className: r.final_status === 'Campeón' ? 'qualified-row' : '' },
          E('td', null, r.final_position),
          E('td', null, playerName(r.player)),
          E('td', null, r.final_status),
          E('td', null, r.final_phase),
          E('td', null, r.played),
          avgEnabled ? E('td', null, fmtAvg(r.avg)) : null,
          E('td', null, r.points)
        )))
      ))
    )
  );
}
