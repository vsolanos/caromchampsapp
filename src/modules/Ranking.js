import { useState } from 'react';
import { E, Card, Button, SectionTitle, EmptyState } from '../components/ui.js';
import { PdfControls, PdfDocument } from '../components/Print.js';
import { PlayerHistoryTrigger } from '../components/PlayerHistory.js';
import { startPdfPrint } from '../lib/print.js';
import { buildFinalRankings, fmtAvg, playerName, formatDateEs } from '../lib/tournament.js';

const RANKING_FLAG_PALETTE = {
  CR: ['#002b7f', '#ffffff', '#ce1126', '#ce1126', '#ffffff', '#002b7f'],
  PA: ['#ffffff', '#005293', '#d21034'],
  DO: ['#002d62', '#ffffff', '#ce1126'],
  CO: ['#fcd116', '#fcd116', '#003893', '#ce1126'],
  MX: ['#006847', '#ffffff', '#ce1126'],
  US: ['#b22234', '#ffffff', '#b22234', '#ffffff', '#3c3b6e'],
  VE: ['#fcd116', '#003893', '#ce1126'],
  EC: ['#ffdd00', '#ffdd00', '#034ea2', '#ed1c24'],
  AR: ['#74acdf', '#ffffff', '#74acdf'],
  BR: ['#009b3a', '#ffdf00', '#002776'],
  OTHER: ['#e2e8f0', '#94a3b8', '#475569']
};

function starPoints(cx, cy, outer, inner, arms = 5) {
  return Array.from({ length: arms * 2 }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI) / arms;
    const radius = index % 2 === 0 ? outer : inner;
    return `${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`;
  }).join(' ');
}

function RankingFlag({ code = 'CR' }) {
  const normalized = String(code || 'OTHER').toUpperCase();
  const colors = RANKING_FLAG_PALETTE[normalized] || RANKING_FLAG_PALETTE.OTHER;
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
    E('circle', { key: 'do-seal', cx: 18, cy: 12, r: 2.3, fill: '#ffffff', stroke: '#0f766e', 'strokeWidth': .75 })
  ] : normalized === 'CR' ? [
    E('rect', { key: 'cr-blue-top', x: 0, y: 0, width: 36, height: 4, fill: '#002b7f' }),
    E('rect', { key: 'cr-white-top', x: 0, y: 4, width: 36, height: 4, fill: '#ffffff' }),
    E('rect', { key: 'cr-red', x: 0, y: 8, width: 36, height: 8, fill: '#ce1126' }),
    E('rect', { key: 'cr-white-bottom', x: 0, y: 16, width: 36, height: 4, fill: '#ffffff' }),
    E('rect', { key: 'cr-blue-bottom', x: 0, y: 20, width: 36, height: 4, fill: '#002b7f' })
  ] : colors.map((color, index) => E('rect', { key: `${normalized}-${index}`, x: 0, y: index * (24 / colors.length), width: 36, height: 24 / colors.length + 0.1, fill: color }));
  return E('span', { className: 'ranking-player-flag flag-icon flag-polished', title: normalized },
    E('svg', { viewBox: '0 0 36 24', role: 'img', 'aria-label': normalized, focusable: 'false' },
      ...children,
      E('rect', { x: .5, y: .5, width: 35, height: 23, rx: 2.5, fill: 'none', stroke: 'rgba(15,23,42,.28)', 'strokeWidth': 1 })
    )
  );
}

function pointsForPosition(position, rules = []) {
  const rule = (rules || []).find((item) => Number(position) >= Number(item.from_position) && Number(position) <= Number(item.to_position));
  return rule ? Number(rule.points || 0) : 0;
}

function getAssociatedChampionships(rankingChampionship, championships = []) {
  if (!rankingChampionship?.championship_id) return [];
  return championships
    .filter((row) => row.championship?.championship_type !== 'RANKING')
    .filter((row) => row.championship?.ranking_championship_id === rankingChampionship.championship_id)
    .sort((a, b) => String(a.championship?.start_date || a.start_date || '').localeCompare(String(b.championship?.start_date || b.start_date || '')) || String(a.name || '').localeCompare(String(b.name || '')));
}

function metricNumber(value) {
  return Number(value || 0);
}

function championshipMetricFromRankingItem(item, rankingPoints) {
  return {
    prg: metricNumber(rankingPoints),
    pj: metricNumber(item.played),
    pg: metricNumber(item.wins),
    pp: metricNumber(item.losses),
    pe: metricNumber(item.draws),
    car: metricNumber(item.caroms),
    ent: metricNumber(item.innings),
    avg: item.avg || 0,
    position: item.final_position,
    status: item.final_status
  };
}

function participantIdsFromChampionship(championshipRow) {
  const ids = new Set();
  (championshipRow.matches || []).forEach((match) => {
    if (match.player1_id) ids.add(match.player1_id);
    if (match.player2_id) ids.add(match.player2_id);
    if (match.winner_id) ids.add(match.winner_id);
  });
  (championshipRow.seeds || []).forEach((seed) => {
    const id = seed.player?.player_id || seed.player_id;
    if (id) ids.add(id);
  });
  const configured = championshipRow.championship?.participant_ids || championshipRow.participant_ids || [];
  configured.forEach((id) => {
    if (id && (championshipRow.matches || []).some((match) => match.player1_id === id || match.player2_id === id)) ids.add(id);
  });
  return ids;
}

function participantsForChampionship(playerDirectory, championshipRow) {
  const ids = participantIdsFromChampionship(championshipRow);
  return playerDirectory.filter((player) => ids.has(player.player_id));
}

function rankingRows(rankingChampionship, championships = [], players = []) {
  if (!rankingChampionship || rankingChampionship.championship_type !== 'RANKING') return { rows: [], associated: [], championshipRankings: [] };
  const rules = rankingChampionship.ranking_points_rules || [];
  const associated = getAssociatedChampionships(rankingChampionship, championships);
  const playerDirectory = Array.isArray(players) ? players : [];
  const map = new Map();
  const championshipRankings = associated.map((championshipRow) => {
    const champ = championshipRow.championship || {};
    const participants = participantsForChampionship(playerDirectory, championshipRow);
    const participantIds = new Set(participants.map((player) => player.player_id));
    const ranking = buildFinalRankings(participants, championshipRow.matches || [], championshipRow.seeds || [], champ)
      .filter((item) => item.player?.player_id && participantIds.has(item.player.player_id))
      .map((item) => {
        const rankingPoints = pointsForPosition(item.final_position, rules);
        return { ...item, ranking_points: rankingPoints, ranking_metric: championshipMetricFromRankingItem(item, rankingPoints) };
      });

    ranking.forEach((item) => {
      const id = item.player?.player_id;
      if (!id) return;
      const current = map.get(id) || {
        player: item.player,
        championships: 0,
        prg: 0,
        pj: 0,
        pg: 0,
        pp: 0,
        pe: 0,
        car: 0,
        ent: 0,
        bestPosition: item.final_position || 999,
        details: []
      };
      current.championships += 1;
      current.prg += item.ranking_metric.prg;
      current.pj += item.ranking_metric.pj;
      current.pg += item.ranking_metric.pg;
      current.pp += item.ranking_metric.pp;
      current.pe += item.ranking_metric.pe;
      current.car += item.ranking_metric.car;
      current.ent += item.ranking_metric.ent;
      current.bestPosition = Math.min(current.bestPosition, item.final_position || 999);
      current.details.push({
        championshipId: championshipRow.id,
        championship: champ.name || championshipRow.name,
        date: champ.end_date || champ.start_date,
        metric: item.ranking_metric
      });
      map.set(id, current);
    });
    return { championshipRow, champ, ranking };
  });

  const rows = Array.from(map.values())
    .filter((row) => row.championships > 0)
    .map((row) => ({ ...row, avg: row.ent ? row.car / row.ent : 0 }))
    .sort((a, b) => b.prg - a.prg || (b.avg || 0) - (a.avg || 0) || (a.bestPosition || 999) - (b.bestPosition || 999) || playerName(a.player).localeCompare(playerName(b.player)))
    .map((row, index) => ({ ...row, ranking_position: index + 1 }));
  return { rows, associated, championshipRankings };
}

function RankingPoints({ value }) {
  return E('span', { className: 'ranking-points-red' }, value);
}

function rankingChampionshipCode(index) {
  return `C${index + 1}`;
}

function championshipCodeMap(associated = []) {
  return Object.fromEntries((associated || []).map((championshipRow, index) => [championshipRow.id, rankingChampionshipCode(index)]));
}

function RankingPlayerCell({ player }) {
  if (!player) return E('span', { className: 'small' }, 'N/D');
  const association = player.association_code || (player.country_iso && player.country_iso !== 'CR' ? 'INTERNACIONAL' : '-');
  return E('div', { className: 'ranking-player-identity ranking-player-identity-grid' },
    E('div', { className: 'ranking-player-textblock' },
      E('span', { className: 'ranking-player-history-name' }, E(PlayerHistoryTrigger, { player })),
      E('span', { className: 'ranking-player-association' }, association)
    ),
    E('div', { className: 'ranking-player-flag-slot' }, E(RankingFlag, { code: player.country_iso || 'OTHER' }))
  );
}

function rankingMetricSummary(metric) {
  if (!metric) return E('span', { className: 'small' }, '-');
  return E('div', { className: 'ranking-points-cell ranking-metric-cell' },
    E('div', null, E('b', null, 'PRG '), E(RankingPoints, { value: metric.prg })),
    E('div', { className: 'small' }, `PJ ${metric.pj} · PG ${metric.pg} · PP ${metric.pp} · PE ${metric.pe}`),
    E('div', { className: 'small' }, `CAR ${metric.car} · ENT ${metric.ent} · AVG ${fmtAvg(metric.avg)}`),
    E('div', { className: 'small' }, `#${metric.position} · ${metric.status || '-'}`)
  );
}

function rankingMetricCompact(metric) {
  if (!metric) return E('span', { className: 'small' }, '-');
  return E('div', { className: 'ranking-points-cell ranking-metric-cell ranking-metric-compact' },
    E('div', null, E('b', null, 'PRG '), E(RankingPoints, { value: metric.prg })),
    E('div', { className: 'small' }, `CAR ${metric.car} · ENT ${metric.ent}`),
    E('div', { className: 'small' }, `AVG ${fmtAvg(metric.avg)} · Pos# ${metric.position || '-'}`)
  );
}

function pointsByChampionshipCell(row, championshipRow) {
  const detail = row.details.find((item) => item.championshipId === championshipRow.id);
  if (!detail) return E('span', { className: 'small' }, '-');
  return rankingMetricCompact(detail.metric);
}

function RankingMainTable({ rows, associated, codeByChampionshipId }) {
  return E('div', { className: 'table-wrap ranking-matrix-wrap' }, E('table', { className: 'ranking-table ranking-matrix-table' },
    E('thead', null, E('tr', null,
      ['POS', 'Jugador', 'Camp.', 'PRG', 'PJ', 'PG', 'PP', 'PE', 'CAR', 'ENT', 'AVG', 'Mejor Pos.'].map((h) => E('th', { key: h }, h)),
      associated.map((championshipRow) => E('th', { key: championshipRow.id }, codeByChampionshipId?.[championshipRow.id] || championshipRow.name || championshipRow.championship?.name || 'Campeonato'))
    )),
    E('tbody', null, rows.map((row) => E('tr', { key: row.player.player_id },
      E('td', null, row.ranking_position),
      E('td', { className: 'ranking-player-name' }, E(RankingPlayerCell, { player: row.player })),
      E('td', null, row.championships),
      E('td', null, E(RankingPoints, { value: row.prg })),
      E('td', null, row.pj),
      E('td', null, row.pg),
      E('td', null, row.pp),
      E('td', null, row.pe),
      E('td', null, row.car),
      E('td', null, row.ent),
      E('td', null, fmtAvg(row.avg)),
      E('td', null, row.bestPosition === 999 ? '-' : `#${row.bestPosition}`),
      associated.map((championshipRow) => E('td', { key: `${row.player.player_id}-${championshipRow.id}` }, pointsByChampionshipCell(row, championshipRow)))
    )))
  ));
}

function ChampionshipDetailTables({ championshipRankings, codeByChampionshipId, openChampionshipTab }) {
  return E('div', { className: 'grid ranking-detail-grid', style: { marginTop: 14 } }, championshipRankings.map(({ championshipRow, champ, ranking }) => E('div', { key: championshipRow.id, className: 'round-card ranking-championship-detail' },
    E('h3', null, E('button', { type: 'button', className: 'link-button ranking-championship-link', onClick: () => openChampionshipTab?.(championshipRow.id, 'reports') }, `${codeByChampionshipId?.[championshipRow.id] || 'C?'} · ${champ.name || championshipRow.name}`)),
    E('p', { className: 'small' }, `${formatDateEs(champ.start_date)} / ${formatDateEs(champ.end_date)} · ${ranking.length} jugadores`),
    ranking.length ? E('div', { className: 'table-wrap' }, E('table', { className: 'ranking-detail-table' },
      E('thead', null, E('tr', null, ['Pos', 'Jugador', 'Estado', 'PRG', 'PJ', 'PG', 'PP', 'PE', 'CAR', 'ENT', 'AVG'].map((h) => E('th', { key: h }, h)))),
      E('tbody', null, ranking.slice(0, 64).map((item) => E('tr', { key: `${championshipRow.id}-${item.player?.player_id}` },
        E('td', null, item.final_position),
        E('td', { className: 'ranking-player-name' }, E(RankingPlayerCell, { player: item.player })),
        E('td', null, item.final_status),
        E('td', null, E(RankingPoints, { value: item.ranking_metric.prg })),
        E('td', null, item.ranking_metric.pj),
        E('td', null, item.ranking_metric.pg),
        E('td', null, item.ranking_metric.pp),
        E('td', null, item.ranking_metric.pe),
        E('td', null, item.ranking_metric.car),
        E('td', null, item.ranking_metric.ent),
        E('td', null, fmtAvg(item.ranking_metric.avg))
      )))
    )) : E('p', { className: 'small' }, 'Sin posiciones calculadas.')
  )));
}


function RankingTop10Table({ rows }) {
  const top = (rows || []).slice(0, 10);
  return E(Card, { className: 'ranking-dashboard-card ranking-top10-card' },
    E('h2', null, 'Top 10 jugadores del ranking'),
    top.length ? E('div', { className: 'table-wrap' }, E('table', { className: 'ranking-table ranking-top10-table' },
      E('thead', null, E('tr', null, ['Pos', 'Jugador', 'PRG', 'PJ', 'PG', 'PP', 'PE', 'CAR', 'ENT', 'AVG', 'Mejor Pos#'].map((h) => E('th', { key: h }, h)))),
      E('tbody', null, top.map((row) => E('tr', { key: row.player.player_id },
        E('td', null, row.ranking_position),
        E('td', { className: 'ranking-player-name' }, E(RankingPlayerCell, { player: row.player })),
        E('td', null, E(RankingPoints, { value: row.prg })),
        E('td', null, row.pj), E('td', null, row.pg), E('td', null, row.pp), E('td', null, row.pe),
        E('td', null, row.car), E('td', null, row.ent), E('td', null, fmtAvg(row.avg)),
        E('td', null, row.bestPosition === 999 ? '-' : `#${row.bestPosition}`)
      )))
    )) : E('p', { className: 'small' }, 'Sin jugadores con puntos ranking.'));
}

function RankingMiniBarChart({ title, data, valueFormatter = (v) => String(v) }) {
  const rows = (data || []).slice(0, 10);
  const max = Math.max(...rows.map((d) => Number(d.value || 0)), 1);
  return E(Card, { className: 'ranking-dashboard-card ranking-mini-bar-card' },
    E('h2', null, title),
    rows.length ? E('div', { className: 'ranking-mini-bars' }, rows.map((row) => E('div', { key: row.label, className: 'ranking-mini-bar-row' },
      E('span', { title: row.fullLabel || row.label }, row.label),
      E('div', { className: 'ranking-mini-bar-track' }, E('i', { style: { width: `${Math.max(4, (Number(row.value || 0) / max) * 100)}%` } })),
      E('b', null, valueFormatter(row.value))
    ))) : E('p', { className: 'small' }, 'Sin datos disponibles.'));
}

function RankingDashboard({ rows, championshipRankings }) {
  const participantsByChampionship = (championshipRankings || []).map(({ championshipRow, champ, ranking }) => ({
    label: champ.name || championshipRow.name || championshipRow.id,
    fullLabel: champ.name || championshipRow.name || championshipRow.id,
    value: ranking.length
  }));
  const avgByChampionship = (championshipRankings || []).map(({ championshipRow, champ, ranking }) => {
    const car = ranking.reduce((sum, item) => sum + Number(item.ranking_metric?.car || 0), 0);
    const ent = ranking.reduce((sum, item) => sum + Number(item.ranking_metric?.ent || 0), 0);
    return { label: champ.name || championshipRow.name || championshipRow.id, fullLabel: champ.name || championshipRow.name || championshipRow.id, value: ent > 0 ? car / ent : 0 };
  });
  return E('div', { className: 'grid ranking-dashboard-panel' },
    E(RankingTop10Table, { rows }),
    E('div', { className: 'grid grid-2' },
      E(RankingMiniBarChart, { title: 'Participantes por campeonato asociado al ranking', data: participantsByChampionship }),
      E(RankingMiniBarChart, { title: 'AVG general por campeonato asociado al ranking', data: avgByChampionship, valueFormatter: (v) => fmtAvg(v) })
    )
  );
}

export function RankingModule({ championship, championships, players = [], openChampionshipTab }) {
  const [pageSize, setPageSize] = useState(championship.global_settings?.pdf_default_page_size || 'A4');
  const [orientation, setOrientation] = useState(championship.global_settings?.pdf_default_orientation || 'landscape');
  const [scale, setScale] = useState('100');
  const rankingChampionships = championships.filter((row) => row.championship?.championship_type === 'RANKING');
  const activeRanking = championship.championship_type === 'RANKING'
    ? championship
    : rankingChampionships.find((row) => row.id === championship.ranking_championship_id || row.championship?.championship_id === championship.ranking_championship_id)?.championship;
  const { rows, associated, championshipRankings } = rankingRows(activeRanking, championships, players);
  const codeByChampionshipId = championshipCodeMap(associated);

  const exportRankingPdf = () => {
    if (!rows.length) return alert('No hay resultados de ranking para exportar.');
    startPdfPrint({
      bodyClass: 'printing-ranking',
      title: `Ranking - ${activeRanking?.name || 'Campeonato Ranking'}`,
      pageSize,
      orientation,
      scale,
      afterPrint: () => {}
    });
  };

  if (!activeRanking) {
    return E('div', { className: 'grid' }, E(EmptyState, { title: 'Sin campeonato ranking activo', message: 'Cree un campeonato de tipo Ranking o asocie un campeonato normal a un ranking desde Paso 1.' }));
  }

  return E('div', { className: 'grid ranking-module ranking-export-root' },
    E(Card, { className: 'ranking-control-card' },
      E('div', { className: 'toolbar', style: { justifyContent: 'space-between' } },
        E(SectionTitle, { title: `Ranking · ${activeRanking.name}`, subtitle: 'Tabla acumulada por puntos ranking ganados por campeonato normal asociado.' }),
        E('div', { className: 'toolbar' }, E(Button, { onClick: exportRankingPdf, kind: 'soft' }, 'Generar PDF'))
      ),
      E(PdfControls, { pageSize, setPageSize, orientation, setOrientation, scale, setScale }),
      E('div', { className: 'grid grid-4', style: { marginTop: 14 } },
        E('div', { className: 'round-card' }, E('b', null, 'Campeonatos asociados'), E('p', null, associated.length)),
        E('div', { className: 'round-card' }, E('b', null, 'Máximo ranking'), E('p', null, activeRanking.ranking_max_championships || '-')),
        E('div', { className: 'round-card' }, E('b', null, 'Jugadores con PRG'), E('p', null, rows.length)),
        E('div', { className: 'round-card' }, E('b', null, 'Fechas'), E('p', null, `${formatDateEs(activeRanking.start_date)} / ${formatDateEs(activeRanking.end_date)}`))
      )
    ),
    E(RankingDashboard, { rows, championshipRankings }),
    E('section', { className: 'ranking-print-scope' },
      E(PdfDocument, { title: 'Tabla de posiciones Ranking', subtitle: activeRanking.name, championship: activeRanking, meta: [`Campeonatos asociados: ${associated.length}`, `Jugadores: ${rows.length}`] },
        rows.length ? E(Card, null, E(RankingMainTable, { rows, associated, codeByChampionshipId })) : E(EmptyState, { title: 'Sin resultados de ranking', message: 'Asocie campeonatos normales a este ranking y finalícelos para acumular puntuaciones.' }),
        championshipRankings.length ? E(Card, { className: 'ranking-detail-print-card' },
          E(SectionTitle, { title: 'Detalle por campeonato jugado', subtitle: 'PRG, PJ, PG, PP, PE, CAR, ENT y AVG por campeonato normal asociado.' }),
          E(ChampionshipDetailTables, { championshipRankings, codeByChampionshipId, openChampionshipTab })
        ) : null
      )
    )
  );
}
