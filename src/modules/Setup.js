import { useMemo, useState } from 'react';
import { E, Card, Input, Select, Field, SectionTitle, Badge, Button, EmptyState } from '../components/ui.js';
import { ASSOCIATIONS } from '../data/defaults.js';
import { calculateTotalQualifiers, fmtAvg, num, playerName, validateChampionship, getEligiblePlayers, syncScheduleDays, isInternationalChampionship, parseTableGroupBlock } from '../lib/tournament.js';

const DIVISIONS = ['PRIMERA', 'SEGUNDA', 'TERCERA', 'SELECTIVO', 'INTERNACIONAL'];
const GROUP_MODES = ['FULL_RANDOM', 'SEEDED_RANDOM', 'SEEDED_RANDOM_COUNTRY_SPREAD', 'SNAKE_DRAFT'];
const CLOSURE_TYPES = ['CON_CIERRE', 'SIN_CIERRE'];
const THIRD_PLACE = ['POINTS_THEN_AVG', 'AVG_THEN_POINTS'];
const CHAMPIONSHIP_TYPES = ['NORMAL', 'DOBLE_FASE_GRUPOS', 'RANKING'];

function StatBlock({ label, value }) {
  return E('div', { className: 'round-card' }, E('div', { className: 'stat-label' }, label), E('div', { className: 'stat-value' }, value));
}

function playerMeta(player, isInternational) {
  return isInternational ? `${player.country_iso || '-'} · ${player.division_level}` : `${player.association_code || '-'} · ${player.division_level}`;
}

export function SetupModule({ championship, setChampionship, players, championships = [], activeId = '' }) {
  const [participantFilter, setParticipantFilter] = useState({ text: '', country: 'ALL', division: 'ALL', association: 'ALL', status: 'ACTIVO', seed: 'ALL', selected: 'ALL' });
  const participantIds = Array.isArray(championship.participant_ids) ? championship.participant_ids : players.filter((p) => p.status === 'ACTIVO').map((p) => p.player_id);
  const participantSeeds = championship.participant_seeds || {};
  const isInternational = isInternationalChampionship(championship);
  const isSelective = championship.division_filter === 'SELECTIVO';
  const isRanking = (championship.championship_type || 'NORMAL') === 'RANKING';
  const protectedStatuses = ['GROUPS_CLOSED', 'GROUPS_F2_READY', 'GROUPS_F2_CLOSED', 'CLOSED', 'FINALIZED', 'COMPLETED'];
  const setupLocked = protectedStatuses.includes(championship.status);
  const participantsLocked = setupLocked;
  const phaseRulesLocked = setupLocked;
  const tablesLocked = setupLocked;
  const baseDirectory = players.filter((p) => p.status === 'ACTIVO' && (isInternational || (isSelective ? p.division_level === 'PRIMERA' : p.division_level === championship.division_filter)));
  const countries = [...new Set(players.map((p) => p.country_iso).filter(Boolean))].sort();
  const eligibleDirectory = useMemo(() => baseDirectory.filter((p) => {
    const text = `${playerName(p)} ${p.player_code || ''} ${p.association_code || ''} ${p.country_iso || ''}`.toLowerCase();
    const matchText = !participantFilter.text || text.includes(participantFilter.text.toLowerCase());
    const matchCountry = participantFilter.country === 'ALL' || p.country_iso === participantFilter.country;
    const matchDivision = participantFilter.division === 'ALL' || p.division_level === participantFilter.division;
    const matchAssociation = participantFilter.association === 'ALL' || p.association_code === participantFilter.association;
    const matchStatus = participantFilter.status === 'ALL' || p.status === participantFilter.status;
    const matchSeed = participantFilter.seed === 'ALL' || (participantFilter.seed === 'YES' ? Boolean(p.is_seed || participantSeeds[p.player_id]) : !p.is_seed && !participantSeeds[p.player_id]);
    const matchSelected = participantFilter.selected === 'ALL' || (participantFilter.selected === 'YES' ? participantIds.includes(p.player_id) : !participantIds.includes(p.player_id));
    return matchText && matchCountry && matchDivision && matchAssociation && matchStatus && matchSeed && matchSelected;
  }), [baseDirectory, participantFilter, participantIds, participantSeeds]);

  const enrolled = getEligiblePlayers({ ...championship, participant_ids: participantIds }, players);
  const groupCount = Math.max(1, Math.ceil(enrolled.length / num(championship.preferred_group_size, 4)));
  const total = calculateTotalQualifiers(championship, groupCount);
  const errors = isRanking
    ? []
    : validateChampionship({ ...championship, total_qualifiers_f2: total, participant_ids: participantIds }, enrolled);
  const rankingRules = Array.isArray(championship.ranking_points_rules) ? championship.ranking_points_rules : [];
  const rankingChampionshipOptions = championships
    .filter((row) => row.id !== activeId)
    .filter((row) => row.championship?.championship_type === 'RANKING')
    .filter((row) => !['CLOSED', 'FINALIZED', 'COMPLETED'].includes(row.championship?.status))
    .filter((row) => {
      const parent = row.championship;
      if (!championship.start_date || !championship.end_date || !parent.start_date || !parent.end_date) return true;
      return String(championship.start_date) >= String(parent.start_date) && String(championship.end_date) <= String(parent.end_date);
    });
  const addRankingRule = () => setChampionship({
    ...championship,
    ranking_points_rules: [...rankingRules, { rule_id: `RP-${Date.now()}`, from_position: 1, to_position: 1, points: 0 }]
  });
  const patchRankingRule = (ruleId, key, value) => setChampionship({
    ...championship,
    ranking_points_rules: rankingRules.map((rule) => rule.rule_id === ruleId ? { ...rule, [key]: num(value, 0) } : rule)
  });
  const removeRankingRule = (ruleId) => setChampionship({
    ...championship,
    ranking_points_rules: rankingRules.filter((rule) => rule.rule_id !== ruleId)
  });

  const patch = (key, value) => {
    let next = { ...championship, [key]: value, total_qualifiers_f2: total };
    if (key === 'championship_type') {
      next = value === 'RANKING'
        ? { ...next, championship_type: value, ranking_championship_id: '', participant_ids: [], participant_seeds: {}, status: next.status || 'DRAFT' }
        : { ...next, championship_type: value, ranking_championship_id: next.ranking_championship_id || '', status: next.status || 'DRAFT' };
    }
    if (key === 'division_filter') {
      const nextIsInternational = value === 'INTERNACIONAL';
      const nextIsSelective = value === 'SELECTIVO';
      const eligible = players
        .filter((p) => p.status === 'ACTIVO' && (nextIsInternational || (nextIsSelective ? p.division_level === 'PRIMERA' : p.division_level === value)))
        .map((p) => p.player_id);
      next = { ...next, participant_ids: eligible, participant_seeds: Object.fromEntries(Object.entries(participantSeeds).filter(([id]) => eligible.includes(id))) };
    }
    if (key === 'start_date' || key === 'end_date') {
      const start = key === 'start_date' ? value : next.start_date;
      const end = key === 'end_date' ? value : next.end_date;
      next = { ...next, schedule_days: syncScheduleDays(next, start, end) };
    }
    setChampionship(next);
  };
  const patchRule = (ruleId, key, value) => {
    if (phaseRulesLocked) return alert('La configuración deportiva no puede modificarse después de clasificar grupos o cerrar el campeonato.');
    setChampionship({ ...championship, phase_rules: (championship.phase_rules || []).map((rule) => rule.rule_id === ruleId ? { ...rule, [key]: value } : rule) });
  };
  const patchTable = (tableId, key, value) => {
    if (tablesLocked) return alert('Las mesas no pueden modificarse después de clasificar grupos o cerrar el campeonato.');
    setChampionship({ ...championship, tables: championship.tables.map((t) => t.table_id === tableId ? { ...t, [key]: value } : t) });
  };
  const addTable = () => {
    if (tablesLocked) return alert('Las mesas no pueden modificarse después de clasificar grupos o cerrar el campeonato.');
    const next = championship.tables.length + 1;
    setChampionship({ ...championship, tables: [...championship.tables, { table_id: `T-${next}`, table_number: next, display_name: `Mesa ${next}`, is_active: true }] });
  };
  const removeTable = (tableId) => {
    if (tablesLocked) return alert('Las mesas no pueden modificarse después de clasificar grupos o cerrar el campeonato.');
    setChampionship({ ...championship, tables: championship.tables.filter((t) => t.table_id !== tableId) });
  };
  const setParticipant = (playerId, selected) => {
    if (participantsLocked) return alert('No es posible modificar jugadores después de clasificar grupos o cerrar el campeonato.');
    const current = new Set(participantIds);
    const nextSeeds = { ...participantSeeds };
    if (selected) current.add(playerId); else { current.delete(playerId); delete nextSeeds[playerId]; }
    setChampionship({ ...championship, participant_ids: [...current], participant_seeds: nextSeeds });
  };
  const setParticipantSeed = (playerId, value) => {
    if (participantsLocked) return alert('No es posible modificar No CBZ después de clasificar grupos o cerrar el campeonato.');
    const nextSeeds = { ...participantSeeds };
    if (value === '' || value === null || value === undefined) delete nextSeeds[playerId]; else nextSeeds[playerId] = num(value);
    setChampionship({ ...championship, participant_seeds: nextSeeds });
  };
  const selectAllVisible = () => participantsLocked ? alert('No es posible modificar jugadores después de clasificar grupos o cerrar el campeonato.') : setChampionship({ ...championship, participant_ids: [...new Set([...participantIds, ...eligibleDirectory.map((p) => p.player_id)])], participant_seeds: participantSeeds });
  const selectAllBase = () => participantsLocked ? alert('No es posible modificar jugadores después de clasificar grupos o cerrar el campeonato.') : setChampionship({ ...championship, participant_ids: baseDirectory.map((p) => p.player_id), participant_seeds: participantSeeds });
  const removeVisible = () => {
    if (participantsLocked) return alert('No es posible modificar jugadores después de clasificar grupos o cerrar el campeonato.');
    const visible = new Set(eligibleDirectory.map((p) => p.player_id));
    const nextSeeds = Object.fromEntries(Object.entries(participantSeeds).filter(([id]) => !visible.has(id)));
    setChampionship({ ...championship, participant_ids: participantIds.filter((id) => !visible.has(id)), participant_seeds: nextSeeds });
  };
  const selectActive = () => participantsLocked ? alert('No es posible modificar jugadores después de clasificar grupos o cerrar el campeonato.') : setChampionship({ ...championship, participant_ids: players.filter((p) => p.status === 'ACTIVO').map((p) => p.player_id), participant_seeds: participantSeeds });
  const clearParticipants = () => participantsLocked ? alert('No es posible modificar jugadores después de clasificar grupos o cerrar el campeonato.') : setChampionship({ ...championship, participant_ids: [], participant_seeds: {} });

  return E('div', { className: `grid setup-wizard-grid ${isRanking ? 'setup-ranking-mode' : ''}`.trim() },
    E(Card, null,
      E(SectionTitle, { title: 'Campeonato · Paso 1: Datos generales', subtitle: 'Información base del torneo, responsable, fechas y canales opcionales.' }),
      E('div', { className: 'grid grid-4', style: { marginTop: 14 } },
        E(Field, { label: 'Nombre del campeonato' }, E(Input, { value: championship.name, onChange: (e) => patch('name', e.target.value) })),
        E(Field, { label: 'Sede / recinto' }, E(Input, { value: championship.venue_name || '', onChange: (e) => patch('venue_name', e.target.value) })),
        E(Field, { label: 'Asociación organizadora' }, E(Select, { value: championship.organizing_association_code || 'ASOBIGRIE', onChange: (e) => patch('organizing_association_code', e.target.value) }, ASSOCIATIONS.map((x) => E('option', { key: x }, x)))),
        E(Field, { label: 'Responsable inicial' }, E(Input, { value: championship.responsible_name || '', onChange: (e) => patch('responsible_name', e.target.value) })),
        E(Field, { label: 'Director Técnico' }, E(Input, { value: championship.technical_director_name || '', onChange: (e) => patch('technical_director_name', e.target.value), placeholder: 'Nombre del Director Técnico' })),
        E(Field, { label: 'Representante 1' }, E(Input, { value: championship.representative1_name || '', onChange: (e) => patch('representative1_name', e.target.value), placeholder: 'Nombre del representante 1' })),
        E(Field, { label: 'Representante 2' }, E(Input, { value: championship.representative2_name || '', onChange: (e) => patch('representative2_name', e.target.value), placeholder: 'Nombre del representante 2' })),
        E(Field, { label: 'Fecha inicio' }, E(Input, { type: 'date', value: championship.start_date || '', onChange: (e) => patch('start_date', e.target.value) })),
        E(Field, { label: 'Fecha fin' }, E(Input, { type: 'date', value: championship.end_date || '', onChange: (e) => patch('end_date', e.target.value) })),
        E(Field, { label: 'División objetivo' }, E(Select, { value: championship.division_filter, onChange: (e) => patch('division_filter', e.target.value) }, DIVISIONS.map((x) => E('option', { key: x }, x)))),
        E(Field, { label: 'Tipo de campeonato' }, E(Select, { disabled: setupLocked, value: championship.championship_type || 'NORMAL', onChange: (e) => patch('championship_type', e.target.value) }, CHAMPIONSHIP_TYPES.map((x) => E('option', { key: x, value: x }, x === 'RANKING' ? 'Ranking' : x === 'DOBLE_FASE_GRUPOS' ? 'Doble Fase Grupos' : 'Normal')))),
        E(Field, { label: 'Control de promedios' }, E(Select, { disabled: setupLocked, value: championship.average_control_enabled === false ? 'NO' : 'SI', onChange: (e) => patch('average_control_enabled', e.target.value === 'SI') }, ['SI', 'NO'].map((x) => E('option', { key: x, value: x }, x)))),
        isRanking ? E(Field, { label: 'Cantidad de campeonatos para ranking' }, E(Input, { type: 'number', min: 1, value: championship.ranking_max_championships || 1, onChange: (e) => patch('ranking_max_championships', num(e.target.value, 1)) })) : null,
        ['NORMAL', 'DOBLE_FASE_GRUPOS'].includes(championship.championship_type || 'NORMAL') ? E(Field, { label: 'Campeonato Ranking', hint: 'Solo se muestran rankings activos dentro del rango de fechas.' }, E(Select, { value: championship.ranking_championship_id || '', onChange: (e) => patch('ranking_championship_id', e.target.value) }, E('option', { value: '' }, 'No asociado'), rankingChampionshipOptions.map((row) => E('option', { key: row.id, value: row.championship.championship_id }, row.name)))) : null,
        E(Field, { label: 'Website opcional' }, E(Input, { value: championship.website_url || '', onChange: (e) => patch('website_url', e.target.value), placeholder: 'https://...' })),
        E(Field, { label: 'Grupo WhatsApp opcional' }, E(Input, { value: championship.whatsapp_group || '', onChange: (e) => patch('whatsapp_group', e.target.value), placeholder: 'URL o nombre de grupo' }))
      )
    ),
    isRanking ? E(Card, null,
      E(SectionTitle, { title: 'Campeonato Ranking · Puntuaciones', subtitle: 'Defina rangos de posiciones y puntos acumulables por campeonato normal asociado.' }),
      E('div', { className: 'toolbar', style: { marginTop: 12 } }, E(Button, { onClick: addRankingRule, kind: 'success' }, 'Agregar rango de puntos')),
      E('div', { className: 'table-wrap', style: { marginTop: 14 } }, E('table', { className: 'ranking-rules-table' },
        E('thead', null, E('tr', null, ['Desde posición', 'Hasta posición', 'Puntos', 'Acciones'].map((h) => E('th', { key: h }, h)))),
        E('tbody', null, rankingRules.map((rule) => E('tr', { key: rule.rule_id },
          E('td', null, E(Input, { type: 'number', min: 1, value: rule.from_position, onChange: (e) => patchRankingRule(rule.rule_id, 'from_position', e.target.value) })),
          E('td', null, E(Input, { type: 'number', min: 1, value: rule.to_position, onChange: (e) => patchRankingRule(rule.rule_id, 'to_position', e.target.value) })),
          E('td', null, E(Input, { type: 'number', min: 0, value: rule.points, onChange: (e) => patchRankingRule(rule.rule_id, 'points', e.target.value) })),
          E('td', null, E(Button, { onClick: () => removeRankingRule(rule.rule_id), kind: 'danger' }, 'Eliminar'))
        )))
      ))
    ) : null,
    E(Card, { className: 'setup-normal-only' },
      E(SectionTitle, { title: 'Campeonato · Paso 3: Reglas y parámetros operativos', subtitle: 'Para campeonatos abiertos use INTERNACIONAL. Para selectivos use SELECTIVO: solo primera división y sin ascenso/descenso.' }),
      E('div', { className: 'grid grid-4', style: { marginTop: 14 } },
        E(Field, { label: 'Modalidad' }, E(Select, { value: championship.play_mode, onChange: (e) => patch('play_mode', e.target.value) }, ['RACE', 'SETS'].map((x) => E('option', { key: x }, x)))),
        E(Field, { label: 'Tamaño grupo' }, E(Select, { value: championship.preferred_group_size, onChange: (e) => patch('preferred_group_size', num(e.target.value)) }, [3, 4, 5, 6].map((x) => E('option', { key: x }, x)))),
        E(Field, { label: 'Modo generación grupos' }, E(Select, { value: championship.group_generation_mode, onChange: (e) => patch('group_generation_mode', e.target.value) }, GROUP_MODES.map((x) => E('option', { key: x }, x)))),
        E(Field, { label: 'Clasificados directos/grupo' }, E(Input, { type: 'number', value: championship.qualifiers_per_group, onChange: (e) => patch('qualifiers_per_group', num(e.target.value)) })),
        E(Field, { label: 'Posición adicional' }, E(Input, { type: 'number', value: championship.extra_qualifier_position, onChange: (e) => patch('extra_qualifier_position', num(e.target.value)) })),
        E(Field, { label: 'Mejores adicionales' }, E(Input, { type: 'number', value: championship.extra_qualifiers_count, onChange: (e) => patch('extra_qualifiers_count', num(e.target.value)) })),
        E(Field, { label: 'Total F2 calculado' }, E(Input, { type: 'number', disabled: true, value: total })),
        E(Field, { label: 'Carambolas objetivo default' }, E(Input, { type: 'number', value: championship.target_points, onChange: (e) => patch('target_points', num(e.target.value)) })),
        E(Field, { label: 'Límite entradas default' }, E(Input, { type: 'number', value: championship.innings_limit, onChange: (e) => patch('innings_limit', num(e.target.value)) })),
        E(Field, { label: 'Tipo cierre default' }, E(Select, { value: championship.closure_type, onChange: (e) => patch('closure_type', e.target.value) }, CLOSURE_TYPES.map((x) => E('option', { key: x }, x)))),
        E(Field, { label: 'Descanso mínimo default' }, E(Input, { type: 'number', value: championship.minimum_rest_time_minutes, onChange: (e) => patch('minimum_rest_time_minutes', num(e.target.value)) })),
        E(Field, { label: 'Política tercer lugar' }, E(Select, { value: championship.third_place_policy, onChange: (e) => patch('third_place_policy', e.target.value) }, THIRD_PLACE.map((x) => E('option', { key: x }, x)))),
        E(Field, { label: 'Mín. partidas AVG cierre' }, E(Input, { type: 'number', value: championship.minimum_matches_for_avg_close, onChange: (e) => patch('minimum_matches_for_avg_close', num(e.target.value)) })),
        E(Field, { label: 'Bloques de partidas por grupo / distribución de mesas', hint: 'Ejemplos: 0 = grupo completo en una mesa; 2 = bloques de 2 en una mesa; 2D2 = bloques de 2 distribuidos en 2 mesas.' }, E(Input, { value: championship.table_assign_block ?? '2', onChange: (e) => patch('table_assign_block', e.target.value.toUpperCase()) })),
        E(Field, { label: 'Seed sorteo' }, E(Input, { value: championship.random_seed, onChange: (e) => patch('random_seed', e.target.value) }))
      ),
      E('div', { className: 'grid grid-4', style: { marginTop: 14 } },
        E(StatBlock, { label: 'Jugadores seleccionados', value: enrolled.length }),
        E(StatBlock, { label: 'Grupos estimados', value: groupCount }),
        E(StatBlock, { label: 'Clasificados F2', value: total }),
        E(StatBlock, { label: 'Mesas activas', value: championship.tables.filter((t) => t.is_active).length })
      ),
      E('p', { className: 'small', style: { marginTop: 10 } }, `Bloque mesa normalizado: ${parseTableGroupBlock(championship.table_assign_block, championship.tables.filter((t) => t.is_active).length || 1).normalized}`),
      errors.length ? E('ul', { className: 'small validation-card', style: { padding: 14, marginTop: 14 } }, errors.map((err) => E('li', { key: err }, err))) : E('p', { className: 'small', style: { color: '#047857', marginTop: 14 } }, 'Configuración válida para generar grupos.')
    ),
    E(Card, { className: 'setup-normal-only' },
      phaseRulesLocked ? E('div', { className: 'validation-card small' }, 'Reglas bloqueadas: ya se clasificaron grupos o el campeonato está cerrado.') : null,
      E(SectionTitle, { title: 'Campeonato · Reglas por fase/ronda', subtitle: 'Cada partida congelará la regla aplicada al momento de su creación.' }),
      E('div', { className: 'table-wrap', style: { marginTop: 14 } },
        E('table', null,
          E('thead', null, E('tr', null, ['Fase', 'Ronda', 'Carambolas', 'Entradas', 'Cierre', 'Duración', 'Descanso'].map((h) => E('th', { key: h }, h)))),
          E('tbody', null, (championship.phase_rules || []).map((rule) => E('tr', { key: rule.rule_id },
            E('td', null, rule.phase),
            E('td', null, rule.round || '-'),
            E('td', null, E(Input, { disabled: phaseRulesLocked, type: 'number', value: rule.target_points, onChange: (e) => patchRule(rule.rule_id, 'target_points', num(e.target.value)) })),
            E('td', null, E(Input, { disabled: phaseRulesLocked, type: 'number', value: rule.innings_limit, onChange: (e) => patchRule(rule.rule_id, 'innings_limit', num(e.target.value)) })),
            E('td', null, E(Select, { disabled: phaseRulesLocked, value: rule.closure_type, onChange: (e) => patchRule(rule.rule_id, 'closure_type', e.target.value) }, CLOSURE_TYPES.map((x) => E('option', { key: x }, x)))),
            E('td', null, E(Input, { disabled: phaseRulesLocked, type: 'number', value: rule.duration_minutes, onChange: (e) => patchRule(rule.rule_id, 'duration_minutes', num(e.target.value)) })),
            E('td', null, E(Input, { disabled: phaseRulesLocked, type: 'number', value: rule.rest_minutes, onChange: (e) => patchRule(rule.rule_id, 'rest_minutes', num(e.target.value)) }))
          )))
        )
      )
    ),
    E(Card, { className: 'setup-player-selection-card setup-normal-only' },
      participantsLocked ? E('div', { className: 'validation-card small' }, 'Jugadores bloqueados: solo se muestra la lista de participantes porque ya se clasificaron grupos o el campeonato está cerrado.') : null,
      E(SectionTitle, { title: 'Campeonato · Paso 2: Selección de jugadores participantes', subtitle: (isRanking) ? 'Los campeonatos Ranking no generan grupos; se alimentan con campeonatos Normal asociados.' : (isInternational ? 'Campeonato internacional: lista todos los jugadores activos de todos los países y divisiones.' : 'Campeonato por división: lista jugadores activos de la división objetivo.') }),
      E('div', { className: 'toolbar', style: { marginTop: 12 } },
        E(Button, { onClick: selectAllVisible, kind: 'success', disabled: participantsLocked }, 'Seleccionar filtrados'),
        E(Button, { onClick: removeVisible, kind: 'warning', disabled: participantsLocked }, 'Quitar filtrados'),
        E(Button, { onClick: selectAllBase, kind: 'soft', disabled: participantsLocked }, 'Seleccionar todos elegibles'),
        E(Button, { onClick: selectActive, kind: 'soft', disabled: participantsLocked }, 'Seleccionar activos'),
        E(Button, { onClick: clearParticipants, kind: 'warning', disabled: participantsLocked }, 'Limpiar selección'),
        E(Badge, { kind: 'info' }, `${enrolled.length} seleccionados`),
        E(Badge, { kind: 'neutral' }, `${eligibleDirectory.length} visibles`),
        E(Badge, null, isInternational ? 'Internacional / abierto' : `División ${championship.division_filter}`)
      ),
      E('div', { className: 'grid grid-4', style: { marginTop: 14 } },
        E(Field, { label: 'Buscar' }, E(Input, { value: participantFilter.text, onChange: (e) => setParticipantFilter({ ...participantFilter, text: e.target.value }), placeholder: 'Nombre, código, país o asociación' })),
        E(Field, { label: 'País' }, E(Select, { value: participantFilter.country, onChange: (e) => setParticipantFilter({ ...participantFilter, country: e.target.value }) }, [E('option', { key: 'ALL' }, 'ALL')].concat(countries.map((x) => E('option', { key: x }, x))))),
        E(Field, { label: 'División' }, E(Select, { value: participantFilter.division, onChange: (e) => setParticipantFilter({ ...participantFilter, division: e.target.value }) }, ['ALL', 'PRIMERA', 'SEGUNDA', 'TERCERA', 'SELECTIVO', 'INTERNACIONAL'].map((x) => E('option', { key: x }, x)))),
        E(Field, { label: 'Asociación' }, E(Select, { value: participantFilter.association, onChange: (e) => setParticipantFilter({ ...participantFilter, association: e.target.value }) }, [E('option', { key: 'ALL' }, 'ALL')].concat(ASSOCIATIONS.map((x) => E('option', { key: x }, x))))),
        E(Field, { label: 'Estado' }, E(Select, { value: participantFilter.status, onChange: (e) => setParticipantFilter({ ...participantFilter, status: e.target.value }) }, ['ALL', 'ACTIVO', 'INACTIVO'].map((x) => E('option', { key: x }, x)))),
        E(Field, { label: 'Cabeza de serie' }, E(Select, { value: participantFilter.seed, onChange: (e) => setParticipantFilter({ ...participantFilter, seed: e.target.value }) }, E('option', { value: 'ALL' }, 'ALL'), E('option', { value: 'YES' }, 'Sí'), E('option', { value: 'NO' }, 'No'))),
        E(Field, { label: 'Selección' }, E(Select, { value: participantFilter.selected, onChange: (e) => setParticipantFilter({ ...participantFilter, selected: e.target.value }) }, E('option', { value: 'ALL' }, 'ALL'), E('option', { value: 'YES' }, 'Seleccionados'), E('option', { value: 'NO' }, 'No seleccionados'))),
        E(Field, { label: 'Resumen' }, E('div', { className: 'selection-summary-box' }, `${enrolled.length} de ${baseDirectory.length} elegibles`))
      ),
      eligibleDirectory.length === 0 ? E(EmptyState, { title: 'Sin jugadores', message: 'Ajuste filtros o revise el directorio de jugadores.' }) : E('div', { className: 'table-wrap', style: { marginTop: 14, maxHeight: 420, overflowY: 'auto' } },
        E('table', null,
          E('thead', null, E('tr', null, ['Participa', 'Código', 'Jugador', 'Información', 'División', 'AVG', 'No CBZ', 'Estado'].map((h) => E('th', { key: h }, h)))),
          E('tbody', null, eligibleDirectory.map((p) => E('tr', { key: p.player_id },
            E('td', null, E('input', { type: 'checkbox', disabled: participantsLocked, checked: participantIds.includes(p.player_id), onChange: (e) => setParticipant(p.player_id, e.target.checked) })),
            E('td', null, p.player_code || p.player_id),
            E('td', null, E('b', null, playerName(p)), E('div', { className: 'small' }, playerMeta(p, isInternational))),
            E('td', null, isInternational ? `${p.country_iso || '-'} · ${p.association_code || '-'}` : p.association_code),
            E('td', null, p.division_level),
            E('td', null, fmtAvg(p.current_average)),
            E('td', null, E(Input, { type: 'number', min: 1, value: participantSeeds[p.player_id] || '', disabled: participantsLocked || !participantIds.includes(p.player_id), onChange: (e) => setParticipantSeed(p.player_id, e.target.value), placeholder: '-' })),
            E('td', null, p.status)
          )))
        )
      )
    ),
    E(Card, { className: 'setup-normal-only' },
      E(SectionTitle, { title: 'Campeonato · Paso 4: Mesas físicas', subtitle: 'Mesas disponibles para calendarización y operación.' }),
      E('div', { className: 'toolbar', style: { marginTop: 12 } }, E(Button, { onClick: addTable, kind: 'success', disabled: tablesLocked }, 'Agregar mesa')),
      E('div', { className: 'table-wrap', style: { marginTop: 14 } },
        E('table', null,
          E('thead', null, E('tr', null, ['Mesa', 'Nombre visible', 'Activa', 'Acciones'].map((h) => E('th', { key: h }, h)))),
          E('tbody', null, championship.tables.map((table) => E('tr', { key: table.table_id },
            E('td', null, table.table_number),
            E('td', null, E(Input, { disabled: tablesLocked, value: table.display_name, onChange: (e) => patchTable(table.table_id, 'display_name', e.target.value) })),
            E('td', null, E(Select, { disabled: tablesLocked, value: table.is_active ? 'SI' : 'NO', onChange: (e) => patchTable(table.table_id, 'is_active', e.target.value === 'SI') }, ['SI', 'NO'].map((x) => E('option', { key: x }, x)))),
            E('td', null, E(Button, { onClick: () => removeTable(table.table_id), kind: 'danger', disabled: tablesLocked }, 'Eliminar'))
          )))
        )
      )
    )
  );
}
