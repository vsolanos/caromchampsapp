import { useMemo, useState } from 'react';
import { E, Card, Button, Input, Select, Field, SectionTitle, EmptyState, Badge } from '../components/ui.js';
import { PdfControls, PdfDocument } from '../components/Print.js';
import { startPdfPrint } from '../lib/print.js';
import { getAllRoundOptions, matchCode, matchDetailedScore, matchDisplayStatus, matchRoundKey, matchRoundLabel, playerName, roundDisplayName, scheduleMatches, generateBracketStructure, generateFullBracketSkeleton, resolveMatchPlayer, formatDateEs } from '../lib/tournament.js';

function dayLabel(days, dayId) {
  const index = days.findIndex((d) => d.schedule_day_id === dayId);
  return index >= 0 ? `D-${index + 1}` : dayId || '-';
}

function sortValue(match, key, playersById) {
  if (key === 'group') return match.group_name || '';
  if (key === 'player') return `${playerName(playersById[match.player1_id])} ${playerName(playersById[match.player2_id])}`;
  if (key === 'phase') return `${match.phase} ${matchRoundKey(match)}`;
  if (key === 'round') return matchRoundKey(match);
  if (key === 'table') return match.assigned_table || '';
  if (key === 'status') return match.match_status || '';
  return `${match.scheduled_date || ''} ${match.scheduled_time || ''}`;
}

export function ScheduleModule({ championship, setChampionship, players = [], matches, setMatches, seeds = [], audit }) {
  const [filters, setFilters] = useState({ group: 'ALL', phase: 'ALL', round: 'ALL', player: 'ALL', sort1: 'date', sort2: 'group' });
  const [swapFirst, setSwapFirst] = useState('');
  const [pageSize, setPageSize] = useState(championship.global_settings?.pdf_default_page_size || 'A4');
  const [orientation, setOrientation] = useState(championship.global_settings?.pdf_default_orientation || 'portrait');
  const [scale, setScale] = useState('100');
  const days = championship.schedule_days || [];
  const blackouts = championship.blackouts || [];
  const playersById = Object.fromEntries(players.map((p) => [p.player_id, p]));
  const scheduled = matches.filter((m) => m.scheduled_date || m.scheduled_time).length;
  const conflicts = matches.filter((m) => m.schedule_conflict).length;
  const groupOptions = [...new Set(matches.map((m) => m.group_name).filter(Boolean))];
  const phaseOptions = [...new Set(matches.map((m) => m.phase).filter(Boolean))];
  const roundOptions = getAllRoundOptions(matches).filter((r) => ['R0', 'R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F'].includes(r));
  const playerOptions = [...new Set(matches.flatMap((m) => [m.player1_id, m.player2_id]).filter(Boolean))].map((id) => playersById[id]).filter(Boolean).sort((a, b) => playerName(a).localeCompare(playerName(b)));
  const sortOptions = [['date', 'Fecha/Hora'], ['group', 'Grupo'], ['player', 'Jugador'], ['phase', 'Fase'], ['round', 'Ronda'], ['table', 'Mesa'], ['status', 'Estado']];

  const patchDay = (dayId, key, value) => setChampionship({ ...championship, schedule_days: days.map((d) => d.schedule_day_id === dayId ? { ...d, [key]: value } : d) });
  const addDay = () => {
    const next = days.length + 1;
    const base = championship.start_date || '2026-05-10';
    setChampionship({ ...championship, schedule_days: [...days, { schedule_day_id: `D-${next}`, play_date: base, is_play_day: true, daily_start_time: championship.daily_start_time || '08:00', daily_end_time: championship.daily_end_time || '20:00', notes: `Día ${next}` }] });
  };
  const removeDay = (dayId) => setChampionship({ ...championship, schedule_days: days.filter((d) => d.schedule_day_id !== dayId), blackouts: blackouts.filter((b) => b.schedule_day_id !== dayId) });
  const addBlock = () => {
    const firstDay = days[0];
    if (!firstDay) return alert('Agregue primero un día de juego.');
    setChampionship({ ...championship, blackouts: [...blackouts, { blackout_id: `B-${blackouts.length + 1}`, schedule_day_id: firstDay.schedule_day_id, start_time: '12:00', end_time: '13:00', reason: 'Bloque no disponible', is_hard_block: true }] });
  };
  const patchBlock = (id, key, value) => setChampionship({ ...championship, blackouts: blackouts.map((b) => b.blackout_id === id ? { ...b, [key]: value } : b) });
  const removeBlock = (id) => setChampionship({ ...championship, blackouts: blackouts.filter((b) => b.blackout_id !== id) });
  const patchMatch = (matchId, patch) => setMatches(matches.map((m) => m.match_id === matchId ? { ...m, ...patch } : m));
  const run = () => { setMatches(scheduleMatches(championship, matches)); audit('SCHEDULE_GENERATED', `Agenda de todas las fases actualizada para ${matches.length} partidas.`); };
  const generateFinalPhasesAndSchedule = () => {
    const groupMatches = matches.filter((m) => m.phase === 'GROUPS');
    const existingElimination = matches.filter((m) => ['PRE_ELIMINATION', 'KO'].includes(m.phase));
    const startNumber = groupMatches.length
      ? Math.max(0, ...groupMatches.map((m) => Number(m.match_number || 0))) + 1
      : Math.max(0, ...matches.map((m) => Number(m.match_number || 0))) + 1;
    const q = Math.max(4, Number(championship.total_qualifiers_f2 || seeds.length || 16));
    const projectionSeeds = seeds.length
      ? seeds
      : Array.from({ length: q }, (_, index) => ({
          seed_position: index + 1,
          player: { player_id: `TBD:${index + 1}`, first_name: 'Clasificado', last_name: `#${index + 1}`, country_iso: 'OTHER' }
        }));
    const skeleton = generateFullBracketSkeleton(championship, projectionSeeds, startNumber);
    if (skeleton.error) return alert(skeleton.error);

    const keyOf = (m) => `${m.phase}|${m.ko_round || ''}|${m.bracket_order || ''}`;
    const existingByKey = new Map(existingElimination.map((m) => [keyOf(m), m]));
    const skeletonKeys = new Set(skeleton.matches.map(keyOf));
    const mergedElimination = skeleton.matches.map((planned) => {
      const existing = existingByKey.get(keyOf(planned));
      if (!existing) return planned;
      return {
        ...planned,
        ...existing,
        match_number: existing.match_number || planned.match_number,
        source_match1_id: existing.source_match1_id || planned.source_match1_id,
        source_match2_id: existing.source_match2_id || planned.source_match2_id
      };
    });
    existingElimination.forEach((m) => {
      if (!skeletonKeys.has(keyOf(m))) mergedElimination.push(m);
    });

    const baseMatches = [...groupMatches, ...mergedElimination];
    setMatches(scheduleMatches(championship, baseMatches));
    audit('PROJECTED_PHASE_SCHEDULE', 'Partidas proyectadas hasta la final generadas/actualizadas con fechas, horarios y mesas para todas las fases.');
  };
  const clear = () => { setMatches(matches.map((m) => ({ ...m, scheduled_date: '', scheduled_time: '', assigned_table: '', schedule_conflict: false, conflict_reason: '' }))); audit('SCHEDULE_CLEARED', 'Agenda limpiada.'); };

  const swapMatch = (matchId) => {
    if (!swapFirst) { setSwapFirst(matchId); return; }
    if (swapFirst === matchId) { setSwapFirst(''); return; }
    const first = matches.find((m) => m.match_id === swapFirst);
    const second = matches.find((m) => m.match_id === matchId);
    if (!first || !second) return setSwapFirst('');
    setMatches(matches.map((m) => {
      if (m.match_id === first.match_id) return { ...m, scheduled_date: second.scheduled_date, scheduled_time: second.scheduled_time, assigned_table: second.assigned_table };
      if (m.match_id === second.match_id) return { ...m, scheduled_date: first.scheduled_date, scheduled_time: first.scheduled_time, assigned_table: first.assigned_table };
      return m;
    }));
    audit('SCHEDULE_SWAP', `${matchCode(first)} intercambiada con ${matchCode(second)}.`);
    setSwapFirst('');
  };

  const visibleMatches = useMemo(() => {
    const rows = matches.filter((m) =>
      (filters.group === 'ALL' || m.group_name === filters.group) &&
      (filters.phase === 'ALL' || m.phase === filters.phase) &&
      (filters.round === 'ALL' || matchRoundKey(m) === filters.round) &&
      (filters.player === 'ALL' || m.player1_id === filters.player || m.player2_id === filters.player)
    );
    return [...rows].sort((a, b) => {
      const first = sortValue(a, filters.sort1, playersById).localeCompare(sortValue(b, filters.sort1, playersById));
      if (first !== 0) return first;
      return sortValue(a, filters.sort2, playersById).localeCompare(sortValue(b, filters.sort2, playersById));
    });
  }, [matches, filters, players]);

  const exportSchedulePdf = () => startPdfPrint({
    bodyClass: 'printing-schedule',
    title: `Calendario - ${championship.name || 'Campeonato'}`,
    pageSize,
    orientation,
    scale,
    afterPrint: () => audit('SCHEDULE_PDF', 'PDF de calendario generado.')
  });

  return E('div', { className: 'grid schedule-export-root' },
    E(Card, { className: 'schedule-control-card' },
      E(SectionTitle, { title: 'Calendario · Configuración', subtitle: 'Días de juego, horarios, bloques no disponibles y generación automática.' }),
      E('div', { className: 'grid grid-4', style: { marginTop: 14 } },
        E('div', { className: 'round-card' }, E('b', null, 'Partidas'), E('div', null, matches.length)),
        E('div', { className: 'round-card' }, E('b', null, 'Agendadas'), E('div', null, scheduled)),
        E('div', { className: 'round-card' }, E('b', null, 'Conflictos'), E('div', null, conflicts)),
        E('div', { className: 'round-card' }, E('b', null, 'Seleccionada para intercambio'), E('div', null, swapFirst ? matchCode(matches.find((m) => m.match_id === swapFirst)) : '-'))
      ),
      E('div', { className: 'toolbar', style: { marginTop: 14 } }, E(Button, { onClick: run, kind: 'success' }, 'Generar/actualizar agenda de todas las fases'), E(Button, { onClick: generateFinalPhasesAndSchedule, kind: 'soft' }, 'Generar Partidas Proy.'), E(Button, { onClick: clear, kind: 'warning' }, 'Limpiar agenda'), E(Button, { onClick: addDay, kind: 'soft' }, 'Agregar día'), E(Button, { onClick: addBlock, kind: 'soft' }, 'Agregar bloque'), E(Button, { onClick: exportSchedulePdf, kind: 'soft' }, 'Generar PDF')),
      E(PdfControls, { pageSize, setPageSize, orientation, setOrientation, scale, setScale })
    ),
    E('section', { className: 'schedule-print-scope' },
      E(PdfDocument, { title: 'Reporte de Calendario', subtitle: 'Días, bloques y agenda editable del campeonato', championship, meta: [`Partidas: ${matches.length}`, `Agendadas: ${scheduled}`, `Conflictos: ${conflicts}`] },
      E(Card, null,
      E(SectionTitle, { title: 'Días y bloques', subtitle: 'La columna Día muestra D-1, D-2, etc., no identificadores técnicos.' }),
      E('div', { className: 'table-wrap', style: { marginTop: 14 } }, E('table', null,
        E('thead', null, E('tr', null, ['Día', 'Fecha', 'Activo', 'Inicio', 'Fin', 'Notas', 'Acciones'].map((h) => E('th', { key: h }, h)))),
        E('tbody', null, days.map((day, index) => E('tr', { key: day.schedule_day_id },
          E('td', null, `D-${index + 1}`),
          E('td', null, E(Input, { type: 'date', value: day.play_date, onChange: (e) => patchDay(day.schedule_day_id, 'play_date', e.target.value) })),
          E('td', null, E(Select, { value: day.is_play_day === false ? 'NO' : 'SI', onChange: (e) => patchDay(day.schedule_day_id, 'is_play_day', e.target.value === 'SI') }, ['SI', 'NO'].map((x) => E('option', { key: x }, x)))),
          E('td', null, E(Input, { type: 'time', value: day.daily_start_time || '08:00', onChange: (e) => patchDay(day.schedule_day_id, 'daily_start_time', e.target.value) })),
          E('td', null, E(Input, { type: 'time', value: day.daily_end_time || '20:00', onChange: (e) => patchDay(day.schedule_day_id, 'daily_end_time', e.target.value) })),
          E('td', null, E(Input, { value: day.notes || '', onChange: (e) => patchDay(day.schedule_day_id, 'notes', e.target.value) })),
          E('td', null, E(Button, { onClick: () => removeDay(day.schedule_day_id), kind: 'danger' }, 'Eliminar'))
        )))
      )),
      blackouts.length ? E('div', { className: 'table-wrap', style: { marginTop: 14 } }, E('table', null,
        E('thead', null, E('tr', null, ['Día', 'Inicio', 'Fin', 'Razón', 'Acciones'].map((h) => E('th', { key: h }, h)))),
        E('tbody', null, blackouts.map((b) => E('tr', { key: b.blackout_id },
          E('td', null, E(Select, { value: b.schedule_day_id, onChange: (e) => patchBlock(b.blackout_id, 'schedule_day_id', e.target.value) }, days.map((d, index) => E('option', { key: d.schedule_day_id, value: d.schedule_day_id }, `${dayLabel(days, d.schedule_day_id)} · ${formatDateEs(d.play_date)}`)))),
          E('td', null, E(Input, { type: 'time', value: b.start_time, onChange: (e) => patchBlock(b.blackout_id, 'start_time', e.target.value) })),
          E('td', null, E(Input, { type: 'time', value: b.end_time, onChange: (e) => patchBlock(b.blackout_id, 'end_time', e.target.value) })),
          E('td', null, E(Input, { value: b.reason || '', onChange: (e) => patchBlock(b.blackout_id, 'reason', e.target.value) })),
          E('td', null, E(Button, { onClick: () => removeBlock(b.blackout_id), kind: 'danger' }, 'Eliminar'))
        )))
      )) : null
    ),
    E(Card, null,
      E(SectionTitle, { title: 'Agenda editable', subtitle: 'Filtros junto a la agenda y ordenamiento por dos elementos.' }),
      E('div', { className: 'grid grid-6', style: { marginTop: 14 } },
        E(Field, { label: 'Grupo' }, E(Select, { value: filters.group, onChange: (e) => setFilters({ ...filters, group: e.target.value }) }, [E('option', { key: 'ALL' }, 'ALL')].concat(groupOptions.map((x) => E('option', { key: x }, x))))),
        E(Field, { label: 'Jugador' }, E(Select, { value: filters.player, onChange: (e) => setFilters({ ...filters, player: e.target.value }) }, [E('option', { key: 'ALL', value: 'ALL' }, 'ALL')].concat(playerOptions.map((p) => E('option', { key: p.player_id, value: p.player_id }, playerName(p)))))),
        E(Field, { label: 'Fase' }, E(Select, { value: filters.phase, onChange: (e) => setFilters({ ...filters, phase: e.target.value }) }, [E('option', { key: 'ALL' }, 'ALL')].concat(phaseOptions.map((x) => E('option', { key: x }, x))))),
        E(Field, { label: 'Ronda KO' }, E(Select, { value: filters.round, onChange: (e) => setFilters({ ...filters, round: e.target.value }) }, [E('option', { key: 'ALL', value: 'ALL' }, 'ALL')].concat(roundOptions.map((x) => E('option', { key: x, value: x }, roundDisplayName(x)))))),
        E(Field, { label: 'Orden 1' }, E(Select, { value: filters.sort1, onChange: (e) => setFilters({ ...filters, sort1: e.target.value }) }, sortOptions.map(([v, l]) => E('option', { key: v, value: v }, l)))),
        E(Field, { label: 'Orden 2' }, E(Select, { value: filters.sort2, onChange: (e) => setFilters({ ...filters, sort2: e.target.value }) }, sortOptions.map(([v, l]) => E('option', { key: v, value: v }, l))))
      ),
      visibleMatches.length === 0 ? E(EmptyState, { title: 'Sin partidas', message: 'Genere grupos o ajuste filtros.' }) : E('div', { className: 'table-wrap', style: { marginTop: 14 } }, E('table', null,
        E('thead', null, E('tr', null, ['ID', 'Fecha', 'Hora', 'Mesa', 'Fase', 'Ronda/Grupo', 'Jugador 1', 'Jugador 2', 'Marcador', 'Estado', 'Intercambiar'].map((h) => E('th', { key: h }, h)))),
        E('tbody', null, visibleMatches.map((match) => E('tr', { key: match.match_id, className: `${swapFirst === match.match_id ? 'swap-selected' : ''} ${match.match_status === 'COMPLETED' ? 'completed-row' : ''}`.trim() },
          E('td', null, matchCode(match)),
          E('td', null, E(Input, { type: 'date', value: match.scheduled_date || '', onChange: (e) => patchMatch(match.match_id, { scheduled_date: e.target.value }) })),
          E('td', null, E(Input, { type: 'time', value: match.scheduled_time || '', onChange: (e) => patchMatch(match.match_id, { scheduled_time: e.target.value }) })),
          E('td', null, E(Select, { value: match.assigned_table || '', onChange: (e) => patchMatch(match.match_id, { assigned_table: e.target.value }) }, [E('option', { key: '', value: '' }, 'Sin mesa')].concat((championship.tables || []).filter((t) => t.is_active).map((t) => E('option', { key: t.table_id, value: t.display_name }, t.display_name))))),
          E('td', null, match.phase),
          E('td', null, match.group_name || matchRoundLabel(match)),
          E('td', null, resolveMatchPlayer(match, 1, matches, playersById).label),
          E('td', null, resolveMatchPlayer(match, 2, matches, playersById).label),
          E('td', null, matchDetailedScore(match)),
          E('td', { className: 'schedule-status-cell' }, E(Badge, { kind: match.match_status === 'COMPLETED' ? 'success' : match.schedule_conflict ? 'danger' : 'neutral' }, matchDisplayStatus(match))),
          E('td', null, E(Button, { onClick: () => swapMatch(match.match_id), kind: swapFirst === match.match_id ? 'warning' : 'soft' }, swapFirst ? 'Elegir 2da' : 'Elegir'))
        )))
      ))
    )
    )
    )
  );
}
