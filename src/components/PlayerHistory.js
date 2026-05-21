import { E, Card, Button, Badge } from './ui.js';
import { fmtAvg, matchCode, matchDetailedScore, matchDisplayStatus, matchPlayerStats, matchRoundLabel, playerName, roundDisplayName } from '../lib/tournament.js';

export function PlayerHistoryTrigger({ player, children }) {
  if (!player?.player_id) return children || playerName(player) || '-';
  return E('button', {
    type: 'button',
    className: 'player-history-trigger',
    'data-player-id': player.player_id,
    title: `Ver historial de ${playerName(player)}`
  }, children || playerName(player));
}

function phaseLabel(match) {
  if (match.phase === 'GROUPS') return match.group_name || 'Fase de grupos';
  if (match.phase === 'PRE_ELIMINATION') return 'Preclasificación';
  return roundDisplayName(match.ko_round || matchRoundLabel(match));
}

function sideForPlayer(match, playerId) {
  if (match.player1_id === playerId) return 1;
  if (match.player2_id === playerId) return 2;
  return 0;
}

function buildPlayerMatchRows(player, matches = [], players = [], championshipMeta = {}) {
  const playerMap = Object.fromEntries(players.map((p) => [p.player_id, p]));
  const championshipId = championshipMeta.id || championshipMeta.championship_id || 'ACTIVE';
  const championshipLabel = championshipMeta.name || 'Campeonato activo';
  return matches
    .filter((match) => match.player1_id === player.player_id || match.player2_id === player.player_id)
    .sort((a, b) => Number(a.match_number || 0) - Number(b.match_number || 0))
    .map((match) => {
      const side = sideForPlayer(match, player.player_id);
      const otherId = side === 1 ? match.player2_id : match.player1_id;
      const stats = matchPlayerStats(match, side || 1);
      const avgValue = Number(stats.avg || 0);
      return {
        rowKey: `${championshipId}::${match.match_id}`,
        match,
        championshipId,
        championshipLabel,
        championshipStatus: championshipMeta.status || '',
        side,
        opponent: playerMap[otherId],
        phase: phaseLabel(match),
        caroms: Number(stats.caroms || 0),
        innings: Number(stats.innings || 0),
        avg: stats.avg,
        avgValue: Number.isFinite(avgValue) ? avgValue : 0,
        s1: Number(stats.s1 || 0),
        s2: Number(stats.s2 || 0),
        winner: match.winner_id === player.player_id,
        status: matchDisplayStatus(match)
      };
    });
}

function totals(rows) {
  const completed = rows.filter((row) => row.match.match_status === 'COMPLETED' || row.match.match_status === 'LOCKED');
  const caroms = completed.reduce((sum, row) => sum + row.caroms, 0);
  const innings = completed.reduce((sum, row) => sum + row.innings, 0);
  const wins = completed.filter((row) => row.winner).length;
  return { played: completed.length, wins, losses: completed.length - wins, caroms, innings, avg: innings > 0 ? fmtAvg(caroms / innings) : '0.000' };
}

function championshipSummary(rows, source) {
  const summary = totals(rows);
  return {
    id: source.id,
    name: source.name,
    status: source.status,
    rows,
    ...summary
  };
}

function AverageLineChart({ rows, selectedKey, onSelect }) {
  const completed = rows.filter((row) => row.match.match_status === 'COMPLETED' || row.match.match_status === 'LOCKED');
  const width = 720;
  const height = 320;
  const pad = { left: 52, right: 22, top: 26, bottom: 48 };
  if (!completed.length) {
    return E('div', { className: 'player-history-chart-empty' }, 'Sin partidas completadas para graficar promedios.');
  }
  const maxAvg = Math.max(1, ...completed.map((row) => row.avgValue || 0));
  const minAvg = 0;
  const xFor = (index) => completed.length === 1 ? width / 2 : pad.left + (index * ((width - pad.left - pad.right) / (completed.length - 1)));
  const yFor = (value) => pad.top + ((maxAvg - value) / Math.max(.001, maxAvg - minAvg)) * (height - pad.top - pad.bottom);
  const points = completed.map((row, index) => `${xFor(index).toFixed(2)},${yFor(row.avgValue || 0).toFixed(2)}`).join(' ');
  const yTicks = [0, maxAvg / 2, maxAvg];
  return E('div', { className: 'player-history-chart-wrap' },
    E('svg', { className: 'player-history-chart', viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': 'Comportamiento de promedio por partida' },
      E('rect', { x: 0, y: 0, width, height, rx: 18, fill: 'rgba(8, 47, 73, .32)' }),
      yTicks.map((tick, index) => E('g', { key: `yt-${index}` },
        E('line', { x1: pad.left, x2: width - pad.right, y1: yFor(tick), y2: yFor(tick), stroke: 'rgba(148,163,184,.28)', strokeWidth: 1 }),
        E('text', { x: 10, y: yFor(tick) + 4, fill: '#94a3b8', fontSize: 12 }, fmtAvg(tick))
      )),
      E('line', { x1: pad.left, x2: pad.left, y1: pad.top, y2: height - pad.bottom, stroke: 'rgba(148,163,184,.6)', strokeWidth: 1.5 }),
      E('line', { x1: pad.left, x2: width - pad.right, y1: height - pad.bottom, y2: height - pad.bottom, stroke: 'rgba(148,163,184,.6)', strokeWidth: 1.5 }),
      E('polyline', { points, fill: 'none', stroke: '#38bdf8', strokeWidth: 4, strokeLinejoin: 'round', strokeLinecap: 'round' }),
      completed.map((row, index) => {
        const selected = row.rowKey === selectedKey;
        return E('g', { key: row.rowKey, className: 'player-history-chart-point', onClick: () => onSelect(row.rowKey), style: { cursor: 'pointer' } },
          E('circle', { cx: xFor(index), cy: yFor(row.avgValue || 0), r: selected ? 9 : 6, fill: selected ? '#ef4444' : '#facc15', stroke: '#0f172a', strokeWidth: 2 }),
          E('text', { x: xFor(index), y: height - 24, textAnchor: 'middle', fill: selected ? '#fecaca' : '#cbd5e1', fontSize: 11, fontWeight: selected ? 900 : 700 }, matchCode(row.match)),
          E('title', null, `${matchCode(row.match)} · AVG ${row.avg} · ${row.phase}`)
        );
      })
    )
  );
}

export function PlayerHistoryModal({ player, players, matches, championship, championships = [], onClose }) {
  const React = window.ReactRuntime;
  const [selectedMatchKey, setSelectedMatchKey] = React.useState('');
  const [selectedChampionshipId, setSelectedChampionshipId] = React.useState('');
  if (!player) return null;

  const sourceChampionships = Array.isArray(championships) && championships.length
    ? championships.map((item) => ({
      id: item.id || item.championship?.championship_id || championship?.championship_id || 'ACTIVE',
      name: item.name || item.championship?.name || championship?.name || 'Campeonato activo',
      status: item.status || item.championship?.status || '',
      matches: item.matches || []
    }))
    : [{ id: championship?.championship_id || 'ACTIVE', name: championship?.name || 'Campeonato activo', status: championship?.status || '', matches: matches || [] }];

  const summaries = sourceChampionships
    .map((source) => championshipSummary(buildPlayerMatchRows(player, source.matches, players, source), source))
    .filter((item) => item.rows.length > 0 || sourceChampionships.length <= 1);
  const activeSummary = selectedChampionshipId ? summaries.find((item) => item.id === selectedChampionshipId) : null;
  const rows = activeSummary ? activeSummary.rows : summaries.flatMap((item) => item.rows);
  const summary = totals(rows);
  const selected = rows.find((row) => row.rowKey === selectedMatchKey) || rows[0] || null;
  const viewTitle = activeSummary ? activeSummary.name : 'Todos los campeonatos';

  return E('div', { className: 'player-history-backdrop', role: 'dialog', 'aria-modal': 'true' },
    E('div', { className: 'player-history-modal player-history-modal-expanded' },
      E('div', { className: 'player-history-header' },
        E('div', null,
          E('h2', null, `Historial de jugador · ${playerName(player)}`),
          E('p', { className: 'small' }, `${viewTitle} · País ${player.country_iso || '-'} · Asociación ${player.association_code || '-'}`)
        ),
        E('div', { className: 'toolbar' },
          activeSummary ? E(Button, { onClick: () => { setSelectedChampionshipId(''); setSelectedMatchKey(''); }, kind: 'soft' }, 'Volver a todos') : null,
          E(Button, { onClick: onClose, kind: 'soft' }, 'Cerrar')
        )
      ),
      E('div', { className: 'grid grid-6 player-history-summary' },
        E(Card, null, E('b', null, 'PJ'), E('div', { className: 'stat-value' }, summary.played)),
        E(Card, null, E('b', null, 'PG'), E('div', { className: 'stat-value' }, summary.wins)),
        E(Card, null, E('b', null, 'PP'), E('div', { className: 'stat-value' }, summary.losses)),
        E(Card, null, E('b', null, 'CAR'), E('div', { className: 'stat-value' }, summary.caroms)),
        E(Card, null, E('b', null, 'ENT'), E('div', { className: 'stat-value' }, summary.innings)),
        E(Card, null, E('b', null, 'AVG total'), E('div', { className: 'stat-value' }, summary.avg))
      ),
      !activeSummary && summaries.length > 1 ? E(Card, { className: 'player-history-championships-card' },
        E('h3', null, 'Promedios por campeonato'),
        E('p', { className: 'small' }, 'Seleccione un campeonato para consultar sus partidas y gráfico individual.'),
        E('div', { className: 'table-wrap' }, E('table', { className: 'player-history-championships-table' },
          E('thead', null, E('tr', null, ['Campeonato', 'Estado', 'PJ', 'PG', 'CAR', 'ENT', 'AVG final', 'Acción'].map((h) => E('th', { key: h }, h)))),
          E('tbody', null, summaries.map((item) => E('tr', { key: item.id },
            E('td', null, E('b', null, item.name)),
            E('td', null, E(Badge, { kind: ['COMPLETED', 'FINALIZED'].includes(item.status) ? 'success' : 'neutral' }, item.status || '-')),
            E('td', null, item.played),
            E('td', null, item.wins),
            E('td', null, item.caroms),
            E('td', null, item.innings),
            E('td', null, item.avg),
            E('td', null, E(Button, { kind: 'soft', onClick: () => { setSelectedChampionshipId(item.id); setSelectedMatchKey(''); } }, 'Ver partidas'))
          )))
        ))
      ) : null,
      E('div', { className: 'player-history-content player-history-content-chart' },
        E('div', { className: 'table-wrap player-history-table-wrap' },
          E('table', { className: 'player-history-table' },
            E('thead', null, E('tr', null, ['Campeonato', 'Partida', 'Fase', 'Rival', 'CAR', 'ENT', 'AVG', 'SM1', 'SM2', 'Estado', 'Resultado'].map((h) => E('th', { key: h }, h)))),
            E('tbody', null, rows.length ? rows.map((row) => E('tr', { key: row.rowKey, className: selected?.rowKey === row.rowKey ? 'selected-row' : '', onClick: () => setSelectedMatchKey(row.rowKey) },
              E('td', null, row.championshipLabel),
              E('td', null, matchCode(row.match)),
              E('td', null, row.phase),
              E('td', { className: 'player-name' }, row.opponent ? playerName(row.opponent) : 'Por definir'),
              E('td', null, row.caroms),
              E('td', null, row.innings),
              E('td', null, row.avg),
              E('td', null, row.s1),
              E('td', null, row.s2),
              E('td', null, row.status),
              E('td', null, E(Badge, { kind: row.winner ? 'success' : 'neutral' }, row.winner ? 'Ganada' : 'No ganada'))
            )) : E('tr', null, E('td', { colSpan: 11 }, 'Sin partidas registradas para este jugador en los campeonatos almacenados.')))
          )
        ),
        E(Card, { className: 'player-history-chart-card' },
          E('h3', null, 'Comportamiento de promedio por partida'),
          E(AverageLineChart, { rows, selectedKey: selected?.rowKey || '', onSelect: setSelectedMatchKey }),
          selected ? E('div', { className: 'player-history-chart-selected' },
            E('b', null, `${matchCode(selected.match)} · ${selected.phase}`),
            E('span', null, `AVG ${selected.avg} · ${selected.caroms} carambolas / ${selected.innings} entradas`),
            E('span', null, `Marcador: ${matchDetailedScore(selected.match)} · Estado: ${matchDisplayStatus(selected.match)}`)
          ) : E('p', { className: 'small' }, 'Seleccione una partida para destacar su punto en la gráfica.')
        )
      )
    )
  );
}
