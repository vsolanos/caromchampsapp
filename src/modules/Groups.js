import { useMemo, useState } from 'react';
import { E, Card, Button, Badge, SectionTitle, EmptyState, Select } from '../components/ui.js';
import { PdfControls, PdfDocument } from '../components/Print.js';
import { PlayerHistoryTrigger } from '../components/PlayerHistory.js';
import { startPdfPrint } from '../lib/print.js';
import { calculateTotalQualifiers, fmtAvg, usesAverageControl, playerName, validateChampionship, generateGroups, generateRoundRobinMatches, autoFillMatches, groupStandings, qualify, num, getEligiblePlayers, isInternationalChampionship, matchCode, matchScore, matchDetailedScore, matchPlayerStats, matchDisplayStatus, playerInitials, formatDateEs } from '../lib/tournament.js';

function starPoints(cx, cy, outer, inner, arms = 5) {
  return Array.from({ length: arms * 2 }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI) / arms;
    const radius = index % 2 === 0 ? outer : inner;
    return `${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`;
  }).join(' ');
}

function miniFlag(code = 'CR') {
  const normalized = String(code || 'OTHER').toUpperCase();
  const palette = {
    CR: ['#002b7f', '#ffffff', '#ce1126', '#ffffff', '#002b7f'], US: ['#b22234', '#ffffff', '#b22234', '#ffffff', '#3c3b6e'], CA: ['#d52b1e', '#ffffff', '#d52b1e'],
    MX: ['#006847', '#ffffff', '#ce1126'], CO: ['#fcd116', '#003893', '#ce1126'], PA: ['#ffffff', '#005293', '#d21034'], GT: ['#4997d0', '#ffffff', '#4997d0'],
    SV: ['#0047ab', '#ffffff', '#0047ab'], HN: ['#0073cf', '#ffffff', '#0073cf'], NI: ['#0067c6', '#ffffff', '#0067c6'], BZ: ['#003f87', '#ffffff', '#ce1126'],
    AR: ['#75aadb', '#ffffff', '#75aadb'], BR: ['#009c3b', '#ffdf00', '#002776'], CL: ['#0039a6', '#ffffff', '#d52b1e'], PE: ['#d91023', '#ffffff', '#d91023'],
    UY: ['#ffffff', '#0038a8', '#ffffff'], VE: ['#ffcc00', '#0033a0', '#cf142b'], EC: ['#ffdd00', '#034ea2', '#ed1c24'], BO: ['#d52b1e', '#f9e300', '#007934'],
    PY: ['#d52b1e', '#ffffff', '#0038a8'], DO: ['#002d62', '#ffffff', '#ce1126'], CU: ['#002a8f', '#ffffff', '#cf142b'], PR: ['#ed0000', '#ffffff', '#0050f0']
  };
  const colors = palette[normalized] || ['#e2e8f0', '#94a3b8', '#475569'];
  const children = normalized === 'PA' ? [
    E('rect', { key: 'pa-bg', x: 0, y: 0, width: 36, height: 24, fill: '#fff' }),
    E('rect', { key: 'pa-red', x: 18, y: 0, width: 18, height: 12, fill: '#d21034' }),
    E('rect', { key: 'pa-blue', x: 0, y: 12, width: 18, height: 12, fill: '#005293' }),
    E('polygon', { key: 'pa-star-blue', points: starPoints(9, 6, 3.2, 1.35), fill: '#005293' }),
    E('polygon', { key: 'pa-star-red', points: starPoints(27, 18, 3.2, 1.35), fill: '#d21034' })
  ] : normalized === 'DO' ? [
    E('rect', { key: 'do-bg', x: 0, y: 0, width: 36, height: 24, fill: '#fff' }),
    E('rect', { key: 'do-blue-1', x: 0, y: 0, width: 15, height: 9.5, fill: '#002d62' }),
    E('rect', { key: 'do-red-1', x: 21, y: 0, width: 15, height: 9.5, fill: '#ce1126' }),
    E('rect', { key: 'do-red-2', x: 0, y: 14.5, width: 15, height: 9.5, fill: '#ce1126' }),
    E('rect', { key: 'do-blue-2', x: 21, y: 14.5, width: 15, height: 9.5, fill: '#002d62' }),
    E('circle', { key: 'do-seal', cx: 18, cy: 12, r: 2.3, fill: '#ffffff', stroke: '#0f766e', 'strokeWidth': .75 }),
    E('circle', { key: 'do-seal-red', cx: 18, cy: 12, r: .75, fill: '#ce1126' })
  ] : colors.map((color, index) => E('rect', { key: `${normalized}-${index}`, x: 0, y: index * (24 / colors.length), width: 36, height: 24 / colors.length + 0.1, fill: color }));
  return E('span', { className: 'flag-icon flag-only flag-polished', title: normalized }, E('svg', { viewBox: '0 0 36 24', role: 'img', 'aria-label': normalized }, ...children, E('rect', { x: .5, y: .5, width: 35, height: 23, rx: 2.5, fill: 'none', stroke: 'rgba(15,23,42,.28)', 'strokeWidth': 1 })));
}

function GroupPlayerAvatar({ player }) {
  if (player?.photo_url) return E('img', { className: 'group-player-avatar', src: player.photo_url, alt: playerName(player), onError: (e) => { e.currentTarget.style.display = 'none'; } });
  return E('span', { className: 'group-player-avatar placeholder' }, playerInitials(player));
}

function isAllGroupMatchesCompleted(matches) {
  const groupMatches = matches.filter((m) => m.phase === 'GROUPS');
  return groupMatches.length > 0 && groupMatches.every((m) => m.match_status === 'COMPLETED');
}

function isQualified(row, seeds, allComplete) {
  return allComplete && seeds.some((s) => s.player.player_id === row.player.player_id);
}

function classificationLabel(row, seeds, allComplete) {
  if (!allComplete) return E('span', { className: 'classification-badge class-no-definido' }, 'No Definido');
  return isQualified(row, seeds, allComplete)
    ? E('span', { className: 'classification-badge class-calificado' }, 'Calificado')
    : E('span', { className: 'classification-badge class-no-calificado' }, 'No calificado');
}

function playerCell(player, championship) {
  const intl = isInternationalChampionship(championship);
  return E('div', { className: 'group-standings-player-cell' },
    E('div', { className: 'group-standings-player-main aligned-flag-player' },
      E('span', { className: 'player-flag-slot' }, miniFlag(player.country_iso)),
      E('span', { className: 'group-standings-player-name' }, E('b', null, E(PlayerHistoryTrigger, { player })))
    ),
    E('div', { className: 'small player-submeta aligned-player-submeta' }, intl ? (player.country_iso || '-') : (player.association_code || '-'))
  );
}

function standingsTable(rows, championship, seeds, allComplete) {
  const avgEnabled = usesAverageControl(championship);
  const headers = avgEnabled
    ? ['POS', 'JUGADOR', 'PJ', 'PG', 'PE', 'PP', 'CAR', 'ENTR', 'SM1', 'SM2', 'PROM', 'PUNTOS', 'CLASIFICACIÓN']
    : ['POS', 'JUGADOR', 'PJ', 'PG', 'PE', 'PP', 'CAR', 'SM1', 'SM2', 'PUNTOS', 'CLASIFICACIÓN'];
  return E('div', { className: 'table-wrap' }, E('table', { className: 'group-standings-table' },
    E('thead', null, E('tr', null, headers.map((h) => E('th', { key: h }, h)))),
    E('tbody', null, rows.map((row) => E('tr', { key: row.player.player_id, className: isQualified(row, seeds, allComplete) ? 'qualified-row' : '' },
      E('td', null, row.group_position),
      E('td', null, playerCell(row.player, championship)),
      E('td', null, row.played), E('td', null, row.wins), E('td', null, row.draws), E('td', null, row.losses),
      E('td', null, row.caroms),
      avgEnabled ? E('td', null, row.innings) : null,
      E('td', null, row.s1), E('td', null, row.s2 || 0),
      avgEnabled ? E('td', null, fmtAvg(row.avg)) : null,
      E('td', null, row.points), E('td', null, classificationLabel(row, seeds, allComplete))
    )))
  ));
}

function assignmentSeedNumber(player) {
  return player.seed_number || player.championship_seed_number || player.no_cbz || '-';
}

function assignmentTable(group, swapSelection = [], onGroupRowSelect = null, mutationMode = '') {
  return E('div', { className: 'table-wrap', style: { marginTop: 12 } }, E('table', { className: `group-assignment-table ${mutationMode ? 'group-mutation-active' : ''}` },
    E('thead', null, E('tr', null, ['Orden', 'Jugador', 'País', 'Asociación', 'No CBZ'].map((h) => E('th', { key: h }, h)))),
    E('tbody', null, group.players.map((player, index) => {
      const selected = swapSelection.some((item) => item.player_id === player.player_id && item.group_id === group.group_id);
      const modeClass = mutationMode ? ` mutation-mode-${mutationMode}` : '';
      return E('tr', { key: player.player_id, className: `${selected ? 'swap-selected' : ''}${modeClass}`.trim(), onClick: (event) => { if (event.target.closest?.('.player-history-trigger')) return; onGroupRowSelect && onGroupRowSelect(group, player, index); } },
      E('td', null, index + 1),
      E('td', null, E('div', { className: 'group-player-cell' }, E(GroupPlayerAvatar, { player }), E('b', null, E(PlayerHistoryTrigger, { player })))),
      E('td', null, miniFlag(player.country_iso)),
      E('td', null, player.country_iso === 'CR' ? player.association_code : 'INTERNACIONAL'),
      E('td', null, assignmentSeedNumber(player))
    );
    }))
  ));
}

function groupAgenda(group, matches, playersById, championship = {}) {
  const avgEnabled = usesAverageControl(championship);
  const rows = matches.filter((m) => m.group_id === group.group_id).sort((a, b) => `${a.scheduled_date || ''} ${a.scheduled_time || ''} ${matchCode(a)}`.localeCompare(`${b.scheduled_date || ''} ${b.scheduled_time || ''} ${matchCode(b)}`));
  if (!rows.length) return E('p', { className: 'small' }, 'Sin partidas generadas para este grupo.');
  const headers = avgEnabled
    ? ['ID', 'Fecha', 'Hora', 'Mesa', 'Jugador 1', 'Jugador 2', 'Marcador', 'Entradas', 'Promedios', 'Estado']
    : ['ID', 'Fecha', 'Hora', 'Mesa', 'Jugador 1', 'Jugador 2', 'Marcador', 'Estado'];
  return E('div', { className: 'table-wrap group-agenda-wrap', style: { marginTop: 12 } }, E('table', { className: 'group-agenda-table' },
    E('thead', null, E('tr', null, headers.map((h) => E('th', { key: h }, h)))),
    E('tbody', null, rows.map((m) => {
      const a = matchPlayerStats(m, 1);
      const b = matchPlayerStats(m, 2);
      return E('tr', { key: m.match_id, className: m.match_status === 'COMPLETED' ? 'agenda-completed-row completed-row' : '' },
        E('td', null, matchCode(m)), E('td', null, formatDateEs(m.scheduled_date)), E('td', null, m.scheduled_time || '-'), E('td', null, m.assigned_table || '-'),
        E('td', null, E(PlayerHistoryTrigger, { player: playersById[m.player1_id] })), E('td', null, E(PlayerHistoryTrigger, { player: playersById[m.player2_id] })),
        E('td', { className: 'agenda-score-cell' }, m.match_status === 'COMPLETED' ? matchScore(m) : '-'),
        avgEnabled ? E('td', null, m.match_status === 'COMPLETED' ? `${a.innings}/${b.innings}` : '-') : null,
        avgEnabled ? E('td', null, m.match_status === 'COMPLETED' ? `${a.avg}/${b.avg}` : '-') : null,
        E('td', { className: 'agenda-status-cell' }, E(Badge, { kind: m.match_status === 'COMPLETED' ? 'success' : m.schedule_conflict ? 'danger' : 'neutral' }, m.match_status === 'COMPLETED' ? 'Finalizada' : (m.schedule_conflict ? 'Conflicto' : matchDisplayStatus(m))))
      );
    }))
  ));
}

function unifiedPhaseTable(standings, championship, seeds, allComplete) {
  const avgEnabled = usesAverageControl(championship);
  const rows = standings.flatMap((group) => group.standings.map((row) => ({ ...row, group_name: group.group_name })))
    .sort((a, b) => avgEnabled
      ? a.group_position - b.group_position || b.points - a.points || (b.avg || 0) - (a.avg || 0) || b.s1 - a.s1 || b.s2 - a.s2
      : a.group_position - b.group_position || b.points - a.points || b.wins - a.wins || a.losses - b.losses || b.caroms - a.caroms);
  if (!rows.length) return null;
  const headers = avgEnabled
    ? ['ORDEN', 'GRUPO', 'POS', 'JUGADOR', 'PJ', 'PG', 'PE', 'PP', 'CAR', 'ENTR', 'SM1', 'SM2', 'PROM', 'PUNTOS', 'CLASIFICACIÓN']
    : ['ORDEN', 'GRUPO', 'POS', 'JUGADOR', 'PJ', 'PG', 'PE', 'PP', 'CAR', 'SM1', 'SM2', 'PUNTOS', 'CLASIFICACIÓN'];
  const renderRow = (row, index, offset) => E('tr', { key: `${row.group_name}-${row.player.player_id}`, className: isQualified(row, seeds, allComplete) ? 'qualified-row' : '' },
    E('td', null, offset + index + 1), E('td', null, row.group_name), E('td', null, row.group_position), E('td', null, playerCell(row.player, championship)),
    E('td', null, row.played), E('td', null, row.wins), E('td', null, row.draws), E('td', null, row.losses), E('td', null, row.caroms),
    avgEnabled ? E('td', null, row.innings) : null,
    E('td', null, row.s1), E('td', null, row.s2 || 0),
    avgEnabled ? E('td', null, fmtAvg(row.avg)) : null,
    E('td', null, row.points), E('td', null, classificationLabel(row, seeds, allComplete))
  );
  const renderTable = (items, offset) => E('div', { className: 'table-wrap', style: { marginTop: 14 } }, E('table', null,
    E('thead', null, E('tr', null, headers.map((h) => E('th', { key: h }, h)))),
    E('tbody', null, items.map((row, index) => renderRow(row, index, offset)))
  ));
  const chunkSize = 18;
  const chunks = [];
  for (let i = 0; i < rows.length; i += chunkSize) chunks.push(rows.slice(i, i + chunkSize));
  return E('div', { className: 'groups-final-order-print' }, chunks.map((chunk, pageIndex) => E(Card, { key: `final-order-${pageIndex}`, className: `groups-final-order-page ${pageIndex > 0 ? 'groups-final-order-continuation' : ''}`.trim() },
    E('div', { className: 'section-title' }, E('h2', null, pageIndex === 0 ? 'Orden general de fase de grupos' : 'Orden general de fase de grupos · continuación'), E('p', null, 'Clasificación consolidada según criterios del campeonato.')),
    renderTable(chunk, pageIndex * chunkSize)
  )));
}

function MiniStat({ label, value }) {
  return E('div', { className: 'round-card' }, E('div', { className: 'stat-label' }, label), E('div', { className: 'stat-value' }, value));
}

export function GroupsModule({ championship, setChampionship, players, groups, setGroups, matches, setMatches, seeds, setSeeds, audit }) {
  const avgEnabled = usesAverageControl(championship);
  const standings = useMemo(() => groupStandings(groups, matches, championship), [groups, matches, championship]);
  const enrolled = getEligiblePlayers(championship, players);
  const playersById = Object.fromEntries(players.map((p) => [p.player_id, p]));
  const expectedGroups = Math.max(1, Math.ceil(enrolled.length / num(championship.preferred_group_size, 4)));
  const totalQualifiers = calculateTotalQualifiers(championship, expectedGroups);
  const groupMatches = matches.filter((m) => m.phase === 'GROUPS');
  const completedGroupMatches = groupMatches.filter((m) => m.match_status === 'COMPLETED').length;
  const allComplete = isAllGroupMatchesCompleted(matches);
  const displaySeeds = allComplete ? (seeds.length ? seeds : qualify(standings, championship)) : [];
  const validationErrors = validateChampionship({ ...championship, total_qualifiers_f2: totalQualifiers }, enrolled);
  const [pageSize, setPageSize] = useState(championship.global_settings?.pdf_default_page_size || 'A4');
  const [orientation, setOrientation] = useState(championship.global_settings?.pdf_default_orientation || 'portrait');
  const [scale, setScale] = useState('100');
  const [mutationMode, setMutationMode] = useState('');
  const [swapSelection, setSwapSelection] = useState([]);
  const [substitutePlayerId, setSubstitutePlayerId] = useState('');

  const hasLaterPhase = useMemo(() => matches.some((m) => ['PRE_ELIMINATION', 'KO'].includes(m.phase)), [matches]);
  const canReopenGroups = groups.length > 0 && seeds.length > 0 && championship.status === 'GROUPS_CLOSED' && !hasLaterPhase && !['CLOSED', 'FINALIZED', 'COMPLETED'].includes(championship.status);

  const groupMutationBlockedReason = useMemo(() => {
    if (!groups.length) return '';
    if (['GROUPS_CLOSED', 'COMPLETED', 'FINALIZED', 'CLOSED'].includes(championship.status)) return 'Los grupos ya están cerrados o el campeonato está finalizado. No se permite intercambiar ni sustituir jugadores.';
    if (seeds.length) return 'Ya existen clasificados generados. Para modificar grupos debe regresar a la fase de grupos antes de continuar.';
    if (hasLaterPhase) return 'Ya se generó una fase posterior. No se permite modificar grupos.';
    if (matches.some((m) => m.phase === 'GROUPS' && ['COMPLETED', 'LOCKED'].includes(m.match_status))) return 'Existen partidas de grupos finalizadas. No se permite intercambiar ni sustituir jugadores.';
    return '';
  }, [groups.length, championship.status, seeds.length, matches, hasLaterPhase]);

  const clearMutationState = () => {
    setSwapSelection([]);
    setSubstitutePlayerId('');
  };

  const ensureGroupsEditable = () => {
    if (groupMutationBlockedReason) { alert(groupMutationBlockedReason); clearMutationState(); setMutationMode(''); return false; }
    return true;
  };

  const startMutationMode = (mode) => {
    if (!ensureGroupsEditable()) return;
    setMutationMode(mode);
    clearMutationState();
  };

  const buildTournament = (withRandomResults) => {
    if (championship.championship_type === 'RANKING') return alert('Los campeonatos tipo Ranking no generan grupos. Se alimentan de campeonatos normales asociados.');
    const cfg = { ...championship, total_qualifiers_f2: totalQualifiers };
    const errors = validateChampionship(cfg, enrolled);
    if (errors.length) return alert(errors.join('\n'));
    if ((groups.length || matches.length) && !window.confirm('Ya existen grupos y/o partidas generadas. Si vuelve a generar grupos se eliminarán las posiciones actuales, partidas, resultados, clasificados y fases posteriores asociadas. ¿Desea continuar?')) return;
    const generatedGroups = generateGroups(cfg, players);
    const generatedMatches = generateRoundRobinMatches(cfg, generatedGroups, 1);
    const finalMatches = withRandomResults ? autoFillMatches(generatedMatches, `${cfg.random_seed}-groups`) : generatedMatches;
    setChampionship({ ...cfg, status: withRandomResults ? 'IN_PROGRESS_GROUPS' : 'CONFIGURED' });
    setGroups(generatedGroups);
    setMatches(finalMatches);
    setSeeds([]);
    audit(withRandomResults ? 'GROUPS_RANDOM_RESULTS' : 'GROUPS_GENERATED', `${generatedGroups.length} grupos y ${finalMatches.length} partidas.`);
  };

  const classify = () => {
    const pending = matches.filter((m) => m.phase === 'GROUPS' && m.match_status !== 'COMPLETED');
    if (pending.length) return alert('Hay partidas de grupos pendientes. Complete resultados antes de clasificar.');
    const qualified = qualify(standings, championship);
    setSeeds(qualified);
    const doubleGroups = championship.championship_type === 'DOBLE_FASE_GRUPOS';
    setChampionship({ ...championship, status: doubleGroups ? 'GROUPS_F2_READY' : 'GROUPS_CLOSED', seeds_f1: doubleGroups ? qualified : championship.seeds_f1 });
    audit('QUALIFIED_GENERATED', doubleGroups ? `${qualified.length} clasificados para Grupos F2.` : `${qualified.length} clasificados.`);
  };

  const reopenGroups = () => {
    if (!canReopenGroups) return alert('Solo se pueden reabrir grupos cerrados/clasificados cuando no existen fases posteriores activas y el campeonato no está cerrado.');
    if (!window.confirm('Esta acción eliminará la clasificación generada y reabrirá la fase de grupos, conservando partidas y resultados de grupos. ¿Desea continuar?')) return;
    setSeeds([]);
    setChampionship({ ...championship, status: 'IN_PROGRESS_GROUPS' });
    audit('GROUPS_REOPENED', 'Grupos reabiertos. Clasificación eliminada; resultados de grupos conservados.');
  };

  const exportGroupsPdf = () => {
    if (!groups.length) return alert('No hay grupos para exportar.');
    startPdfPrint({
      bodyClass: 'printing-groups',
      title: `Grupos - ${championship.name || 'Campeonato'}`,
      pageSize,
      orientation,
      scale,
      afterPrint: () => audit('GROUPS_PDF', 'PDF de grupos generado.')
    });
  };



  const resetMatchResultForSwap = (match) => ({
    ...match,
    caroms_p1: '', caroms_p2: '', innings_p1: '', innings_p2: '', s1_p1: '', s1_p2: '', s2_p1: '', s2_p2: '',
    penalties_p1: '', penalties_p2: '', winner_id: '', match_status: match.match_status === 'LOCKED' ? 'CREATED' : 'CREATED',
    validation_error: '', edit_reason: '', reopened_reason: 'Intercambio de jugadores entre grupos'
  });

  const swapPlayersInGroupRows = (first, second) => {
    if (!first || !second) return;
    if (!ensureGroupsEditable()) return;
    const affectedIds = [first.player_id, second.player_id];
    const affectedCompleted = matches.some((m) => m.phase === 'GROUPS' && (affectedIds.includes(m.player1_id) || affectedIds.includes(m.player2_id)) && ['COMPLETED', 'LOCKED'].includes(m.match_status));
    if (affectedCompleted) return alert('No se permite intercambiar jugadores cuando alguno tiene partidas de grupos finalizadas.');
    const updatedGroups = groups.map((group) => ({
      ...group,
      players: group.players.map((player) => {
        if (player.player_id === first.player_id) return second.player;
        if (player.player_id === second.player_id) return first.player;
        return player;
      })
    }));
    const swappedMatches = matches.map((match) => {
      if (match.phase !== 'GROUPS') return match;
      let next = { ...match };
      if (next.player1_id === first.player_id) next.player1_id = second.player_id;
      else if (next.player1_id === second.player_id) next.player1_id = first.player_id;
      if (next.player2_id === first.player_id) next.player2_id = second.player_id;
      else if (next.player2_id === second.player_id) next.player2_id = first.player_id;
      if ([first.player_id, second.player_id].includes(match.player1_id) || [first.player_id, second.player_id].includes(match.player2_id)) next = resetMatchResultForSwap(next);
      return next;
    });
    setGroups(updatedGroups);
    setMatches(swappedMatches.filter((m) => !['PRE_ELIMINATION', 'KO'].includes(m.phase)));
    setSeeds([]);
    setSwapSelection([]);
    setSubstitutePlayerId('');
    setMutationMode('');
    audit('GROUP_PLAYER_SWAP', `${playerName(first.player)} (${first.group_name}) intercambiado con ${playerName(second.player)} (${second.group_name}). Clasificación/llaves posteriores limpiadas.`);
  };

  const handleGroupRowSelect = (group, player, positionIndex) => {
    if (!ensureGroupsEditable()) return;
    const pick = { group_id: group.group_id, group_name: group.group_name, player_id: player.player_id, player, positionIndex };

    if (mutationMode === 'substitute') {
      setSwapSelection([pick]);
      setSubstitutePlayerId('');
      return;
    }

    // v4.14: intercambio vuelve a ser el modo predeterminado. El usuario solo
    // activa un modo explícito cuando desea sustituir; si no, dos clics en filas
    // intercambian posiciones de inmediato como en las versiones previas.
    if (!swapSelection.length) { setSwapSelection([pick]); return; }
    const first = swapSelection[0];
    if (first.group_id === pick.group_id && first.player_id === pick.player_id) { clearMutationState(); return; }
    swapPlayersInGroupRows(first, pick);
  };

  const groupedPlayerIds = useMemo(() => new Set(groups.flatMap((group) => group.players.map((player) => player.player_id))), [groups]);
  const championshipPlayerIds = useMemo(() => new Set(championship.selected_player_ids || []), [championship.selected_player_ids]);
  const replacementPlayers = useMemo(() => {
    if (mutationMode !== 'substitute') return [];
    return players
      .filter((player) => !groupedPlayerIds.has(player.player_id) && !championshipPlayerIds.has(player.player_id))
      .sort((a, b) => playerName(a).localeCompare(playerName(b)));
  }, [players, groupedPlayerIds, championshipPlayerIds, mutationMode]);

  const substituteSelectedPlayer = () => {
    if (!swapSelection.length) return alert('Primero seleccione la línea del jugador que desea sustituir.');
    if (!substitutePlayerId) return alert('Seleccione el jugador sustituto desde la base de datos.');
    if (!ensureGroupsEditable()) return;
    const source = swapSelection[0];
    const replacement = players.find((player) => player.player_id === substitutePlayerId);
    if (!replacement) return alert('No se encontró el jugador sustituto.');
    const updatedGroups = groups.map((group) => group.group_id === source.group_id
      ? { ...group, players: group.players.map((player) => player.player_id === source.player_id ? replacement : player) }
      : group);
    const updatedMatches = matches.map((match) => {
      if (match.phase !== 'GROUPS') return match;
      let next = { ...match };
      if (next.player1_id === source.player_id) next.player1_id = replacement.player_id;
      if (next.player2_id === source.player_id) next.player2_id = replacement.player_id;
      return next;
    });
    const selectedIds = championship.selected_player_ids || [];
    const nextSelected = selectedIds.length
      ? Array.from(new Set(selectedIds.map((id) => id === source.player_id ? replacement.player_id : id)))
      : Array.from(new Set([...groups.flatMap((group) => group.players.map((player) => player.player_id)).filter((id) => id !== source.player_id), replacement.player_id]));
    setGroups(updatedGroups);
    setMatches(updatedMatches);
    setChampionship({ ...championship, selected_player_ids: nextSelected });
    setSwapSelection([]);
    setSubstitutePlayerId('');
    setMutationMode('');
    audit('GROUP_PLAYER_SUBSTITUTED', `${playerName(source.player)} sustituido por ${playerName(replacement)} en ${source.group_name}.`);
  };

  const groupsContent = groups.length === 0
    ? E(EmptyState, { title: 'Sin grupos', message: 'Genere grupos desde esta pantalla para iniciar el campeonato.' })
    : E('div', { className: 'grid grid-2 groups-list-print' }, standings.map((group) => E(Card, { key: group.group_id, className: 'group-print-card' },
      E('div', { className: 'group-report-heading' }, E('div', null, E('p', { className: 'group-report-kicker' }, `Número de grupo: ${group.group_number}`), E('h3', { style: { margin: 0 } }, group.group_name)), E(Badge, { kind: 'info' }, `${group.players.length} jugadores`)),
      E('details', { open: true, style: { marginTop: 10 } }, E('summary', { className: 'player-name' }, 'Conformación del grupo'), assignmentTable(group, swapSelection, handleGroupRowSelect, mutationMode)),
      E('details', { open: true, style: { marginTop: 12 } }, E('summary', { className: 'player-name' }, 'Tabla de posiciones'), standingsTable(group.standings, championship, displaySeeds, allComplete)),
      E('details', { open: true, style: { marginTop: 12 } }, E('summary', { className: 'player-name' }, 'Agenda del grupo'), groupAgenda(group, matches, playersById, championship))
    )));

  return E('div', { className: 'grid groups-export-root' },
    E(Card, { className: 'groups-control-card' },
      E(SectionTitle, { title: 'Grupos', subtitle: 'Generación, revisión de conformación, posiciones y agenda por grupo.' }),
      E('div', { className: 'grid grid-4', style: { marginTop: 14 } },
        E(MiniStat, { label: 'Participantes', value: enrolled.length }), E(MiniStat, { label: 'Grupos esperados', value: expectedGroups }), E(MiniStat, { label: 'Clasificados F2', value: totalQualifiers }), E(MiniStat, { label: 'Partidas grupos', value: `${completedGroupMatches}/${groupMatches.length}` })
      ),
      groups.length ? E('div', { className: 'swap-helper-box group-mutation-box' },
        E('div', { className: 'group-mutation-message' },
          E('b', null, 'Intercambio / sustitución de jugadores: '),
          groupMutationBlockedReason ? E('span', { className: 'validation-text' }, groupMutationBlockedReason)
            : mutationMode === 'substitute'
              ? (swapSelection.length ? `Modo sustitución activo: ${playerName(swapSelection[0].player)} seleccionado. Elija el sustituto externo y confirme.` : 'Modo sustitución activo: seleccione el jugador del grupo que desea sustituir.')
              : (swapSelection.length ? `Intercambio predeterminado: seleccione la segunda línea para intercambiar con ${playerName(swapSelection[0].player)} (${swapSelection[0].group_name}).` : 'Intercambio predeterminado activo: seleccione un jugador y luego otro para intercambiarlos de inmediato. Use Sustituir solo cuando necesite ingresar un jugador externo.')
        ),
        E('div', { className: 'toolbar group-mutation-actions' },
          E(Button, { onClick: () => startMutationMode('substitute'), kind: mutationMode === 'substitute' ? 'success' : 'soft', disabled: Boolean(groupMutationBlockedReason) }, 'Modo sustitución'),
          (mutationMode || swapSelection.length) ? E(Button, { onClick: () => { setMutationMode(''); clearMutationState(); }, kind: 'soft' }, mutationMode === 'substitute' ? 'Cancelar sustitución' : 'Cancelar selección') : null
        ),
        mutationMode === 'substitute' && swapSelection.length ? E('div', { className: 'toolbar group-substitution-toolbar' },
          E(Select, { value: substitutePlayerId, onChange: (e) => setSubstitutePlayerId(e.target.value), disabled: Boolean(groupMutationBlockedReason) },
            E('option', { value: '' }, replacementPlayers.length ? 'Seleccionar sustituto no incluido' : 'No hay jugadores externos disponibles'),
            replacementPlayers.map((player) => E('option', { key: player.player_id, value: player.player_id }, `${playerName(player)} · ${player.country_iso || '-'} · ${player.association_code || '-'}`))
          ),
          E(Button, { onClick: substituteSelectedPlayer, kind: 'success', disabled: Boolean(groupMutationBlockedReason) || !replacementPlayers.length }, 'Confirmar sustitución')
        ) : null
      ) : null,
      validationErrors.length ? E('ul', { className: 'small validation-card', style: { padding: 14, marginTop: 14 } }, validationErrors.map((err) => E('li', { key: err }, err))) : null,
      E('div', { className: 'toolbar', style: { marginTop: 14 } },
        E(Button, { onClick: () => buildTournament(false), disabled: validationErrors.length > 0 }, 'Generar grupos'),
        E(Button, { onClick: () => buildTournament(true), kind: 'success', disabled: validationErrors.length > 0 }, 'Generar grupos + resultados'),
        E(Button, { onClick: () => { if (!matches.length) return alert('Primero genere partidas.'); setMatches(autoFillMatches(matches, `${championship.random_seed}-existing`)); audit('RANDOM_RESULTS', 'Resultados aleatorios agregados.'); }, kind: 'success' }, 'Agregar resultados'),
        E(Button, { onClick: classify, kind: 'success' }, 'Clasificar'),
        E(Button, { onClick: reopenGroups, kind: canReopenGroups ? 'warning' : 'soft', disabled: !canReopenGroups }, 'Reabrir grupos'),
        E(Button, { onClick: exportGroupsPdf, kind: 'soft' }, 'Generar PDF')
      ),
      E(PdfControls, { pageSize, setPageSize, orientation, setOrientation, scale, setScale })
    ),
    E('section', { className: 'groups-print-scope' },
      E(PdfDocument, { title: 'Reporte de Grupos', subtitle: 'Conformación, posiciones y agenda por grupo', championship, meta: [`Participantes: ${enrolled.length}`, `Grupos: ${groups.length}`, `Partidas: ${groupMatches.length}`] },
        E('div', { className: 'grid grid-4 pdf-summary-strip' },
          E(MiniStat, { label: 'Participantes', value: enrolled.length }), E(MiniStat, { label: 'Grupos', value: groups.length }), E(MiniStat, { label: 'Clasificados F2', value: totalQualifiers }), E(MiniStat, { label: 'Partidas grupos', value: `${completedGroupMatches}/${groupMatches.length}` })
        ),
        groupsContent,
        allComplete ? unifiedPhaseTable(standings, championship, displaySeeds, allComplete) : null
      )
    )
  );

}
