import { useMemo, useRef, useState } from 'react';
import { E, Card, Button, Badge, EmptyState, Field, Select, SectionTitle, Input } from '../components/ui.js';
import { PdfControls, PdfDocument } from '../components/Print.js';
import { PlayerHistoryTrigger } from '../components/PlayerHistory.js';
import { startPdfPrint } from '../lib/print.js';
import {
  autoFillMatches,
  generateBracketStructure,
  generateMainBracketAfterPre,
  generateInitialRoundFromSeeds,
  generateNextRound,
  mergeWithProjectedSchedule,
  latestActiveKoRound,
  matchCode,
  matchDetailedScore,
  matchDisplayStatus,
  matchPlayerStats,
  matchRoundKey,
  matchRoundLabel,
  playerInitials,
  playerName,
  roundDisplayName,
  resolveMatchPlayer,
  fmtAvg,
  usesAverageControl,
  num
} from '../lib/tournament.js';

const FLAG_STRIPES = {
  CR: ['#002b7f', '#ffffff', '#ce1126', '#ce1126', '#ffffff', '#002b7f'],
  CO: ['#fcd116', '#fcd116', '#003893', '#ce1126'],
  MX: ['#006847', '#ffffff', '#ce1126'],
  PA: ['#ffffff', '#005293', '#d21034'],
  US: ['#b22234', '#ffffff', '#b22234', '#ffffff', '#3c3b6e'],
  VE: ['#fcd116', '#003893', '#ce1126'],
  EC: ['#ffdd00', '#ffdd00', '#034ea2', '#ed1c24'],
  AR: ['#74acdf', '#ffffff', '#f6b40e', '#ffffff', '#74acdf'],
  BR: ['#009b3a', '#ffdf00', '#002776'],
  CL: ['#ffffff', '#0039a6', '#d52b1e'],
  PE: ['#d91023', '#ffffff', '#d91023'],
  OTHER: ['#cbd5e1', '#f8fafc', '#94a3b8']
};

function roundOrder(round) {
  const order = { R0: 0, R128: 1, R64: 2, R32: 3, R16: 4, QF: 5, SF: 6, F: 7 };
  return order[round] ?? 99;
}

function shortRound(round) {
  const labels = { R0: 'R0', R128: 'R128', R64: 'R64', R32: 'Dieciseisavos', R16: 'Octavos', QF: 'Cuartos', SF: 'Semis', F: 'Final' };
  return labels[round] || roundDisplayName(round);
}

function mergeById(original, updates) {
  const updateMap = new Map(updates.map((m) => [m.match_id, m]));
  return original.map((m) => updateMap.get(m.match_id) || m);
}

function safeFileName(value) {
  return String(value || 'bracket-fecobi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function starPoints(cx, cy, outer, inner, arms = 5) {
  return Array.from({ length: arms * 2 }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI) / arms;
    const radius = index % 2 === 0 ? outer : inner;
    return `${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`;
  }).join(' ');
}

function flagShapes(normalized, colors) {
  if (normalized === 'PA') {
    return [
      E('rect', { key: 'pa-bg', x: 0, y: 0, width: 36, height: 24, fill: '#ffffff' }),
      E('rect', { key: 'pa-red', x: 18, y: 0, width: 18, height: 12, fill: '#d21034' }),
      E('rect', { key: 'pa-blue', x: 0, y: 12, width: 18, height: 12, fill: '#005293' }),
      E('polygon', { key: 'pa-star-blue', points: starPoints(9, 6, 3.2, 1.35), fill: '#005293' }),
      E('polygon', { key: 'pa-star-red', points: starPoints(27, 18, 3.2, 1.35), fill: '#d21034' })
    ];
  }
  if (normalized === 'DO') {
    return [
      E('rect', { key: 'do-bg', x: 0, y: 0, width: 36, height: 24, fill: '#ffffff' }),
      E('rect', { key: 'do-blue-1', x: 0, y: 0, width: 15, height: 9.5, fill: '#002d62' }),
      E('rect', { key: 'do-red-1', x: 21, y: 0, width: 15, height: 9.5, fill: '#ce1126' }),
      E('rect', { key: 'do-red-2', x: 0, y: 14.5, width: 15, height: 9.5, fill: '#ce1126' }),
      E('rect', { key: 'do-blue-2', x: 21, y: 14.5, width: 15, height: 9.5, fill: '#002d62' }),
      E('circle', { key: 'do-seal', cx: 18, cy: 12, r: 2.3, fill: '#ffffff', stroke: '#0f766e', 'strokeWidth': .75 }),
      E('circle', { key: 'do-seal-red', cx: 18, cy: 12, r: .75, fill: '#ce1126' })
    ];
  }
  if (normalized === 'CR') {
    return [
      E('rect', { key: 'cr-blue-top', x: 0, y: 0, width: 36, height: 4, fill: '#002b7f' }),
      E('rect', { key: 'cr-white-top', x: 0, y: 4, width: 36, height: 4, fill: '#ffffff' }),
      E('rect', { key: 'cr-red', x: 0, y: 8, width: 36, height: 8, fill: '#ce1126' }),
      E('rect', { key: 'cr-white-bottom', x: 0, y: 16, width: 36, height: 4, fill: '#ffffff' }),
      E('rect', { key: 'cr-blue-bottom', x: 0, y: 20, width: 36, height: 4, fill: '#002b7f' })
    ];
  }
  const stripeHeight = 24 / colors.length;
  return colors.map((color, index) => E('rect', { key: `${normalized}-${index}`, x: 0, y: index * stripeHeight, width: 36, height: stripeHeight + 0.1, fill: color }));
}

function Flag({ code = 'CR' }) {
  const normalized = String(code || 'OTHER').toUpperCase();
  const colors = FLAG_STRIPES[normalized] || FLAG_STRIPES.OTHER;
  return E('span', { className: 'flag-icon bracket-flag flag-polished', title: normalized },
    E('svg', { viewBox: '0 0 36 24', role: 'img', 'aria-label': normalized, focusable: 'false' },
      E('rect', { x: 0, y: 0, width: 36, height: 24, rx: 3, fill: '#ffffff' }),
      ...flagShapes(normalized, colors),
      E('rect', { x: .5, y: .5, width: 35, height: 23, rx: 2.5, fill: 'none', stroke: 'rgba(15,23,42,.28)', 'strokeWidth': 1 })
    )
  );
}

function Avatar({ player }) {
  if (player?.photo_url) return E('img', { className: 'bracket-avatar', src: player.photo_url, alt: playerName(player), onError: (e) => { e.currentTarget.style.display = 'none'; } });
  return E('div', { className: 'bracket-avatar placeholder' }, playerInitials(player));
}

function playerMetricRow(stats, avgEnabled = true) {
  return E('div', { className: 'bracket-stat-row' },
    E('span', { className: 'bracket-metric-item' }, E('b', { className: 'bracket-metric-label' }, 'CAR'), ' ', stats.caroms),
    avgEnabled ? E('span', { className: 'bracket-metric-item' }, E('b', { className: 'bracket-metric-label' }, 'ENT'), ' ', stats.innings) : null,
    avgEnabled ? E('span', { className: 'bracket-metric-item' }, E('b', { className: 'bracket-metric-label' }, 'PROM'), ' ', stats.avg) : null
  );
}

function PlayerLine({ match, playerMap, side, compact = false, allMatches = [], championship = {} }) {
  const stats = matchPlayerStats(match, side);
  const resolved = resolveMatchPlayer(match, side, allMatches, playerMap);
  const player = resolved.player || playerMap[stats.player_id];
  const seed = side === 1 ? match.seed1_position : match.seed2_position;
  return E('div', { className: `bracket-player-line ${stats.is_winner ? 'winner' : ''} ${compact ? 'compact' : ''}` },
    E('div', { className: 'bracket-seed' }, seed || '-'),
    E(Avatar, { player }),
    E('div', { className: 'bracket-player-info' },
      E('div', { className: 'bracket-name-line' }, E(Flag, { code: player?.country_iso }), E('b', null, player ? E(PlayerHistoryTrigger, { player }) : resolved.label)),
      playerMetricRow(stats, usesAverageControl(championship)),
      compact ? null : E('div', { className: 'bracket-serie-row' }, `SM1 ${stats.s1} · SM2 ${stats.s2}${stats.penalties ? ` · PEN ${stats.penalties}` : ''}`)
    ),
    E('div', { className: `bracket-score ${stats.is_winner ? 'winner' : ''}` }, stats.caroms || '-')
  );
}

function MatchCard({ match, playerMap, allMatches = [], roundIndex = 0, connectorHeight = 0, top = 0, cardHeight = 138, isCurrentRound = false, championship = {} }) {
  const winnerName = match.winner_id ? playerName(playerMap[match.winner_id]) : '';
  const cardStyle = {
    top: `${top}px`,
    '--card-height': `${cardHeight}px`,
    height: `${cardHeight}px`,
    minHeight: `${cardHeight}px`,
    width: '100%',
    boxSizing: 'border-box'
  };
  if (roundIndex > 0) cardStyle['--connector-height'] = `${connectorHeight}px`;
  return E('article', { className: `continuous-match ${match.match_status === 'COMPLETED' ? 'completed' : 'pending'} ${roundIndex > 0 ? 'linked-round' : ''} ${match.source_match1_id || match.source_match2_id ? 'source-linked' : ''} ${isCurrentRound ? 'current-round-card' : ''}`, style: cardStyle },
    roundIndex > 0 ? E('span', { className: 'continuous-connector' }) : null,
    E('div', { className: 'continuous-match-head' },
      E('div', null,
        E('b', null, matchCode(match)),
        E('span', { className: 'continuous-round-label' }, ` · ${matchRoundLabel(match)}`),
        E('p', { className: 'continuous-match-meta' }, `Orden ${match.bracket_order || '-'} · ${matchDetailedScore(match, championship)}`)
      ),
      E(Badge, { kind: match.match_status === 'COMPLETED' ? 'success' : 'neutral' }, matchDisplayStatus(match))
    ),
    E('div', { className: 'continuous-player-stack' },
      E(PlayerLine, { match, playerMap, side: 1, allMatches, championship }),
      E(PlayerLine, { match, playerMap, side: 2, allMatches, championship })
    ),
    winnerName ? E('div', { className: 'continuous-winner' },
      E('span', { className: 'winner-label' }, 'Ganador: '),
      E('span', { className: 'winner-name' }, winnerName)
    ) : null
  );
}

function ChampionCard({ finalMatch, playerMap, top = 0 }) {
  if (!finalMatch?.winner_id) return null;
  return E('div', { className: 'champion-premium champion-under-final champion-right-of-final', style: { position: 'absolute', top: `${top}px`, left: 'calc(100% + 180px)', '--champion-left': 'calc(100% + 180px)', zIndex: 4 } },
    E('span', { className: 'champion-link-line', 'aria-hidden': 'true' }),
    E('div', { className: 'trophy' }, '🏆'),
    E('span', null, 'Campeón / Ganador'),
    E('b', null, playerName(playerMap[finalMatch.winner_id])),
    E('small', null, 'Campeonato FECOBI')
  );
}

function ContinuousView({ matches, playerMap }) {
  const rounds = [...new Set(matches.map((m) => matchRoundKey(m)))].sort((a, b) => roundOrder(a) - roundOrder(b));
  const finalMatch = matches.find((m) => matchRoundKey(m) === 'F' && m.winner_id);
  // v4.7: use one unified card geometry for every round, including the active
  // round. The active round is highlighted only at column level; it no longer
  // receives a different card template, which prevents the final/current phase
  // from collapsing or mixing with the champion node. R0 remains an aligned feeder.
  const cardHeight = 332;
  const rowGap = 30;
  const slot = cardHeight + rowGap;
  const columnWidth = 430;
  const columnGap = 58;
  const championReserve = finalMatch ? 720 : 0;
  const hasPreRound = rounds.includes('R0');
  const roundData = rounds.map((round) => ({
    round,
    rows: matches.filter((m) => matchRoundKey(m) === round).sort((a, b) => num(a.bracket_order) - num(b.bracket_order))
  }));
  const mainRoundData = hasPreRound ? roundData.filter((item) => item.round !== 'R0') : roundData;
  const currentRound = [...roundData]
    .reverse()
    .find((item) => item.rows.some((match) => match.match_status !== 'COMPLETED' || !match.winner_id))?.round || rounds[rounds.length - 1] || '';
  const visualIndexForRound = (round) => {
    const index = mainRoundData.findIndex((item) => item.round === round);
    return index >= 0 ? index : 0;
  };
  const baseSlots = Math.max(1, ...mainRoundData.map((item, index) => Math.max(1, item.rows.length) * Math.pow(2, index)), ...roundData.filter((item) => item.round === 'R0').map((item) => Math.max(1, item.rows.length)));
  const finalVisualIndex = visualIndexForRound('F');
  const finalTop = finalVisualIndex >= 0 ? ((Math.pow(2, finalVisualIndex) - 1) * slot) / 2 : 0;
  const championGap = Math.round(cardHeight * 0.25);
  const championHeight = finalMatch ? 132 : 0;
  const requiredHeight = finalMatch ? finalTop + cardHeight + championGap + championHeight + 18 : ((baseSlots - 1) * slot) + cardHeight + 18;
  const stackHeight = Math.max(560, ((baseSlots - 1) * slot) + cardHeight + 18, requiredHeight);

  const cardTopByVisualIndex = (visualIndex, matchIndex) => {
    const block = Math.pow(2, visualIndex);
    return ((block - 1) * slot) / 2 + matchIndex * block * slot;
  };

  const preRoundTop = (match, fallbackIndex) => {
    const firstMain = mainRoundData[0];
    if (!firstMain) return fallbackIndex * slot;
    const targetPosition = num(match.winner_takes_seed_position, 0);
    const targetIndex = firstMain.rows.findIndex((candidate) => num(candidate.seed1_position, 0) === targetPosition || num(candidate.seed2_position, 0) === targetPosition);
    if (targetIndex >= 0) return cardTopByVisualIndex(0, targetIndex);
    return fallbackIndex * slot;
  };

  return E('div', { className: 'bracket-premium-panel bracket-stable-geometry-panel' },
    E('div', { className: `bracket-rounds-continuous bracket-rounds-grid stable-bracket-grid ${hasPreRound ? 'has-pre-round' : ''} ${finalMatch ? 'has-champion-node' : ''}`, style: { '--bracket-column-width': `${columnWidth}px`, '--bracket-column-gap': `${columnGap}px` } }, roundData.map(({ round, rows }, roundIndex) => {
      const isPre = round === 'R0';
      const visualRoundIndex = isPre ? 0 : visualIndexForRound(round);
      const block = Math.pow(2, visualRoundIndex);
      const connectorHeight = !isPre && visualRoundIndex > 0 ? slot * Math.pow(2, visualRoundIndex - 1) : 0;
      const hasChampionForRound = round === 'F' && !!finalMatch;
      return E('section', { key: round, className: `bracket-round-premium round-key-${String(round).toLowerCase()} round-index-${roundIndex} visual-round-index-${visualRoundIndex} ${round === currentRound ? 'current-round-column' : ''} ${isPre ? 'pre-round-column' : ''} ${hasChampionForRound ? 'has-champion-column' : ''}`, style: { minHeight: stackHeight + 52, width: columnWidth + (hasChampionForRound ? championReserve : 0), minWidth: columnWidth + (hasChampionForRound ? championReserve : 0), flex: `0 0 ${columnWidth + (hasChampionForRound ? championReserve : 0)}px` } },
        E('div', { className: 'round-premium-title' }, E('h3', null, shortRound(round)), E('span', null, `${rows.length * 2} jugadores`)),
        E('div', { className: 'bracket-round-matches absolute-layout', style: { '--round-stack-height': `${stackHeight}px`, '--round-block': block, width: `${columnWidth}px`, maxWidth: `${columnWidth}px` } },
          rows.map((m, index) => E(MatchCard, {
            key: m.match_id,
            match: m,
            playerMap,
            allMatches: matches,
            roundIndex: isPre ? 0 : visualRoundIndex,
            connectorHeight,
            top: isPre ? preRoundTop(m, index) : cardTopByVisualIndex(visualRoundIndex, index),
            cardHeight,
            isCurrentRound: round === currentRound
          })),
          round === 'F' ? E(ChampionCard, { finalMatch, playerMap, top: cardTopByVisualIndex(visualRoundIndex, 0) + Math.round(cardHeight * 0.12) }) : null
        )
      );
    }))
  );
}

function statsForTable(match, side) {
  const s = matchPlayerStats(match, side);
  const won = s.is_winner ? 1 : 0;
  const completed = match.match_status === 'COMPLETED';
  const draw = completed && !match.winner_id ? 1 : 0;
  return {
    ...s,
    pj: completed ? 1 : 0,
    pg: completed ? won : 0,
    pe: draw,
    pp: completed && !won && !draw ? 1 : 0,
    puntos: completed ? (won ? 2 : draw ? 1 : 0) : 0
  };
}

function TabularPlayerCell({ match, playerMap, side, allMatches = [] }) {
  const stats = statsForTable(match, side);
  const resolved = resolveMatchPlayer(match, side, allMatches, playerMap);
  const player = resolved.player || playerMap[stats.player_id];
  const seed = side === 1 ? match.seed1_position : match.seed2_position;
  return E('div', { className: 'tabular-player-cell' },
    E('span', { className: 'tabular-seed' }, seed || '-'),
    E(Avatar, { player }),
    E('div', null,
      E('div', { className: 'tabular-name' }, E(Flag, { code: player?.country_iso }), E('b', null, player ? E(PlayerHistoryTrigger, { player }) : resolved.label)),
      E('div', { className: 'small' }, `${matchCode(match)} · ${matchRoundLabel(match)}`)
    )
  );
}

function TabularView({ matches, playerMap }) {
  const rounds = [...new Set(matches.map((m) => matchRoundKey(m)))].sort((a, b) => roundOrder(a) - roundOrder(b));
  return E('div', { className: 'bracket-tabular-panel' }, rounds.map((round) => {
    const rows = matches.filter((m) => matchRoundKey(m) === round).sort((a, b) => num(a.bracket_order) - num(b.bracket_order));
    return E('section', { key: round, className: 'bracket-table-section bracket-tabular-section' },
      E('div', { className: 'bracket-table-section-title' }, shortRound(round).toUpperCase()),
      E('div', { className: 'table-wrap bracket-table-wrap' },
        E('table', { className: 'bracket-tabular-table' },
          E('thead', null, E('tr', null, ['NUM', 'NOMBRE DEL JUGADOR', 'PJ', 'PG', 'PE', 'PP', 'CAR', 'ENTR', 'SM1', 'SM2', 'PROM', 'PUNTOS'].map((h) => E('th', { key: h }, h)))),
          E('tbody', null, rows.flatMap((match, matchIndex) => [1, 2].map((side) => {
            const stats = statsForTable(match, side);
            return E('tr', { key: `${match.match_id}-${side}`, className: `${stats.is_winner ? 'tabular-winner-row' : ''}` },
              E('td', { className: 'num-cell' }, side === 1 ? matchIndex + 1 : ''),
              E('td', null, E(TabularPlayerCell, { match, playerMap, side, allMatches: matches })),
              E('td', null, stats.pj),
              E('td', null, stats.pg),
              E('td', null, stats.pe),
              E('td', null, stats.pp),
              E('td', null, stats.caroms),
              E('td', null, stats.innings),
              E('td', null, stats.s1),
              E('td', null, stats.s2),
              E('td', { className: 'prom-cell' }, stats.avg),
              E('td', { className: 'points-cell' }, stats.puntos)
            );
          })))
        )
      )
    );
  }));
}


function continuousPdfPreset(matches, selectedPageSize = 'Letter', selectedOrientation = 'portrait') {
  const rounds = new Set(matches.map((match) => matchRoundKey(match)));
  const hasLargeStartRound = ['R128', 'R64', 'R32'].some((round) => rounds.has(round));
  const hasExtraFeederColumn = rounds.has('R0') && rounds.size >= 5;
  const requiresLegal = hasLargeStartRound || hasExtraFeederColumn;
  const requestedSize = String(selectedPageSize || 'Letter').toLowerCase() === 'legal' ? 'Legal' : 'Letter';
  const normalizedSize = requiresLegal ? 'Legal' : requestedSize;
  const key = normalizedSize === 'Legal' ? 'legal' : 'letter';
  const orientationValue = selectedOrientation || 'portrait';
  return {
    key,
    extraClass: requiresLegal ? 'bracket-continuous-r32plus' : 'bracket-continuous-standard',
    pageSize: normalizedSize,
    orientation: orientationValue,
    scale: 'fit',
    label: `${orientationValue === 'landscape' ? 'Horizontal' : 'Vertical'} ${normalizedSize === 'Legal' ? 'Legal' : 'Carta'} · Todo 1 Página${requiresLegal ? ' · Dieciseisavos+' : ''}`
  };
}


function mainFaceRounds(matches) {
  return [...new Set((matches || []).map((m) => matchRoundKey(m)))]
    .filter((round) => round && round !== 'F')
    .sort((a, b) => roundOrder(a) - roundOrder(b));
}

function sortFaceRows(rows) {
  return [...rows].sort((a, b) => num(a.bracket_order) - num(b.bracket_order) || num(a.match_number) - num(b.match_number) || String(a.match_id).localeCompare(String(b.match_id)));
}

function collectFaceBranchIds(matches, rootMatchId) {
  const byId = new Map((matches || []).map((match) => [match.match_id, match]));
  const preBySeedPosition = new Map();
  (matches || []).forEach((match) => {
    if (match.phase === 'PRE_ELIMINATION' && match.winner_takes_seed_position) {
      preBySeedPosition.set(num(match.winner_takes_seed_position), match);
    }
  });
  const ids = new Set();
  const visit = (matchId) => {
    if (!matchId || ids.has(matchId)) return;
    const match = byId.get(matchId);
    if (!match) return;
    ids.add(matchId);
    [match.source_match1_id, match.source_match2_id].forEach(visit);
    [match.seed1_position, match.seed2_position].forEach((seedPosition) => {
      const feeder = preBySeedPosition.get(num(seedPosition));
      if (feeder) visit(feeder.match_id);
    });
  };
  visit(rootMatchId);
  return ids;
}

function fallbackFaceSideIds(matches, side) {
  const ids = new Set();
  mainFaceRounds(matches).forEach((round) => {
    const rows = sortFaceRows((matches || []).filter((m) => matchRoundKey(m) === round));
    const half = Math.ceil(rows.length / 2);
    const sideRows = side === 'left' ? rows.slice(0, half) : rows.slice(half);
    sideRows.forEach((match) => ids.add(match.match_id));
  });
  return ids;
}

function faceBranchIds(matches, final, side) {
  const rootId = side === 'left' ? final?.source_match1_id : final?.source_match2_id;
  const ids = rootId ? collectFaceBranchIds(matches, rootId) : fallbackFaceSideIds(matches, side);
  if (ids.size) return ids;
  return fallbackFaceSideIds(matches, side);
}

function faceCardHeight() {
  return 332;
}

function computeFaceGlobalTops(matches) {
  const cardHeight = 332;
  const rowGap = 54;
  const slot = cardHeight + rowGap;
  const rounds = mainFaceRounds(matches).filter((round) => round !== 'R0');
  const firstMainRound = rounds[0] || '';
  const topById = new Map();
  const rowsByRound = new Map();

  rounds.forEach((round, visualIndex) => {
    const rows = sortFaceRows((matches || []).filter((m) => matchRoundKey(m) === round));
    rowsByRound.set(round, rows);
    const block = Math.pow(2, visualIndex);
    rows.forEach((match, index) => {
      topById.set(match.match_id, ((block - 1) * slot) / 2 + index * block * slot);
    });
  });

  const firstRows = rowsByRound.get(firstMainRound) || [];
  (matches || []).filter((match) => matchRoundKey(match) === 'R0').forEach((match, fallbackIndex) => {
    const targetPosition = num(match.winner_takes_seed_position, 0);
    const target = firstRows.find((candidate) => num(candidate.seed1_position, 0) === targetPosition || num(candidate.seed2_position, 0) === targetPosition);
    topById.set(match.match_id, target ? topById.get(target.match_id) : fallbackIndex * slot);
  });

  return { topById, rounds, slot };
}

function getExplicitSourceIds(match, positionsById) {
  return [match.source_match1_id, match.source_match2_id].filter((id) => id && positionsById.has(id));
}

function getSeedFeederIds(match, matches, positionsById) {
  const feeders = [];
  [match.seed1_position, match.seed2_position].forEach((seedPosition) => {
    if (!seedPosition) return;
    const feeder = (matches || []).find((candidate) => candidate.phase === 'PRE_ELIMINATION' && num(candidate.winner_takes_seed_position, 0) === num(seedPosition, 0));
    if (feeder && positionsById.has(feeder.match_id)) feeders.push(feeder.match_id);
  });
  return feeders;
}

function getFallbackSourceIds(match, layout, positionsById) {
  const currentRoundIndex = layout.roundsAsc.findIndex((round) => round === matchRoundKey(match));
  if (currentRoundIndex <= 0) return [];
  const previousRound = layout.roundsAsc[currentRoundIndex - 1];
  if (!previousRound || previousRound === 'R0') return [];
  const prevRows = layout.rowsByRound.get(previousRound) || [];
  const currentRows = layout.rowsByRound.get(matchRoundKey(match)) || [];
  const currentIndex = currentRows.findIndex((row) => row.match_id === match.match_id);
  if (currentIndex < 0) return [];
  return prevRows.slice(currentIndex * 2, currentIndex * 2 + 2).map((row) => row.match_id).filter((id) => positionsById.has(id));
}

function buildFaceBranchLayout(matches, final, side) {
  const branchIds = faceBranchIds(matches, final, side);
  const { topById } = computeFaceGlobalTops(matches);
  const roundsAsc = mainFaceRounds(matches).filter((round) => (matches || []).some((match) => branchIds.has(match.match_id) && matchRoundKey(match) === round));
  const displayRounds = side === 'right' ? [...roundsAsc].reverse() : roundsAsc;
  const rowsByRound = new Map();
  const rawTops = [];

  roundsAsc.forEach((round) => {
    const rows = sortFaceRows((matches || []).filter((match) => branchIds.has(match.match_id) && matchRoundKey(match) === round));
    rowsByRound.set(round, rows);
    rows.forEach((match) => rawTops.push(topById.get(match.match_id) || 0));
  });

  const minTop = rawTops.length ? Math.min(...rawTops) : 0;
  const topPadding = 4;
  const columnWidth = 430;
  const columnGap = 54;
  const positionsById = new Map();
  const columns = displayRounds.map((round, columnIndex) => {
    const rows = rowsByRound.get(round) || [];
    const x = columnIndex * (columnWidth + columnGap);
    rows.forEach((match) => {
      const top = (topById.get(match.match_id) || 0) - minTop + topPadding;
      positionsById.set(match.match_id, { match, round, x, y: top, width: columnWidth, height: faceCardHeight(round), columnIndex });
    });
    return { round, rows, x, width: columnWidth };
  });

  const connectors = [];
  const layout = { roundsAsc, rowsByRound };
  positionsById.forEach((position, matchId) => {
    const match = position.match;
    let sources = getExplicitSourceIds(match, positionsById);
    if (!sources.length) sources = getSeedFeederIds(match, matches, positionsById);
    if (!sources.length) sources = getFallbackSourceIds(match, layout, positionsById);
    sources.forEach((sourceId) => {
      const source = positionsById.get(sourceId);
      if (!source) return;
      const fromX = side === 'left' ? source.x + source.width : source.x;
      const toX = side === 'left' ? position.x : position.x + position.width;
      const fromY = source.y + source.height / 2;
      const toY = position.y + position.height / 2;
      const midX = fromX + (toX - fromX) / 2;
      connectors.push({ sourceId, targetId: matchId, fromX, fromY, toX, toY, midX });
    });
  });

  const maxBottom = Math.max(560, ...Array.from(positionsById.values()).map((position) => position.y + position.height + 20));
  const width = Math.max(columnWidth, columns.length * columnWidth + Math.max(0, columns.length - 1) * columnGap);
  return { side, columns, connectors, positionsById, width, height: maxBottom, columnWidth, columnGap };
}

function FaceConnectorSvg({ layout }) {
  return E('svg', { className: 'face-connector-svg', width: layout.width, height: layout.height, viewBox: `0 0 ${layout.width} ${layout.height}`, 'aria-hidden': 'true', focusable: 'false' },
    layout.connectors.map((connector) => E('path', {
      key: `${connector.sourceId}-${connector.targetId}`,
      className: 'face-connector-path',
      d: `M ${connector.fromX} ${connector.fromY} H ${connector.midX} V ${connector.toY} H ${connector.toX}`
    }))
  );
}

function FaceRoundColumn({ round, rows, playerMap, matches, layout, championship }) {
  return E('div', { className: `face-round-column face-round-key-${String(round).toLowerCase()} face-absolute-column`, style: { left: `${layout.columns.find((column) => column.round === round)?.x || 0}px`, width: `${layout.columnWidth}px`, minHeight: `${layout.height}px` } },
    E('div', { className: 'round-premium-title face-round-title' },
      E('h3', null, shortRound(round).toUpperCase()),
      E('span', null, `${rows.length * 2} jugadores`)
    ),
    E('div', { className: 'face-round-matches face-round-matches-absolute' },
      rows.map((match) => {
        const position = layout.positionsById.get(match.match_id) || { y: 0 };
        return E('div', { key: match.match_id, className: 'face-match-position', style: { top: `${position.y}px`, height: `${faceCardHeight(round)}px` } },
          E(MatchCard, {
            match,
            playerMap,
            allMatches: matches,
            cardHeight: faceCardHeight(round),
            roundIndex: round === 'R0' ? 0 : 1,
            connectorHeight: 0,
            championship
          })
        );
      })
    )
  );
}

function FaceBranch({ layout, playerMap, matches, championship }) {
  return E('div', { className: `face-branch face-${layout.side}-branch face-tree-branch`, style: { width: `${layout.width}px`, minWidth: `${layout.width}px`, height: `${layout.height}px` } },
    E(FaceConnectorSvg, { layout }),
    layout.columns.map(({ round, rows }) => E(FaceRoundColumn, { key: `${layout.side}-${round}`, round, rows, playerMap, matches, layout, championship }))
  );
}

function closestSemiPosition(layout, finalY) {
  const semis = Array.from(layout.positionsById.values()).filter((position) => position.round === 'SF');
  if (!semis.length) return null;
  return semis.sort((a, b) => Math.abs((a.y + a.height / 2) - finalY) - Math.abs((b.y + b.height / 2) - finalY))[0];
}

function FaceCenterConnectorSvg({ final, leftLayout, rightLayout, finalVerticalOffset, stageHeight }) {
  if (!final) return null;
  const width = 620;
  const finalWrapWidth = 430;
  const finalLeft = Math.round((width - finalWrapWidth) / 2);
  const finalRight = finalLeft + finalWrapWidth;
  const titleHeight = 36;
  const finalCardHeight = 332;
  const finalY = finalVerticalOffset + titleHeight + Math.round(finalCardHeight / 2);
  const leftSemi = (final.source_match1_id ? leftLayout.positionsById.get(final.source_match1_id) : null) || closestSemiPosition(leftLayout, finalY);
  const rightSemi = (final.source_match2_id ? rightLayout.positionsById.get(final.source_match2_id) : null) || closestSemiPosition(rightLayout, finalY);
  if (!leftSemi && !rightSemi) return null;
  const leftJoinX = Math.max(18, finalLeft - 18);
  const rightJoinX = Math.min(width - 18, finalRight + 18);
  const pathLeft = leftSemi ? `M 0 ${leftSemi.y + leftSemi.height / 2} H ${leftJoinX} V ${finalY} H ${finalLeft}` : null;
  const pathRight = rightSemi ? `M ${width} ${rightSemi.y + rightSemi.height / 2} H ${rightJoinX} V ${finalY} H ${finalRight}` : null;
  const viewHeight = Math.max(640, Number(stageHeight || 0));
  return E('svg', { className: 'face-center-connector-svg', width, height: viewHeight, viewBox: `0 0 ${width} ${viewHeight}`, preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' },
    pathLeft ? E('path', { className: 'face-connector-path face-center-connector-path', d: pathLeft }) : null,
    pathRight ? E('path', { className: 'face-connector-path face-center-connector-path', d: pathRight }) : null
  );
}

function FaceToFaceView({ matches, playerMap, championship = {} }) {
  const final = matches.find((m) => matchRoundKey(m) === 'F');
  const leftLayout = buildFaceBranchLayout(matches, final, 'left');
  const rightLayout = buildFaceBranchLayout(matches, final, 'right');
  const hasR0 = matches.some((m) => matchRoundKey(m) === 'R0');
  const baseStageHeight = Math.max(leftLayout.height, rightLayout.height, 640);
  // v6.5: the center stage is now absolute-positioned. Previous versions mixed
  // flex vertical centering with translateY(), so even small offsets pushed the
  // Final and Champion toward the bottom. Keep the Final in the upper central
  // corridor requested by UX, independently from source-match ordering.
  const finalVerticalOffset = final ? Math.max(86, Math.min(172, Math.round(baseStageHeight * 0.11))) : 0;
  const championVerticalGap = final?.winner_id ? 150 : 0;
  const stageHeight = Math.max(baseStageHeight, finalVerticalOffset + 332 + championVerticalGap + 160);

  return E('div', { className: `face-to-face-premium face-tree-premium ${hasR0 ? 'face-has-r0' : ''}` },
    E('div', { className: 'face-header-note' },
      E('b', null, 'Visualización Face to Face'),
      E('span', null, hasR0 ? 'Incluye R0 y dibuja conexiones reales por fuentes de partida, adaptadas desde la visualización continua.' : 'Dibuja conexiones reales por fuentes de partida, adaptadas desde la visualización continua.')
    ),
    E('div', { className: 'face-grid face-grid-balanced face-tree-grid', style: { '--face-stage-height': `${stageHeight}px`, '--face-final-offset': `${finalVerticalOffset}px` } },
      E(FaceBranch, { layout: leftLayout, playerMap, matches, championship }),
      E('div', { className: 'face-center-stage face-tree-center', style: { minHeight: `${stageHeight}px` } },
        E(FaceCenterConnectorSvg, { final, leftLayout, rightLayout, finalVerticalOffset, stageHeight }),
        final ? E('div', { className: 'face-final-wrap face-tree-final-wrap face-final-up-wrap', style: { top: `${finalVerticalOffset}px` } },
          E('div', { className: 'round-premium-title face-round-title' },
            E('h3', null, 'FINAL'),
            E('span', null, '2 jugadores')
          ),
          E('div', { className: 'face-final-row face-final-column' },
            E(MatchCard, { match: final, playerMap, allMatches: matches, cardHeight: 332, championship }),
            final.winner_id ? E('div', { className: 'face-champion-node face-champion-below-final' },
              E('span', { className: 'face-champion-line face-champion-line-vertical', 'aria-hidden': 'true' }),
              E('div', { className: 'trophy' }, '🏆'),
              E('span', null, 'Campeón / Ganador'),
              E('b', null, playerName(playerMap[final.winner_id]))
            ) : null
          )
        ) : E(EmptyState, { title: 'Final pendiente', message: 'Genere rondas hasta la final.' })
      ),
      E(FaceBranch, { layout: rightLayout, playerMap, matches, championship })
    )
  );
}


export function BracketModule({ championship, players, matches, setMatches, seeds, audit }) {
  const [view, setView] = useState('tabular');
  const [pageSize, setPageSize] = useState(championship.global_settings?.pdf_default_page_size || 'A3');
  const [orientation, setOrientation] = useState(championship.global_settings?.pdf_default_orientation || 'landscape');
  const [scale, setScale] = useState('100');
  const [visualZoom, setVisualZoom] = useState(1);
  const [rollbackReason, setRollbackReason] = useState('Corrección de fase autorizada');
  const [notice, setNotice] = useState(null);
  const noticeTimerRef = useRef(null);
  const printAreaRef = useRef(null);
  const playerMap = Object.fromEntries(players.map((p) => [p.player_id, p]));
  const preMatches = matches.filter((m) => m.phase === 'PRE_ELIMINATION').sort((a, b) => (a.bracket_order || 0) - (b.bracket_order || 0));
  const koMatches = matches.filter((m) => m.phase === 'KO').sort((a, b) => roundOrder(a.ko_round) - roundOrder(b.ko_round) || (a.bracket_order || 0) - (b.bracket_order || 0));
  const allElimination = useMemo(() => [...preMatches, ...koMatches], [preMatches, koMatches]);
  const activePreMatches = preMatches.filter((m) => m.match_status !== 'PLANNED');
  const activeKoMatches = koMatches.filter((m) => m.match_status !== 'PLANNED');
  const nextRoundButtonLabel = activePreMatches.length && !activeKoMatches.length ? 'Generar bracket principal' : 'Generar siguiente ronda';

  const notify = (message, kind = 'success') => {
    setNotice({ message, kind });
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 5500);
  };

  const replaceEliminationMatches = (newMatches) => setMatches([...matches.filter((m) => !['PRE_ELIMINATION', 'KO'].includes(m.phase)), ...newMatches]);
  const generateInitial = () => {
    if (!seeds.length) return alert('Primero clasifique grupos.');
    const start = Math.max(0, ...matches.map((m) => Number(m.match_number || 0))) + 1;
    const structure = generateBracketStructure(championship, seeds, start);
    if (structure.type === 'ERROR') return alert(structure.message);
    replaceEliminationMatches([...structure.preMatches, ...structure.koMatches]);
    audit('BRACKET_STRUCTURE', structure.message);
    notify(`Estructura de llaves generada correctamente. ${structure.message}`);
  };
  const fillCurrent = () => {
    const target = preMatches.some((m) => !['COMPLETED', 'PLANNED'].includes(m.match_status))
      ? preMatches.filter((m) => !['COMPLETED', 'PLANNED'].includes(m.match_status))
      : koMatches.filter((m) => m.ko_round === latestActiveKoRound(matches) && !['COMPLETED', 'PLANNED'].includes(m.match_status));
    if (!target.length) return alert('No hay partidas pendientes en la ronda activa.');
    const completed = autoFillMatches(target, `bracket-${Date.now()}`);
    setMatches(mergeById(matches, completed));
    audit('BRACKET_RANDOM_RESULTS', `Resultados aplicados a ${completed.length} partidas.`);
    notify(`Resultados aplicados correctamente a ${completed.length} partidas de la ronda activa.`);
  };
  const generateNext = () => {
    const start = Math.max(0, ...matches.map((m) => Number(m.match_number || 0))) + 1;
    const activePre = activePreMatches;
    const activeKo = activeKoMatches;

    // Si el campeonato tuvo R0/preclasificación, este mismo botón activa el bracket principal
    // luego de completar R0. Solo cambia jugadores; conserva fecha, hora y mesa proyectadas.
    if (activePre.length && !activeKo.length) {
      if (activePre.some((m) => m.match_status !== 'COMPLETED' || !m.winner_id)) {
        return alert('Debe completar todas las partidas de preclasificación/R0 antes de generar el bracket principal.');
      }
      if (koMatches.some((m) => m.match_status !== 'PLANNED')) {
        audit('DUPLICATE_BRACKET_BLOCKED', 'Se bloqueó intento de duplicar bracket principal posterior a R0.');
        return alert('El bracket principal posterior a R0 ya existe. Use Generar siguiente ronda para avanzar o Regresar fase para corregir.');
      }
      const main = generateMainBracketAfterPre(championship, seeds, activePre, start);
      if (main.error) return alert(main.error);
      const merged = mergeWithProjectedSchedule(main.matches, matches);
      setMatches([...matches.filter((m) => !(m.phase === 'KO' && m.ko_round === merged[0]?.ko_round && m.match_status === 'PLANNED')), ...merged]);
      audit('BRACKET_MAIN_AFTER_R0', `${roundDisplayName(merged[0]?.ko_round)} generada con jugadores reales después de R0, conservando fecha, hora y mesa proyectadas.`);
      notify(`${roundDisplayName(merged[0]?.ko_round)} generada correctamente después de R0.`);
      return;
    }

    const hasActiveElimination = matches.some((m) => ['PRE_ELIMINATION', 'KO'].includes(m.phase) && m.match_status !== 'PLANNED');
    const result = hasActiveElimination
      ? generateNextRound(championship, matches, start)
      : generateInitialRoundFromSeeds(championship, seeds, matches, start);
    if (result.error) return alert(result.error);
    const first = result.matches[0];
    const cleaned = first
      ? matches.filter((m) => !(m.phase === first.phase && (m.ko_round || '') === (first.ko_round || '') && m.match_status === 'PLANNED'))
      : matches;
    setMatches([...cleaned, ...result.matches]);
    audit('NEXT_KO_ROUND', `${first?.phase === 'PRE_ELIMINATION' ? 'Preclasificación' : roundDisplayName(first?.ko_round)} generada con jugadores reales, conservando fecha, hora y mesa proyectadas.`);
    notify(`${first?.phase === 'PRE_ELIMINATION' ? 'Preclasificación' : roundDisplayName(first?.ko_round)} generada correctamente.`);
  };
  const rollbackPreviousPhase = () => {
    if (['CLOSED', 'FINALIZED', 'COMPLETED'].includes(championship.status)) {
      return alert('No se puede regresar fase si el campeonato está cerrado/finalizado.');
    }
    const activeRounds = [...new Set(allElimination.map((m) => matchRoundKey(m)))].sort((a, b) => roundOrder(a) - roundOrder(b));
    if (!activeRounds.length) return alert('No hay fase eliminatoria generada. La última fase a la que puede regresarse es Grupos.');
    const currentRound = activeRounds[activeRounds.length - 1];
    const previousRound = activeRounds.length > 1 ? activeRounds[activeRounds.length - 2] : 'GROUPS';
    if (!rollbackReason.trim()) return alert('Debe indicar motivo para regresar a la fase anterior.');
    const message = previousRound === 'GROUPS'
      ? `Esta acción eliminará ${roundDisplayName(currentRound)} y regresará a Grupos, conservando los resultados de grupos.`
      : `Esta acción eliminará ${roundDisplayName(currentRound)} y regresará a ${roundDisplayName(previousRound)}.`;
    if (!window.confirm(`${message}\n\nMotivo: ${rollbackReason}\n\n¿Desea continuar?`)) return;
    const keep = matches.filter((m) => {
      const key = matchRoundKey(m);
      if (m.phase === 'PRE_ELIMINATION' || m.phase === 'KO') return key !== currentRound;
      return true;
    });
    setMatches(keep);
    audit('ROLLBACK_PHASE', `Regreso ordenado de ${roundDisplayName(currentRound)} a ${previousRound === 'GROUPS' ? 'Grupos' : roundDisplayName(previousRound)}. Motivo: ${rollbackReason}`);
    notify(`Regreso de fase realizado correctamente: ${roundDisplayName(currentRound)} → ${previousRound === 'GROUPS' ? 'Grupos' : roundDisplayName(previousRound)}.`, 'warning');
  };

  const canZoomBracket = view === 'continuous' || view === 'face';
  const updateVisualZoom = (delta) => setVisualZoom((current) => Math.min(1.6, Math.max(0.45, Number((current + delta).toFixed(2)))));
  const resetVisualZoom = () => setVisualZoom(1);

  const exportCurrentViewPdf = () => {
    if (!allElimination.length) return alert('No hay información de bracket para exportar.');
    const viewLabel = view === 'tabular' ? 'Tabular' : view === 'continuous' ? 'Continua' : 'Face to Face';
    const continuousPreset = view === 'continuous' ? continuousPdfPreset(allElimination, pageSize, orientation) : null;
    const roundsForPrint = new Set(allElimination.map((match) => matchRoundKey(match)));
    const tabularR32Class = view === 'tabular' && roundsForPrint.has('R32') ? ' bracket-tabular-r32' : '';
    const faceClass = view === 'face' ? ' printing-bracket-face' : '';
    const printPageSize = view === 'face' ? pageSize : (continuousPreset?.pageSize || pageSize);
    const printOrientation = view === 'face' ? 'landscape' : (continuousPreset?.orientation || orientation);
    const printScale = view === 'face' ? 'fit' : (continuousPreset?.scale || scale);
    const continuousClass = continuousPreset ? ` printing-bracket-continuous bracket-continuous-${continuousPreset.key} ${continuousPreset.extraClass || ''}` : '';
    startPdfPrint({
      bodyClass: `printing-bracket${continuousClass}${tabularR32Class}${faceClass}`,
      title: `Llaves - ${championship.name || 'Campeonato'} - ${viewLabel}${continuousPreset ? ' - ' + continuousPreset.label : ''}${view === 'face' ? ' - Horizontal Todo 1 Página' : ''}`,
      pageSize: printPageSize,
      orientation: printOrientation,
      scale: printScale,
      afterPrint: () => {
        audit('BRACKET_PDF', `PDF generado desde vista ${viewLabel}${continuousPreset ? ' · ' + continuousPreset.label : ''}${view === 'face' ? ' · Horizontal Todo 1 Página' : ''}.`);
        notify(`PDF de llaves generado correctamente desde vista ${viewLabel}.`);
      }
    });
  };

  return E('div', { className: 'grid bracket-export-root' },
    E('section', { className: 'bracket-hero-card' },
      E('div', { className: 'toolbar', style: { justifyContent: 'space-between' } },
        E(SectionTitle, { title: 'Llaves / Bracket', subtitle: 'Visualizaciones oficiales con foto, bandera, marcador, entradas y promedio por partida.' }),
        E('div', { className: 'toolbar' },
          E(Button, { onClick: generateInitial }, 'Generar estructura'),
          E(Button, { onClick: fillCurrent, kind: 'success' }, 'Resultados ronda activa'),
          E(Button, { onClick: generateNext, kind: 'success' }, nextRoundButtonLabel),
          E(Button, { onClick: exportCurrentViewPdf, kind: 'soft' }, 'Generar PDF'),
          E(Button, { onClick: rollbackPreviousPhase, kind: 'danger' }, 'Regresar fase')
        ),
        E(PdfControls, { pageSize, setPageSize, orientation, setOrientation, scale, setScale })
      ),
      E('div', { className: 'bracket-control-bar' },
        E(Field, { label: 'Motivo regreso fase' }, E(Input, { value: rollbackReason, onChange: (e) => setRollbackReason(e.target.value), placeholder: 'Motivo obligatorio' })),
        E('div', { className: 'control-chip' }, E('span', null, 'Tamaño bracket'), E('b', null, String(Math.max(4, allElimination.length ? allElimination.filter((m) => m.phase === 'KO' && m.ko_round === latestActiveKoRound(matches)).length * 2 || seeds.length : seeds.length || 0)))),
        E('div', { className: 'view-toggle' },
          E('button', { className: view === 'tabular' ? 'active' : '', onClick: () => setView('tabular') }, 'Tabular'),
          E('button', { className: view === 'continuous' ? 'active' : '', onClick: () => setView('continuous') }, 'Continua'),
          E('button', { className: view === 'face' ? 'active' : '', onClick: () => setView('face') }, 'Face to Face')
        ),
        canZoomBracket ? E('div', { className: 'bracket-zoom-controls', role: 'group', 'aria-label': 'Zoom visual del bracket' },
          E('button', { type: 'button', onClick: () => updateVisualZoom(-0.1), title: 'Zoom out' }, '−'),
          E('b', null, `${Math.round(visualZoom * 100)}%`),
          E('button', { type: 'button', onClick: () => updateVisualZoom(0.1), title: 'Zoom in' }, '+'),
          E('button', { type: 'button', onClick: resetVisualZoom, title: 'Restablecer zoom' }, '100%')
        ) : null,
        E('div', { className: 'control-chip' }, E('span', null, 'Clasificados'), E('b', null, seeds.length)),
        E('div', { className: 'control-chip' }, E('span', null, 'Partidas KO'), E('b', null, koMatches.length))
      ),
      notice ? E('div', { className: `process-notice process-notice-${notice.kind || 'success'}`, role: 'status' }, notice.message) : null
    ),
    E('section', { className: 'bracket-print-scope', ref: printAreaRef },
      E(PdfDocument, { title: 'Llaves / Bracket', subtitle: `Vista ${view === 'tabular' ? 'Tabular' : view === 'continuous' ? 'Continua' : 'Face to Face'}`, championship, meta: [`Clasificados: ${seeds.length}`, `Partidas: ${allElimination.length}`] },
      !allElimination.length ? E(EmptyState, { title: 'Sin bracket', message: 'Clasifique grupos y genere la estructura de eliminación directa.' }) : null,
      allElimination.length && view === 'tabular' ? E(TabularView, { matches: allElimination, playerMap }) : null,
      allElimination.length && canZoomBracket ? E('div', { className: 'bracket-zoom-viewport', style: { '--visual-zoom': visualZoom, '--visual-zoom-width': `${100 / visualZoom}%` } },
        E('div', { className: 'bracket-zoom-content' },
          view === 'continuous' ? E(ContinuousView, { matches: allElimination, playerMap }) : null,
          view === 'face' ? E(FaceToFaceView, { matches: allElimination, playerMap, championship }) : null
        )
      ) : null
      )
    )
  );
}
