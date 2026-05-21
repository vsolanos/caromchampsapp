import React, { useEffect, useState } from 'react';
import { E, Card, Badge, Button, EmptyState, SectionTitle } from './ui.js';
import { getChampionshipShare } from '../lib/supabase.js';
import { fmtAvg, groupStandings, matchCode, playerName, roundDisplayName } from '../lib/tournament.js';

function findPlayer(players, id) {
  return players.find((player) => player.player_id === id) || null;
}

export function SharedChampionshipView({ token, auth }) {
  const [share, setShare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getChampionshipShare(token).then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message);
      else if (!data) setError('El enlace no existe o ya no está activo.');
      else setShare(data);
      setLoading(false);
    });
    return () => { active = false; };
  }, [token]);

  if (loading) return E('div', { className: 'app-shell theme-dark shared-shell' }, E(Card, null, E('h2', null, 'Cargando campeonato compartido...')));
  if (error) return E('div', { className: 'app-shell theme-dark shared-shell' }, E(Card, null, E(EmptyState, { title: 'No fue posible abrir el enlace', message: error }), E(Button, { onClick: () => window.location.href = '/' }, 'Volver')));

  const snapshot = share.snapshot || {};
  const championship = snapshot.championship || {};
  const players = snapshot.players || [];
  const groups = snapshot.groups || [];
  const matches = snapshot.matches || [];
  const seeds = snapshot.seeds || [];
  const standings = groups.map((group) => ({ group, rows: groupStandings([group], matches).filter((row) => row.group_id === group.group_id) }));
  const koMatches = matches.filter((match) => match.phase === 'KO');

  return E('div', { className: 'app-shell theme-dark shared-shell' },
    E('main', { className: 'main' },
      E(Card, null,
        E('div', { className: 'topbar' },
          E('div', null,
            E('h1', { className: 'header-title' }, championship.name || share.championship_name),
            E('div', { className: 'header-meta' }, E(Badge, { kind: 'success' }, 'Vista compartida'), E(Badge, null, 'Solo lectura'), E(Badge, { kind: 'info' }, auth?.profile?.email || auth?.user?.email))
          ),
          E(Button, { onClick: () => window.location.href = '/' }, 'Ir a mi cuenta')
        )
      ),
      E(Card, null,
        E(SectionTitle, { title: 'Grupos y posiciones', subtitle: 'Información compartida en modo de consulta.' }),
        standings.length ? E('div', { className: 'grid grid-2' }, standings.map(({ group, rows }) => E('div', { className: 'round-card', key: group.group_id },
          E('h3', null, group.name || group.group_id),
          E('table', null,
            E('thead', null, E('tr', null, ['Pos', 'Jugador', 'Pts', 'AVG'].map((h) => E('th', { key: h }, h)))),
            E('tbody', null, rows.map((row, idx) => E('tr', { key: row.player_id },
              E('td', null, idx + 1),
              E('td', null, playerName(findPlayer(players, row.player_id))),
              E('td', null, row.points),
              E('td', null, fmtAvg(row.avg))
            )))
          )
        ))) : E(EmptyState, { title: 'Sin grupos', message: 'Este campeonato todavía no tiene grupos compartidos.' })
      ),
      E(Card, null,
        E(SectionTitle, { title: 'Llaves y partidas eliminatorias', subtitle: 'Partidas KO finalizadas o programadas.' }),
        koMatches.length ? E('div', { className: 'table-wrap' }, E('table', null,
          E('thead', null, E('tr', null, ['Código', 'Fase', 'Jugador 1', 'Jugador 2', 'Marcador', 'Estado'].map((h) => E('th', { key: h }, h)))),
          E('tbody', null, koMatches.map((match) => E('tr', { key: match.match_id },
            E('td', null, matchCode(match)),
            E('td', null, roundDisplayName(match.round)),
            E('td', null, playerName(findPlayer(players, match.player1_id))),
            E('td', null, playerName(findPlayer(players, match.player2_id))),
            E('td', null, `${match.player1_score ?? '-'} - ${match.player2_score ?? '-'}`),
            E('td', null, match.match_status || '-')
          )))
        )) : E(EmptyState, { title: 'Sin llaves', message: 'Este campeonato todavía no tiene fase eliminatoria compartida.' })
      ),
      E(Card, null,
        E(SectionTitle, { title: 'Clasificados / Ranking público', subtitle: 'Vista de consulta para usuarios activos con enlace.' }),
        seeds.length ? E('div', { className: 'table-wrap' }, E('table', null,
          E('thead', null, E('tr', null, ['Orden', 'Jugador', 'Grupo', 'AVG'].map((h) => E('th', { key: h }, h)))),
          E('tbody', null, seeds.map((seed, idx) => E('tr', { key: `${seed.player_id}-${idx}` },
            E('td', null, idx + 1),
            E('td', null, playerName(findPlayer(players, seed.player_id))),
            E('td', null, seed.group_id || '-'),
            E('td', null, fmtAvg(seed.avg || seed.average || 0))
          )))
        )) : E(EmptyState, { title: 'Sin ranking público', message: 'No hay clasificados publicados en este enlace.' })
      )
    )
  );
}
