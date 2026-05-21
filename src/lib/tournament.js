export function uid(prefix = 'ID') {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

export function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function usesAverageControl(championship = {}) {
  return !(championship?.average_control_enabled === false || championship?.average_control_enabled === 'NO');
}

export function fmtAvg(value) {
  return value === null || value === undefined || Number.isNaN(value) ? 'N/A' : Number(value).toFixed(3);
}

export function playerName(player) {
  return player ? `${player.first_name} ${player.last_name}`.trim() : 'N/D';
}

export function appLocale() {
  const language = String(globalThis.__CAROMCHAMPS_LANGUAGE__ || 'es').toLowerCase();
  if (language === 'en') return 'en-US';
  if (language === 'ko') return 'ko-KR';
  return 'es-CR';
}

export function formatDateEs(value, options = {}) {
  if (!value) return '-';
  const raw = String(value);
  const date = raw.includes('T') ? new Date(raw) : new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return raw;
  const defaultOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return new Intl.DateTimeFormat(appLocale(), { ...defaultOptions, ...options }).format(date).replace('.', '');
}

export function formatDateTimeEs(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '-');
  const locale = appLocale();
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: locale !== 'ko-KR'
  }).format(date).replace('.', '');
}

export function isInternationalChampionship(championship) {
  return championship.division_filter === 'INTERNACIONAL' || championship.championship_scope === 'INTERNACIONAL';
}

export function isSelectiveChampionship(championship) {
  return championship.division_filter === 'SELECTIVO' || championship.championship_scope === 'SELECTIVO';
}

export function getEligiblePlayers(championship, players) {
  const participantSeeds = championship.participant_seeds || {};
  const normalizeForChampionship = (player) => {
    const rawSeed = participantSeeds[player.player_id];
    const seedNumber = rawSeed === '' || rawSeed === undefined || rawSeed === null ? null : num(rawSeed, null);
    const isForeign = player.country_iso && player.country_iso !== 'CR';
    return {
      ...player,
      association_code: isForeign ? 'INTERNACIONAL' : player.association_code,
      division_level: isForeign ? 'NA' : player.division_level,
      previous_division_level: isForeign ? 'NA' : player.previous_division_level,
      seed_number: seedNumber,
      is_seed: Boolean(seedNumber)
    };
  };
  const active = players.filter((p) => p.status === 'ACTIVO').map(normalizeForChampionship);
  const selected = Array.isArray(championship.participant_ids) && championship.participant_ids.length
    ? active.filter((p) => championship.participant_ids.includes(p.player_id))
    : active;
  if (isInternationalChampionship(championship)) return selected;
  if (isSelectiveChampionship(championship)) return selected.filter((p) => p.division_level === 'PRIMERA');
  return selected.filter((p) => p.division_level === championship.division_filter);
}


export function rng(seed) {
  let x = String(seed || 'FECOBI').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 123456);
  return () => {
    x = (1103515245 * x + 12345) % 2147483648;
    return x / 2147483648;
  };
}

export function shuffle(items, seed) {
  const random = rng(seed);
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function calculateTotalQualifiers(championship, totalGroups) {
  return totalGroups * num(championship.qualifiers_per_group) + num(championship.extra_qualifiers_count);
}

export function parseTableGroupBlock(value, activeTableCount = 1) {
  const raw = String(value ?? '0').trim().toUpperCase().replace(/\s+/g, '');
  const errors = [];
  if (raw === '') errors.push('Debe indicar un valor para bloques de partidas por grupo.');
  if (raw === '0') return { raw: '0', blockSize: 0, tableDistribution: 1, fixedGroupTable: true, normalized: '0', errors };
  const simple = raw.match(/^(\d+)$/);
  const distributed = raw.match(/^(\d+)D(\d+)$/);
  if (!simple && !distributed) {
    if (raw.startsWith('D')) errors.push('Formato inválido. Debe indicar primero el tamaño del bloque, por ejemplo 2D2.');
    else errors.push('Formato inválido. Use 0, 1-6 o una distribución como 2D2.');
    return { raw, blockSize: 0, tableDistribution: 1, fixedGroupTable: false, normalized: raw, errors };
  }
  const blockSize = simple ? num(simple[1]) : num(distributed[1]);
  const tableDistribution = simple ? 1 : num(distributed[2]);
  if (blockSize < 0 || blockSize > 6) errors.push('El bloque debe estar entre 0 y 6.');
  if (distributed && blockSize === 0) errors.push('Formato inválido. El valor 0 significa grupo completo en una mesa y no permite distribución.');
  if (tableDistribution < 1) errors.push('La distribución debe ser mayor o igual a 1.');
  if (blockSize > 0 && blockSize < tableDistribution) errors.push('Formato inválido. El bloque de partidas debe ser mayor o igual que la cantidad de mesas de distribución.');
  if (tableDistribution > activeTableCount) errors.push('La distribución de mesas no puede superar la cantidad de mesas activas.');
  return { raw, blockSize, tableDistribution, fixedGroupTable: false, normalized: simple ? String(blockSize) : `${blockSize}D${tableDistribution}`, errors };
}

export function validateChampionship(championship, players) {
  const errors = [];
  const size = num(championship.preferred_group_size);
  const totalQualifiers = num(championship.total_qualifiers_f2);
  if (!championship.name?.trim()) errors.push('Nombre del campeonato obligatorio.');
  if (!championship.venue_name?.trim()) errors.push('Sede o recinto obligatorio.');
  if (![3, 4, 5, 6].includes(size)) errors.push('Tamaño de grupo inválido. Debe estar entre 3 y 6.');
  if (players.length < 2) errors.push('Debe seleccionar al menos 2 jugadores participantes.');
  if (num(championship.qualifiers_per_group) < 1) errors.push('Debe clasificar al menos un jugador por grupo.');
  if (num(championship.qualifiers_per_group) > size) errors.push('Clasificados por grupo no puede superar el tamaño de grupo.');
  if (num(championship.extra_qualifiers_count) > 0 && num(championship.extra_qualifier_position) <= 0) errors.push('Debe indicar la posición adicional a comparar.');
  if (totalQualifiers <= 0) errors.push('El total de clasificados a F2 debe ser mayor a cero. Si no coincide con número mágico, R0 reducirá el bracket.');
  if (totalQualifiers > players.length) errors.push('Clasificados supera jugadores seleccionados.');
  if (num(championship.target_points) <= 0) errors.push('Carambolas objetivo debe ser mayor a cero.');
  const activeTableCount = Array.isArray(championship.tables) ? championship.tables.filter((t) => t.is_active).length : 0;
  if (!Array.isArray(championship.tables) || !championship.tables.some((t) => t.is_active)) errors.push('Debe existir al menos una mesa activa.');
  const blockConfig = parseTableGroupBlock(championship.table_assign_block, Math.max(activeTableCount, 1));
  blockConfig.errors.forEach((error) => errors.push(error));
  if (!Array.isArray(championship.schedule_days) || !championship.schedule_days.some((d) => d.is_play_day !== false)) errors.push('Debe existir al menos un día de juego habilitado.');
  return errors;
}

export function getPhaseRule(championship, phase, round = '') {
  const rules = Array.isArray(championship.phase_rules) ? championship.phase_rules : [];
  const exact = rules.find((r) => r.phase === phase && String(r.round || '') === String(round || ''));
  const phaseDefault = rules.find((r) => r.phase === phase && !r.round);
  const rule = exact || phaseDefault || {};
  return {
    target_points: num(rule.target_points, num(championship.target_points, 40)),
    innings_limit: num(rule.innings_limit, num(championship.innings_limit, 0)),
    closure_type: rule.closure_type || championship.closure_type || 'CON_CIERRE',
    duration_minutes: num(rule.duration_minutes, num(championship.match_duration_minutes, 60)),
    rest_minutes: num(rule.rest_minutes, num(championship.minimum_rest_time_minutes, 0))
  };
}

export function generateGroups(championship, players) {
  const active = getEligiblePlayers(championship, players);
  const size = num(championship.preferred_group_size, 4);
  const groupCount = Math.max(1, Math.ceil(active.length / size));
  const base = Math.floor(active.length / groupCount);
  const remainder = active.length % groupCount;
  const groups = Array.from({ length: groupCount }, (_, i) => ({
    group_id: `G-${i + 1}`,
    group_number: i + 1,
    group_name: `Grupo ${i + 1}`,
    target_size: base + (i < remainder ? 1 : 0),
    players: [],
    warnings: [],
    mode: championship.group_generation_mode,
    status: 'OPEN'
  }));

  const countrySpread = championship.group_generation_mode === 'SEEDED_RANDOM_COUNTRY_SPREAD' || championship.country_spread_enabled;
  const score = (group, player) => {
    const fill = (group.players.length / Math.max(group.target_size, 1)) * 100;
    const sameCountry = group.players.some((p) => p.country_iso === player.country_iso) ? 8 : 0;
    const sameAssociation = group.players.some((p) => p.association_code === player.association_code) ? 5 : 0;
    return fill + (countrySpread ? sameCountry + sameAssociation : 0);
  };
  const bestGroup = (player) => groups
    .filter((g) => g.players.length < g.target_size)
    .sort((a, b) => score(a, player) - score(b, player) || a.group_number - b.group_number)[0] || groups[0];
  const assign = (group, player, method) => {
    const warning = countrySpread && group.players.some((p) => p.association_code === player.association_code)
      ? 'Repite asociación por balance de tamaño.'
      : '';
    if (warning) group.warnings.push(`${playerName(player)}: ${warning}`);
    group.players.push({ ...player, assigned_group: group.group_name, assignment_method: method, assignment_warning: warning });
  };

  if (championship.group_generation_mode === 'FULL_RANDOM') {
    shuffle(active, championship.random_seed).forEach((player) => assign(bestGroup(player), player, 'FULL_RANDOM'));
    return groups;
  }

  if (championship.group_generation_mode === 'SNAKE_DRAFT') {
    const ordered = [...active].sort((a, b) => Number(b.is_seed) - Number(a.is_seed) || (a.seed_number || 9999) - (b.seed_number || 9999) || b.current_average - a.current_average || a.last_name.localeCompare(b.last_name));
    ordered.forEach((player, index) => {
      const cycle = Math.floor(index / groupCount);
      const pos = index % groupCount;
      const groupIndex = cycle % 2 === 0 ? pos : groupCount - 1 - pos;
      assign(groups[groupIndex], player, 'SNAKE_DRAFT');
    });
    return groups;
  }

  const seeds = active.filter((p) => p.is_seed && p.seed_number).sort((a, b) => a.seed_number - b.seed_number);
  const rest = active.filter((p) => !(p.is_seed && p.seed_number));
  seeds.filter((p) => p.seed_number <= groupCount).forEach((player) => assign(groups[player.seed_number - 1], player, 'FIXED_SEED'));
  shuffle(seeds.filter((p) => p.seed_number > groupCount), `${championship.random_seed}-overflow`).forEach((player) => assign(bestGroup(player), player, 'SEED_OVERFLOW'));
  shuffle(rest, `${championship.random_seed}-rest`).forEach((player) => assign(bestGroup(player), player, 'RANDOM_REST'));
  return groups;
}

export function makeMatch(championship, player1, player2, extra = {}) {
  const rule = getPhaseRule(championship, extra.phase || 'GROUPS', extra.ko_round || '');
  return {
    match_id: uid(extra.phase === 'KO' ? 'M-KO' : extra.phase === 'PRE_ELIMINATION' ? 'M-PE' : 'M-G'),
    match_number: extra.match_number || null,
    phase: extra.phase || 'GROUPS',
    group_id: extra.group_id || '',
    group_name: extra.group_name || '',
    group_number: extra.group_number || null,
    group_round: extra.group_round || null,
    group_match_order: extra.group_match_order || null,
    ko_round: extra.ko_round || '',
    bracket_order: extra.bracket_order || null,
    seed1_position: extra.seed1_position || null,
    seed2_position: extra.seed2_position || null,
    winner_takes_seed_position: extra.winner_takes_seed_position || null,
    source_match1_id: extra.source_match1_id || '',
    source_match2_id: extra.source_match2_id || '',
    player1_id: player1.player_id,
    player2_id: player2.player_id,
    caroms_p1: '',
    caroms_p2: '',
    innings_p1: '',
    innings_p2: '',
    s1_p1: '',
    s2_p1: '',
    s1_p2: '',
    s2_p2: '',
    penalties_p1: '',
    penalties_p2: '',
    penalty_winner_id: '',
    winner_id: '',
    match_status: 'CREATED',
    assigned_table: '',
    scheduled_date: '',
    scheduled_time: '',
    schedule_conflict: false,
    conflict_reason: '',
    applied_closure_type: rule.closure_type,
    applied_target_points: rule.target_points,
    applied_innings_limit: rule.innings_limit,
    estimated_duration_minutes: rule.duration_minutes,
    minimum_rest_time_minutes: rule.rest_minutes
  };
}

export function assignMatchNumbers(matches, startNumber = 1) {
  return matches.map((match, index) => ({ ...match, match_number: match.match_number || startNumber + index }));
}

export function roundRobinPattern(size) {
  const patterns = {
    3: [
      [[1, 3]],
      [[2, 3]],
      [[1, 2]]
    ],
    4: [
      [[1, 4], [2, 3]],
      [[1, 3], [2, 4]],
      [[1, 2], [3, 4]]
    ],
    5: [
      [[1, 5], [2, 4]],
      [[1, 4], [5, 3]],
      [[1, 3], [4, 2]],
      [[1, 2], [3, 5]],
      [[2, 5], [3, 4]]
    ],
    6: [
      [[1, 6], [2, 5], [3, 4]],
      [[1, 5], [6, 4], [2, 3]],
      [[1, 4], [5, 3], [6, 2]],
      [[1, 3], [4, 2], [5, 6]],
      [[1, 2], [3, 6], [4, 5]]
    ]
  };
  return patterns[size] || [];
}

export function generateRoundRobinMatches(championship, groups, startNumber = 1) {
  const matches = [];
  groups.forEach((group) => {
    const players = [...group.players];
    const pattern = roundRobinPattern(players.length);
    if (pattern.length) {
      pattern.forEach((roundPairs, roundIndex) => {
        roundPairs.forEach(([a, b], matchIndex) => {
          const playerA = players[a - 1];
          const playerB = players[b - 1];
          if (!playerA || !playerB) return;
          matches.push(makeMatch(championship, playerA, playerB, {
            group_id: group.group_id,
            group_name: group.group_name,
            group_number: group.group_number,
            group_round: roundIndex + 1,
            group_match_order: matchIndex + 1
          }));
        });
      });
      return;
    }
    for (let i = 0; i < players.length; i += 1) {
      for (let j = i + 1; j < players.length; j += 1) {
        matches.push(makeMatch(championship, players[i], players[j], {
          group_id: group.group_id,
          group_name: group.group_name,
          group_number: group.group_number,
          group_round: i + 1,
          group_match_order: j + 1
        }));
      }
    }
  });
  return assignMatchNumbers(matches, startNumber);
}

export function validateMatch(match, championship = {}) {
  const errors = [];
  const avgEnabled = usesAverageControl(championship);
  if (avgEnabled && (num(match.innings_p1) <= 0 || num(match.innings_p2) <= 0)) errors.push('Entradas deben ser mayores a cero.');
  if (num(match.s2_p1) > num(match.s1_p1)) errors.push('S2 J1 no puede superar S1 J1.');
  if (num(match.s2_p2) > num(match.s1_p2)) errors.push('S2 J2 no puede superar S1 J2.');
  if (num(match.s1_p1) > num(match.caroms_p1)) errors.push('S1 J1 no puede superar carambolas J1.');
  if (num(match.s1_p2) > num(match.caroms_p2)) errors.push('S1 J2 no puede superar carambolas J2.');
  if (avgEnabled && match.applied_closure_type === 'CON_CIERRE' && num(match.innings_p1) !== num(match.innings_p2)) errors.push('Con Cierre requiere entradas iguales.');
  if (avgEnabled && match.applied_closure_type === 'SIN_CIERRE' && Math.abs(num(match.innings_p1) - num(match.innings_p2)) > 1) errors.push('Sin Cierre permite diferencia máxima de una entrada.');
  if (num(match.caroms_p1) === num(match.caroms_p2) && !['GROUPS', 'GROUPS_F2'].includes(match.phase) && num(match.penalties_p1) === num(match.penalties_p2)) {
    errors.push('Empate eliminatorio requiere penales diferentes.');
  }
  if (['GROUPS', 'GROUPS_F2'].includes(match.phase) && (num(match.penalties_p1) > 0 || num(match.penalties_p2) > 0)) errors.push('No se permiten penales en grupos.');
  return errors;
}

export function completeMatch(match) {
  const c1 = num(match.caroms_p1);
  const c2 = num(match.caroms_p2);
  let winner = '';
  if (c1 > c2) winner = match.player1_id;
  else if (c2 > c1) winner = match.player2_id;
  else if (!['GROUPS', 'GROUPS_F2'].includes(match.phase)) winner = num(match.penalties_p1) > num(match.penalties_p2) ? match.player1_id : match.player2_id;
  return { ...match, winner_id: winner, match_status: 'COMPLETED' };
}

export function autoFillMatches(matches, seed = 'demo') {
  const random = rng(seed + matches.length);
  return matches.map((match) => {
    if (match.match_status === 'COMPLETED') return match;
    let c1 = Math.max(1, Math.floor(10 + random() * 31));
    let c2 = Math.max(1, Math.floor(10 + random() * 31));
    if (!['GROUPS', 'GROUPS_F2'].includes(match.phase) && c1 === c2) c2 = Math.max(1, c2 - 1);
    const innings = Math.max(1, Math.floor(18 + random() * 22));
    const s1a = Math.min(c1, Math.max(1, Math.floor(3 + random() * 10)));
    const s1b = Math.min(c2, Math.max(1, Math.floor(3 + random() * 10)));
    const s2a = Math.min(s1a, Math.max(0, Math.floor(random() * s1a)));
    const s2b = Math.min(s1b, Math.max(0, Math.floor(random() * s1b)));
    const penalties = c1 === c2 && !['GROUPS', 'GROUPS_F2'].includes(match.phase) ? { penalties_p1: '2', penalties_p2: '1' } : {};
    return completeMatch({
      ...match,
      caroms_p1: String(c1),
      caroms_p2: String(c2),
      innings_p1: String(innings),
      innings_p2: String(innings),
      s1_p1: String(s1a),
      s2_p1: String(s2a),
      s1_p2: String(s1b),
      s2_p2: String(s2b),
      ...penalties
    });
  });
}

export function clearResults(matches) {
  return matches.map((m) => ({
    ...m,
    caroms_p1: '', caroms_p2: '', innings_p1: '', innings_p2: '', s1_p1: '', s2_p1: '', s1_p2: '', s2_p2: '',
    penalties_p1: '', penalties_p2: '', winner_id: '', match_status: 'CREATED'
  }));
}

export function buildStats(matches, players, championship = {}) {
  const avgEnabled = usesAverageControl(championship);
  const map = new Map(players.map((p) => [p.player_id, {
    player: p, played: 0, wins: 0, draws: 0, losses: 0, points: 0, caroms: 0, innings: 0, s1: 0, s2: 0, avg: null
  }]));
  matches.filter((m) => m.match_status === 'COMPLETED').forEach((m) => {
    [
      [m.player1_id, num(m.caroms_p1), num(m.innings_p1), num(m.s1_p1), num(m.s2_p1)],
      [m.player2_id, num(m.caroms_p2), num(m.innings_p2), num(m.s1_p2), num(m.s2_p2)]
    ].forEach(([id, caroms, innings, serie1, serie2]) => {
      const row = map.get(id);
      if (!row) return;
      row.played += 1;
      row.caroms += caroms;
      row.innings += innings;
      row.s1 = Math.max(row.s1, serie1);
      row.s2 = Math.max(row.s2, serie2);
      if (m.winner_id === id) { row.wins += 1; row.points += 2; }
      else if (!m.winner_id) { row.draws += 1; row.points += 1; }
      else row.losses += 1;
      row.avg = avgEnabled && row.innings ? row.caroms / row.innings : null;
    });
  });
  const rows = [...map.values()];
  return rows.sort((a, b) => avgEnabled
    ? b.points - a.points || (b.avg || 0) - (a.avg || 0) || b.s1 - a.s1 || b.s2 - a.s2
    : b.points - a.points || b.wins - a.wins || a.losses - b.losses || b.caroms - a.caroms);
}

export function groupStandings(groups, matches, championship = {}) {
  return groups.map((group) => {
    const rows = buildStats(matches.filter((m) => m.group_id === group.group_id), group.players, championship).map((row, index) => ({ ...row, group_position: index + 1 }));
    return { ...group, standings: rows };
  });
}

export function qualify(groups, championship) {
  const direct = [];
  const avgEnabled = usesAverageControl(championship);
  const qualifierSort = (a, b) => avgEnabled
    ? b.points - a.points || (b.avg || 0) - (a.avg || 0) || b.s1 - a.s1 || b.s2 - a.s2
    : b.points - a.points || b.wins - a.wins || a.losses - b.losses || b.caroms - a.caroms;
  const extras = [];
  groups.forEach((group) => group.standings.forEach((row) => {
    if (row.group_position <= num(championship.qualifiers_per_group)) direct.push({ ...row, source: group.group_name, type: 'DIRECT' });
    else if (row.group_position === num(championship.extra_qualifier_position)) extras.push({ ...row, source: group.group_name, type: 'EXTRA' });
  }));
  const chosenExtras = extras.sort(qualifierSort).slice(0, num(championship.extra_qualifiers_count));
  return [...direct, ...chosenExtras].sort((a, b) => a.group_position - b.group_position || qualifierSort(a, b)).map((row, index) => ({
    seed_position: index + 1,
    player: row.player,
    source: row.source,
    type: row.type,
    bracket_seed_id: uid('S')
  }));
}

export const MAGIC_BRACKET_SIZES = [128, 64, 32, 16, 8, 4];
export const ROUND_SEQUENCE = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F'];

export function isMagicQualifierCount(total) {
  return MAGIC_BRACKET_SIZES.includes(num(total));
}

export function nearestLowerMagic(total) {
  return MAGIC_BRACKET_SIZES.find((size) => size < num(total)) || null;
}

export function roundForSize(size) {
  const value = num(size);
  if (value === 16) return 'R16';
  if (value === 8) return 'QF';
  if (value === 4) return 'SF';
  if (value === 2) return 'F';
  return `R${value}`;
}

export function roundDisplayName(round) {
  const labels = {
    R0: 'Preclasificación / Ronda 0',
    R128: 'Ronda de 128',
    R64: 'Ronda de 64',
    R32: 'Ronda de 32',
    R16: 'Octavos de final',
    QF: 'Cuartos de final',
    SF: 'Semifinales',
    F: 'Final'
  };
  return labels[round] || round || '-';
}

export function nextRoundLabel(round) {
  const index = ROUND_SEQUENCE.indexOf(round);
  if (index < 0 || index === ROUND_SEQUENCE.length - 1) return null;
  return ROUND_SEQUENCE[index + 1];
}

export function seedPairOrder(size) {
  const n = num(size);
  if (n < 2 || n % 2 !== 0) return [];
  let order = [1, 2];
  while (order.length < n) {
    const nextSize = order.length * 2;
    order = order.flatMap((seed) => [seed, nextSize + 1 - seed]);
  }
  const pairs = [];
  for (let i = 0; i < order.length; i += 2) pairs.push([order[i], order[i + 1]]);
  return pairs;
}

function normalizeSeeds(seeds) {
  return [...seeds].sort((a, b) => num(a.seed_position) - num(b.seed_position));
}

function buildSeedMatch(championship, round, seedA, seedB, index, startNumber, extra = {}) {
  return makeMatch(championship, seedA.player || seedA, seedB.player || seedB, {
    phase: extra.phase || 'KO',
    ko_round: round,
    bracket_order: index + 1,
    match_number: startNumber + index,
    seed1_position: seedA.seed_position || null,
    seed2_position: seedB.seed_position || null,
    winner_takes_seed_position: extra.winner_takes_seed_position || null,
    source_match1_id: extra.source_match1_id || '',
    source_match2_id: extra.source_match2_id || ''
  });
}

function buildDirectRound(championship, orderedSeeds, round, startNumber = 1) {
  const bySeed = new Map(orderedSeeds.map((seed) => [num(seed.seed_position), seed]));
  const pairs = seedPairOrder(orderedSeeds.length);
  return pairs.map(([a, b], index) => {
    const seedA = bySeed.get(a);
    const seedB = bySeed.get(b);
    if (!seedA || !seedB) return null;
    return buildSeedMatch(championship, round, seedA, seedB, index, startNumber);
  }).filter(Boolean);
}


export function generateBracketStructure(championship, seeds, startNumber = 1) {
  const ordered = normalizeSeeds(seeds);
  const q = ordered.length;
  if (q < 4) {
    return { type: 'ERROR', message: 'La cantidad de clasificados debe ser al menos 4. Si no coincide con número mágico, se generará R0.', q, base: null, exempt: 0, preMatches: [], koMatches: [] };
  }
  if (isMagicQualifierCount(q)) {
    const round = roundForSize(q);
    const koMatches = buildDirectRound(championship, ordered, round, startNumber);
    return { type: 'DIRECT', message: `Bracket directo ${roundDisplayName(round)}.`, q, base: q, exempt: q, initial_round: round, preMatches: [], koMatches };
  }
  const base = nearestLowerMagic(q);
  if (!base) return { type: 'ERROR', message: 'No existe número mágico inferior para generar preclasificación.', q, base: null, exempt: 0, preMatches: [], koMatches: [] };
  const extraPlayers = q - base;
  const exempt = base - extraPlayers;
  const preMatches = [];
  for (let index = 0; index < extraPlayers; index += 1) {
    const highSeedPosition = exempt + 1 + index;
    const lowSeedPosition = q - index;
    const highSeed = ordered.find((s) => num(s.seed_position) === highSeedPosition);
    const lowSeed = ordered.find((s) => num(s.seed_position) === lowSeedPosition);
    if (highSeed && lowSeed) {
      preMatches.push(buildSeedMatch(championship, 'R0', highSeed, lowSeed, index, startNumber, {
        phase: 'PRE_ELIMINATION',
        winner_takes_seed_position: highSeedPosition
      }));
    }
  }
  return { type: 'PRE_ELIMINATION', message: `Requiere ${preMatches.length} partidas de preclasificación para reducir de ${q} a ${base}.`, q, base, exempt, initial_round: roundForSize(base), preMatches, koMatches: [] };
}

export function generateMainBracketAfterPre(championship, seeds, preMatches, startNumber = 1) {
  const ordered = normalizeSeeds(seeds);
  const q = ordered.length;
  const base = nearestLowerMagic(q);
  if (!base) return { error: 'No aplica preclasificación para esta cantidad de clasificados.', matches: [] };
  if (preMatches.some((m) => m.match_status !== 'COMPLETED' || !m.winner_id)) return { error: 'Debe completar todas las partidas de preclasificación antes de generar el bracket principal.', matches: [] };
  const extraPlayers = q - base;
  const exempt = base - extraPlayers;
  const byPosition = new Map();
  ordered.filter((s) => num(s.seed_position) <= exempt).forEach((s) => byPosition.set(num(s.seed_position), s));
  preMatches.forEach((match) => {
    const sourceSeed = ordered.find((s) => s.player?.player_id === match.winner_id || s.player_id === match.winner_id);
    if (sourceSeed) byPosition.set(num(match.winner_takes_seed_position), { ...sourceSeed, seed_position: num(match.winner_takes_seed_position), type: 'PRE_WINNER' });
  });
  const mainSeeds = Array.from({ length: base }, (_, index) => byPosition.get(index + 1)).filter(Boolean);
  if (mainSeeds.length !== base) return { error: 'No fue posible completar todas las posiciones del bracket principal.', matches: [] };
  return { error: '', matches: buildDirectRound(championship, mainSeeds, roundForSize(base), startNumber) };
}

export function latestActiveKoRound(matches) {
  const rounds = [...new Set(matches.filter((m) => m.phase === 'KO' && m.match_status !== 'PLANNED').map((m) => m.ko_round))];
  return ROUND_SEQUENCE.filter((r) => rounds.includes(r)).pop() || '';
}


export function mergeWithProjectedSchedule(generatedMatches, existingMatches) {
  return (generatedMatches || []).map((match) => {
    const planned = (existingMatches || []).find((candidate) =>
      candidate.match_status === 'PLANNED' &&
      candidate.phase === match.phase &&
      (candidate.ko_round || '') === (match.ko_round || '') &&
      num(candidate.bracket_order, 0) === num(match.bracket_order, 0)
    );
    if (!planned) return match;
    return {
      ...match,
      match_id: planned.match_id,
      match_number: planned.match_number || match.match_number,
      scheduled_date: planned.scheduled_date || match.scheduled_date || '',
      scheduled_time: planned.scheduled_time || match.scheduled_time || '',
      assigned_table: planned.assigned_table || match.assigned_table || '',
      schedule_conflict: planned.schedule_conflict || false,
      conflict_reason: planned.conflict_reason || '',
      is_planned_placeholder: false
    };
  });
}

export function generateInitialRoundFromSeeds(championship, seeds, existingMatches = [], startNumber = 1) {
  const ordered = normalizeSeeds(seeds || []);
  if (!ordered.length) return { error: 'Debe clasificar jugadores antes de generar la siguiente ronda.', matches: [] };
  const activeElimination = (existingMatches || []).some((m) => ['PRE_ELIMINATION', 'KO'].includes(m.phase) && m.match_status !== 'PLANNED');
  if (activeElimination) return { error: 'Ya existe una ronda eliminatoria activa. Complete esa ronda y luego genere la siguiente.', matches: [] };
  const structure = generateBracketStructure(championship, ordered, startNumber);
  if (structure.type === 'ERROR') return { error: structure.message, matches: [] };
  const initialMatches = structure.preMatches.length ? structure.preMatches : structure.koMatches;
  const merged = mergeWithProjectedSchedule(initialMatches, existingMatches);
  return { error: '', matches: merged, round: initialMatches[0]?.ko_round || 'R0', message: structure.message };
}

export function generateNextRound(championship, matches, startNumber = 1) {
  const currentRound = latestActiveKoRound(matches);
  if (!currentRound) return { error: 'No existe una ronda KO activa.', matches: [] };
  if (currentRound === 'F') return { error: 'La final es la última ronda.', matches: [] };
  const nextRound = nextRoundLabel(currentRound);
  const existingNext = matches.filter((m) => m.phase === 'KO' && m.ko_round === nextRound);
  if (existingNext.length && !existingNext.every((m) => m.match_status === 'PLANNED')) return { error: `La ronda ${roundDisplayName(nextRound)} ya existe.`, matches: [] };
  const current = matches.filter((m) => m.phase === 'KO' && m.ko_round === currentRound).sort((a, b) => num(a.bracket_order) - num(b.bracket_order));
  if (current.some((m) => m.match_status !== 'COMPLETED' || !m.winner_id)) return { error: `Debe completar ${roundDisplayName(currentRound)} antes de generar la siguiente ronda.`, matches: [] };
  const nextMatches = [];
  for (let index = 0; index < current.length; index += 2) {
    const matchA = current[index];
    const matchB = current[index + 1];
    if (!matchA || !matchB) continue;
    nextMatches.push(makeMatch(championship, { player_id: matchA.winner_id }, { player_id: matchB.winner_id }, {
      phase: 'KO',
      ko_round: nextRound,
      bracket_order: Math.floor(index / 2) + 1,
      match_number: startNumber + nextMatches.length,
      source_match1_id: matchA.match_id,
      source_match2_id: matchB.match_id
    }));
  }
  return { error: '', matches: mergeWithProjectedSchedule(nextMatches, matches), replace_round: existingNext.length ? nextRound : '' };
}

export function generateBracket(championship, seeds, startNumber = 1) {
  const structure = generateBracketStructure(championship, seeds, startNumber);
  if (structure.type === 'ERROR') return [];
  return [...structure.preMatches, ...structure.koMatches];
}

function placeholderPlayerFromMatch(match) {
  return { player_id: `WINNER:${match.match_id}`, first_name: 'Ganador', last_name: matchCode(match), country_iso: 'OTHER' };
}

export function generateFullBracketSkeleton(championship, seeds, startNumber = 1) {
  const orderedSeeds = normalizeSeeds(seeds || []);
  const structure = generateBracketStructure(championship, orderedSeeds, startNumber);
  if (structure.type === 'ERROR') return { error: structure.message, matches: [] };

  const output = structure.preMatches.map((match) => ({ ...match, match_status: 'PLANNED', is_planned_placeholder: true }));
  let nextNumber = startNumber + output.length;

  let current = structure.koMatches.map((match) => ({ ...match, match_status: 'PLANNED', is_planned_placeholder: true }));

  // Cuando hay preclasificación, proyectar también el bracket principal completo.
  // Las posiciones que dependen de R0 quedan como Ganador P-XXX hasta que se regenere la ronda real.
  if (!current.length && structure.preMatches.length && structure.base) {
    const byPosition = new Map();
    for (let pos = 1; pos <= structure.base; pos += 1) {
      if (pos <= structure.exempt) {
        const seed = orderedSeeds.find((s) => num(s.seed_position) === pos);
        if (seed) byPosition.set(pos, seed);
      } else {
        const pre = structure.preMatches.find((m) => num(m.winner_takes_seed_position) === pos);
        if (pre) byPosition.set(pos, { seed_position: pos, player: placeholderPlayerFromMatch(pre), type: 'PLANNED_R0_WINNER' });
      }
    }
    const mainSeeds = Array.from({ length: structure.base }, (_, index) => byPosition.get(index + 1)).filter(Boolean);
    current = buildDirectRound(championship, mainSeeds, structure.initial_round, nextNumber).map((match) => ({ ...match, match_status: 'PLANNED', is_planned_placeholder: true }));
  }

  output.push(...current);
  nextNumber = startNumber + output.length;
  let currentRound = structure.initial_round;

  while (currentRound && currentRound !== 'F') {
    const nextRound = nextRoundLabel(currentRound);
    if (!nextRound) break;
    const nextMatches = [];
    for (let index = 0; index < current.length; index += 2) {
      const sourceA = current[index];
      const sourceB = current[index + 1];
      if (!sourceA || !sourceB) continue;
      const match = makeMatch(championship, placeholderPlayerFromMatch(sourceA), placeholderPlayerFromMatch(sourceB), {
        phase: 'KO',
        ko_round: nextRound,
        bracket_order: Math.floor(index / 2) + 1,
        match_number: nextNumber + nextMatches.length,
        source_match1_id: sourceA.match_id,
        source_match2_id: sourceB.match_id
      });
      nextMatches.push({ ...match, match_status: 'PLANNED', is_planned_placeholder: true });
    }
    output.push(...nextMatches);
    current = nextMatches;
    currentRound = nextRound;
    nextNumber += nextMatches.length;
  }
  return { error: '', matches: output };
}

export function resolveMatchPlayer(match, side, matches, playersById) {
  const directId = side === 1 ? match.player1_id : match.player2_id;
  if (playersById?.[directId]) return { player: playersById[directId], label: playerName(playersById[directId]), resolved: true };
  const sourceId = side === 1 ? match.source_match1_id : match.source_match2_id;
  const source = (matches || []).find((m) => m.match_id === sourceId);
  if (source?.winner_id && playersById?.[source.winner_id]) return { player: playersById[source.winner_id], label: playerName(playersById[source.winner_id]), resolved: true };
  if (source) return { player: null, label: `Ganador ${matchCode(source)}`, resolved: false };
  if (String(directId || '').startsWith('TBD:')) return { player: null, label: `Clasificado #${String(directId).replace('TBD:', '')}`, resolved: false };
  if (String(directId || '').startsWith('WINNER:')) {
    const sourceMatchId = String(directId).replace('WINNER:', '');
    const sourceMatch = (matches || []).find((m) => m.match_id === sourceMatchId);
    return { player: null, label: sourceMatch ? `Ganador ${matchCode(sourceMatch)}` : 'Ganador pendiente', resolved: false };
  }
  return { player: null, label: 'Por definir', resolved: false };
}

function replaceMatchesById(allMatches, replacements) {
  const map = new Map(replacements.map((m) => [m.match_id, m]));
  return allMatches.map((m) => map.get(m.match_id) || m);
}

export function generateFullKnockoutDemo(championship, seeds, startNumber = 1, seed = 'full-ko-demo') {
  let all = [];
  let nextNumber = startNumber;
  const structure = generateBracketStructure(championship, seeds, nextNumber);
  if (structure.type === 'ERROR') return [];
  if (structure.preMatches.length) {
    const completedPre = autoFillMatches(structure.preMatches, `${seed}-pre`);
    all = [...all, ...completedPre];
    nextNumber += completedPre.length;
    const main = generateMainBracketAfterPre(championship, seeds, completedPre, nextNumber);
    if (!main.error) {
      all = [...all, ...main.matches];
      nextNumber += main.matches.length;
    }
  } else {
    all = [...all, ...structure.koMatches];
    nextNumber += structure.koMatches.length;
  }
  while (true) {
    const round = latestActiveKoRound(all);
    if (!round) break;
    const current = all.filter((m) => m.phase === 'KO' && m.ko_round === round);
    const completed = autoFillMatches(current, `${seed}-${round}`);
    all = replaceMatchesById(all, completed);
    if (round === 'F') break;
    const next = generateNextRound(championship, all, nextNumber);
    if (next.error || !next.matches.length) break;
    all = [...all, ...next.matches];
    nextNumber += next.matches.length;
  }
  return all;
}

function performanceSort(a, b, policy = 'POINTS_THEN_AVG') {
  if (policy === 'NO_AVG') return b.points - a.points || b.wins - a.wins || a.losses - b.losses || b.caroms - a.caroms;
  if (policy === 'AVG_THEN_POINTS') return (b.avg || 0) - (a.avg || 0) || b.points - a.points || b.s1 - a.s1 || b.s2 - a.s2;
  return b.points - a.points || (b.avg || 0) - (a.avg || 0) || b.s1 - a.s1 || b.s2 - a.s2;
}

export function buildFinalRankings(players, matches, seeds = [], championship = {}) {
  const stats = buildStats(matches, players, championship);
  const map = new Map(stats.map((row) => [row.player.player_id, { ...row, final_phase: 'Grupos', final_status: 'No clasificado', tier: 900 }]));
  seeds.forEach((seed) => {
    const id = seed.player?.player_id || seed.player_id;
    const row = map.get(id);
    if (row) {
      row.final_phase = 'Clasificado a F2';
      row.final_status = ['DIRECT', 'EXTRA', 'DIRECT_GROUP', 'EXTRA_POSITION'].includes(seed.type || seed.qualification_type) ? 'Clasificado' : 'Clasificado';
      row.tier = 500;
      row.seed_position = seed.seed_position;
    }
  });
  const completedElimination = matches.filter((m) => ['PRE_ELIMINATION', 'KO'].includes(m.phase) && m.match_status === 'COMPLETED');
  completedElimination.forEach((match) => {
    const loserId = match.winner_id === match.player1_id ? match.player2_id : match.player1_id;
    const loser = map.get(loserId);
    if (loser) {
      loser.final_phase = match.phase === 'PRE_ELIMINATION' ? 'Preclasificación' : roundDisplayName(match.ko_round);
      loser.final_status = 'Eliminado';
      const tierByRound = { R0: 450, R128: 360, R64: 320, R32: 280, R16: 240, QF: 180, SF: 90, F: 2 };
      loser.tier = tierByRound[match.phase === 'PRE_ELIMINATION' ? 'R0' : match.ko_round] || 500;
    }
    if (match.ko_round === 'F' && match.winner_id) {
      const champion = map.get(match.winner_id);
      if (champion) {
        champion.final_phase = 'Final';
        champion.final_status = 'Campeón';
        champion.tier = 1;
      }
      if (loser) {
        loser.final_phase = 'Final';
        loser.final_status = 'Subcampeón';
        loser.tier = 2;
      }
    }
  });
  const statusPriority = (row) => {
    if (row.final_status === 'Campeón') return 0;
    if (row.final_status === 'Subcampeón') return 1;
    if (row.final_status === 'Clasificado' || row.final_status === 'DIRECT' || row.final_status === 'EXTRA') return 2;
    if (row.final_status === 'Eliminado') return 3;
    return 4;
  };
  return [...map.values()]
    .sort((a, b) => statusPriority(a) - statusPriority(b) || performanceSort(a, b, usesAverageControl(championship) ? championship.third_place_policy : 'NO_AVG'))
    .map((row, index) => ({ ...row, final_position: index + 1 }));
}

function toMinutes(time) {
  const [h, m] = String(time || '00:00').split(':').map(Number);
  return h * 60 + m;
}

function timeFromMinutes(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function inBlackout(championship, day, start, end) {
  return (championship.blackouts || []).some((b) => b.schedule_day_id === day.schedule_day_id && Math.max(start, toMinutes(b.start_time)) < Math.min(end, toMinutes(b.end_time)));
}

function baseTableForMatch(championship, match, tables) {
  if (['GROUPS', 'GROUPS_F2'].includes(match.phase) && match.group_number) return tables[(num(match.group_number, 1) - 1) % tables.length] || tables[0];
  return tables[0];
}

function schedulePhaseRank(match) {
  if (['GROUPS', 'GROUPS_F2'].includes(match.phase)) return 1;
  if (match.phase === 'PRE_ELIMINATION') return 2;
  if (match.phase === 'KO') {
    const order = { R128: 3, R64: 4, R32: 5, R16: 6, QF: 7, SF: 8, F: 9 };
    return order[match.ko_round] || 20;
  }
  return 30;
}

function normalizeScheduleDays(championship) {
  const rawDays = Array.isArray(championship.schedule_days) ? championship.schedule_days : [];
  const filtered = rawDays.filter((d) => d.is_play_day !== false);
  const source = filtered.length ? filtered : [{ schedule_day_id: 'D-1', play_date: championship.start_date || '', daily_start_time: championship.daily_start_time || '08:00', daily_end_time: championship.daily_end_time || '20:00' }];
  return [...source].sort((a, b) => String(a.play_date || '').localeCompare(String(b.play_date || '')) || String(a.daily_start_time || '').localeCompare(String(b.daily_start_time || '')));
}

export function scheduleMatches(championship, matches) {
  const tables = (championship.tables || []).filter((t) => t.is_active);
  const safeTables = tables.length ? tables : [{ table_id: 'T-1', table_number: 1, display_name: 'Mesa 1', is_active: true }];
  const safeDays = normalizeScheduleDays(championship);
  const blockConfig = parseTableGroupBlock(championship.table_assign_block, safeTables.length);
  if (blockConfig.errors.length) {
    return matches.map((match) => ({ ...match, schedule_conflict: true, conflict_reason: blockConfig.errors.join(' ') }));
  }

  const tableClock = new Map(safeTables.map((t) => [t.table_id || t.display_name, { dayIndex: 0, minute: toMinutes(safeDays[0].daily_start_time || championship.daily_start_time || '08:00') }]));
  const playerLast = new Map();
  const scheduledById = new Map();

  const tableKey = (table) => table.table_id || table.display_name;
  const isPreferred = (preferredTables, table) => preferredTables.some((t) => tableKey(t) === tableKey(table));
  const readClock = (table) => tableClock.get(tableKey(table)) || { dayIndex: 0, minute: toMinutes(safeDays[0].daily_start_time || championship.daily_start_time || '08:00') };

  const placeMatch = (match, preferredTables = []) => {
    const seen = new Set();
    const orderedTables = [...preferredTables, ...safeTables]
      .filter(Boolean)
      .filter((table) => {
        const key = tableKey(table);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        const ap = isPreferred(preferredTables, a) ? 0 : 1;
        const bp = isPreferred(preferredTables, b) ? 0 : 1;
        if (ap !== bp) return ap - bp;
        const ca = readClock(a);
        const cb = readClock(b);
        return ca.dayIndex - cb.dayIndex || ca.minute - cb.minute || num(a.table_number, 999) - num(b.table_number, 999);
      });

    let bestPlacement = null;
    for (const table of orderedTables) {
      const key = tableKey(table);
      let clock = { ...readClock(table) };
      for (let attempt = 0; attempt < 1200; attempt += 1) {
        const day = safeDays[clock.dayIndex];
        if (!day) break;
        const dayStart = toMinutes(day.daily_start_time || championship.daily_start_time || '08:00');
        const dayEnd = toMinutes(day.daily_end_time || championship.daily_end_time || '20:00');
        let startTime = Math.max(clock.minute, dayStart);
        const duration = num(match.estimated_duration_minutes, num(championship.match_duration_minutes, 60));
        const rest = num(match.minimum_rest_time_minutes, num(championship.minimum_rest_time_minutes, 0));
        [match.player1_id, match.player2_id].forEach((pid) => {
          if (!pid || String(pid).startsWith('TBD:') || String(pid).startsWith('WINNER:')) return;
          const last = playerLast.get(pid);
          if (last && last.date === day.play_date && rest > 0 && startTime < last.end + rest) startTime = last.end + rest;
        });
        const endTime = startTime + duration;
        if (endTime <= dayEnd && !inBlackout(championship, day, startTime, endTime)) {
          bestPlacement = {
            ...match,
            assigned_table: table.display_name || key,
            scheduled_date: day.play_date,
            scheduled_time: timeFromMinutes(startTime),
            schedule_conflict: false,
            conflict_reason: ''
          };
          tableClock.set(key, { dayIndex: clock.dayIndex, minute: endTime });
          [match.player1_id, match.player2_id].forEach((pid) => {
            if (!pid || String(pid).startsWith('TBD:') || String(pid).startsWith('WINNER:')) return;
            playerLast.set(pid, { date: day.play_date, end: endTime });
          });
          break;
        }
        clock.minute += 15;
        if (clock.minute + duration > dayEnd) {
          clock.dayIndex += 1;
          const nextDay = safeDays[clock.dayIndex];
          clock.minute = nextDay ? toMinutes(nextDay.daily_start_time || championship.daily_start_time || '08:00') : clock.minute;
        }
      }
      if (bestPlacement) break;
    }

    scheduledById.set(match.match_id, bestPlacement || {
      ...match,
      schedule_conflict: true,
      conflict_reason: 'No se encontró espacio disponible con mesas, fechas, horarios, bloques libres y descanso configurados.',
      scheduled_date: '',
      scheduled_time: '',
      assigned_table: ''
    });
  };

  const groupMatches = matches
    .filter((m) => m.phase === 'GROUPS')
    .sort((a, b) => num(a.group_number) - num(b.group_number) || num(a.group_round) - num(b.group_round) || num(a.group_match_order) - num(b.group_match_order) || num(a.match_number) - num(b.match_number));
  const byGroup = new Map();
  groupMatches.forEach((match) => {
    const key = match.group_id || match.group_name || 'GROUP';
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push(match);
  });
  const groups = [...byGroup.entries()].sort((a, b) => num(a[1][0]?.group_number, 999) - num(b[1][0]?.group_number, 999));

  if (blockConfig.fixedGroupTable) {
    groups.forEach(([, rows], groupIndex) => {
      const preferred = [safeTables[groupIndex % safeTables.length]];
      rows.forEach((match) => placeMatch(match, preferred));
    });
  } else {
    const maxBlocks = Math.max(0, ...groups.map(([, rows]) => Math.ceil(rows.length / Math.max(1, blockConfig.blockSize))));
    for (let blockIndex = 0; blockIndex < maxBlocks; blockIndex += 1) {
      groups.forEach(([, rows], groupIndex) => {
        const block = rows.slice(blockIndex * blockConfig.blockSize, (blockIndex + 1) * blockConfig.blockSize);
        if (!block.length) return;
        const preferred = [];
        if (blockIndex === 0) {
          const startTable = (groupIndex * blockConfig.tableDistribution) % safeTables.length;
          for (let i = 0; i < blockConfig.tableDistribution; i += 1) preferred.push(safeTables[(startTable + i) % safeTables.length]);
        }
        block.forEach((match, matchIndex) => placeMatch(match, preferred.length ? [preferred[matchIndex % preferred.length]] : []));
      });
    }
  }

  const otherMatches = matches
    .filter((m) => m.phase !== 'GROUPS')
    .sort((a, b) => schedulePhaseRank(a) - schedulePhaseRank(b) || num(a.bracket_order) - num(b.bracket_order) || num(a.match_number) - num(b.match_number));
  otherMatches.forEach((match) => placeMatch(match, []));
  return matches.map((match) => scheduledById.get(match.match_id) || match);
}

export function syncScheduleDays(championship, startDate, endDate) {
  if (!startDate || !endDate) return championship.schedule_days || [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return championship.schedule_days || [];
  const days = [];
  const current = new Date(start);
  let index = 1;
  while (current <= end) {
    const iso = current.toISOString().slice(0, 10);
    const existing = (championship.schedule_days || []).find((d) => d.play_date === iso);
    days.push({
      schedule_day_id: existing?.schedule_day_id || uid('D'),
      play_date: iso,
      is_play_day: existing?.is_play_day ?? true,
      daily_start_time: existing?.daily_start_time || championship.daily_start_time || '08:00',
      daily_end_time: existing?.daily_end_time || championship.daily_end_time || '20:00',
      notes: existing?.notes || `Día ${index}`
    });
    current.setDate(current.getDate() + 1);
    index += 1;
  }
  return days;
}

export function matchCode(match) {
  return match?.match_number ? 'P-' + String(match.match_number).padStart(3, '0') : match?.match_id || '-';
}

export function matchScore(match) {
  if (!match || match.match_status !== 'COMPLETED') return '-';
  const base = String(num(match.caroms_p1)) + ' - ' + String(num(match.caroms_p2));
  if (!['GROUPS', 'GROUPS_F2'].includes(match.phase) && num(match.caroms_p1) === num(match.caroms_p2)) return base + ' / Pen ' + String(num(match.penalties_p1)) + '-' + String(num(match.penalties_p2));
  return base;
}

export function matchDisplayStatus(match) {
  return match?.match_status === 'COMPLETED' ? 'Finalizada' : 'Pendiente';
}

export function downloadCsv(name, rows) {
  const keys = Object.keys(rows[0] || { value: '' });
  const csv = [keys.join(','), ...rows.map((row) => keys.map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n');
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  anchor.download = name;
  anchor.click();
}

export function matchRoundKey(match) {
  if (!match) return '';
  if (match.phase === 'PRE_ELIMINATION') return 'R0';
  if (match.phase === 'KO') return match.ko_round || 'KO';
  return match.group_name || match.phase || '';
}

export function matchRoundLabel(match) {
  const key = matchRoundKey(match);
  return ['GROUPS', 'GROUPS_F2'].includes(match?.phase) ? (match.group_name || (match.phase === 'GROUPS_F2' ? 'Grupos F2' : 'Grupos')) : roundDisplayName(key);
}

export function matchAverage(caroms, innings) {
  const c = num(caroms);
  const i = num(innings);
  return i > 0 ? fmtAvg(c / i) : 'N/A';
}

export function matchPlayerStats(match, playerNumber) {
  const p1 = Number(playerNumber) === 1;
  const caroms = p1 ? match.caroms_p1 : match.caroms_p2;
  const innings = p1 ? match.innings_p1 : match.innings_p2;
  const s1 = p1 ? match.s1_p1 : match.s1_p2;
  const s2 = p1 ? match.s2_p1 : match.s2_p2;
  const penalties = p1 ? match.penalties_p1 : match.penalties_p2;
  return {
    player_id: p1 ? match.player1_id : match.player2_id,
    caroms: num(caroms),
    innings: num(innings),
    s1: num(s1),
    s2: num(s2),
    penalties: num(penalties),
    avg: matchAverage(caroms, innings),
    is_winner: Boolean(match.winner_id) && match.winner_id === (p1 ? match.player1_id : match.player2_id)
  };
}

export function matchDetailedScore(match, championship = {}) {
  const a = matchPlayerStats(match, 1);
  const b = matchPlayerStats(match, 2);
  const penaltyText = (a.penalties || b.penalties) ? ` · PEN ${a.penalties}-${b.penalties}` : '';
  if (match.match_status !== 'COMPLETED') return 'Pendiente';
  if (!usesAverageControl(championship)) return `${a.caroms}-${b.caroms}${penaltyText}`;
  return `${a.caroms}-${b.caroms} · Ent ${a.innings}/${b.innings} · AVG ${a.avg}/${b.avg}${penaltyText}`;
}

export function playerInitials(player) {
  if (!player) return 'ND';
  return `${player.first_name?.[0] || ''}${player.last_name?.[0] || ''}`.toUpperCase() || 'ND';
}

export function getAllRoundOptions(matches) {
  const raw = matches.map((m) => matchRoundKey(m)).filter(Boolean);
  const unique = [...new Set(raw)];
  const order = { R0: 0, R128: 1, R64: 2, R32: 3, R16: 4, QF: 5, SF: 6, F: 7 };
  return unique.sort((a, b) => (order[a] ?? 99) - (order[b] ?? 99) || String(a).localeCompare(String(b)));
}

export function isAdministrativeResult(type) {
  return ['WALKOVER', 'ADMINISTRATIVE_WIN', 'WITHDRAWAL', 'BYE'].includes(type || '');
}

export function completeMatchAdvanced(match) {
  const type = match.match_result_type || 'NORMAL';
  if (isAdministrativeResult(type)) {
    const fallbackWinner = match.winner_id || (num(match.caroms_p1) >= num(match.caroms_p2) ? match.player1_id : match.player2_id);
    return { ...match, winner_id: fallbackWinner, match_status: 'COMPLETED', locked_at: match.locked_at || formatDateTimeEs(new Date()) };
  }
  return { ...completeMatch(match), locked_at: match.locked_at || formatDateTimeEs(new Date()), match_result_type: type };
}

export function validateBulkMatches(matches, championship = {}) {
  return matches.map((match) => ({ match, errors: validateMatch(match, championship) })).filter((item) => item.errors.length > 0);
}

export function phaseReachedForPlayer(playerId, matches, seeds) {
  const seed = seeds.find((s) => s.player?.player_id === playerId || s.player_id === playerId);
  let phase = seed ? 'Clasificado a F2' : 'Grupos';
  matches.filter((m) => ['PRE_ELIMINATION', 'KO'].includes(m.phase) && m.match_status === 'COMPLETED').forEach((m) => {
    if (m.player1_id !== playerId && m.player2_id !== playerId) return;
    if (m.winner_id === playerId && m.ko_round === 'F') phase = 'Campeón';
    else if (m.winner_id !== playerId) phase = m.phase === 'PRE_ELIMINATION' ? 'R0' : roundDisplayName(m.ko_round);
    else phase = m.phase === 'PRE_ELIMINATION' ? 'Ganó R0' : roundDisplayName(nextRoundLabel(m.ko_round) || m.ko_round);
  });
  return phase;
}

export function movementType(previousDivision, suggestedDivision) {
  const order = { TERCERA: 1, SEGUNDA: 2, PRIMERA: 3, INTERNACIONAL: 0 };
  const a = order[previousDivision] || 0;
  const b = order[suggestedDivision] || 0;
  if (!a || !b) return 'NO EVALUADO';
  if (b > a) return 'ASCIENDE';
  if (b < a) return 'DESCIENDE';
  return 'MANTIENE';
}

export function suggestDivision(avgAtClose, settings = {}) {
  const threshold1 = num(settings.avg_threshold_1ra, 0.8);
  const threshold2 = num(settings.avg_threshold_2da, 0.45);
  if (avgAtClose === null || avgAtClose === undefined || Number.isNaN(avgAtClose)) return 'NO EVALUADO';
  if (avgAtClose >= threshold1) return 'PRIMERA';
  if (avgAtClose >= threshold2) return 'SEGUNDA';
  return 'TERCERA';
}

export function buildReport5Rows(players, matches, championship = {}) {
  const stats = buildStats(matches, players);
  const statsById = new Map(stats.map((s) => [s.player.player_id, s]));
  const settings = championship.global_settings || {};
  const minimum = num(settings.min_matches_for_reclassification, num(championship.minimum_matches_for_avg_close, 0));
  const specialNoDivision = isSelectiveChampionship(championship) || isInternationalChampionship(championship);
  return players.map((player) => {
    const stat = statsById.get(player.player_id) || { played: 0, avg: null };
    const validMatches = stat.played || 0;
    const eligible = minimum === 0 || validMatches >= minimum;
    const suggested = specialNoDivision ? 'NA' : (eligible ? suggestDivision(stat.avg, settings) : 'NO EVALUADO');
    const previous = isInternationalChampionship(championship) ? 'NA' : (player.division_level || player.previous_division_level || 'NO DEFINIDO');
    return {
      player_id: player.player_id,
      player,
      previous_division: previous,
      previous_average: player.current_average ?? player.last_average ?? null,
      avg_at_close: stat.avg,
      valid_matches: validMatches,
      minimum_required: minimum,
      suggested_division: suggested,
      movement: specialNoDivision ? 'NO APLICA' : (eligible ? movementType(previous, suggested) : 'NO EVALUADO'),
      confirmed: false,
      observation: specialNoDivision ? 'No aplica ascenso/descenso para este tipo de campeonato' : (eligible ? '' : 'No cumple mínimo de partidas válidas')
    };
  }).sort((a, b) => (b.avg_at_close || 0) - (a.avg_at_close || 0));
}

export function applyDivisionMovements(players, reportRows, confirmationNote = '', championship = {}) {
  const confirmedRows = reportRows.filter((r) => r.confirmed && r.avg_at_close !== null && r.avg_at_close !== undefined);
  const map = new Map(confirmedRows.map((r) => [r.player_id, r]));
  const specialNoDivision = isSelectiveChampionship(championship) || isInternationalChampionship(championship);
  const labelBase = championship.end_date || new Date().toISOString().slice(0, 10);
  return players.map((player) => {
    const row = map.get(player.player_id);
    if (!row) return player;
    const avgAtClose = row.avg_at_close === null || row.avg_at_close === undefined ? player.current_average : Number(row.avg_at_close.toFixed(3));
    if (specialNoDivision) {
      const extra = isSelectiveChampionship(championship)
        ? { prom_ult_selectivo: avgAtClose, prom_ult_selectivo_label: labelBase }
        : { prom_ult_campeonato_int: avgAtClose, prom_ult_campeonato_int_label: `${labelBase} · ${championship.name || 'Campeonato Internacional'}` };
      return {
        ...player,
        ...extra,
        division_history: [
          ...(player.division_history || []),
          { movement_type: 'NO APLICA', avg_at_close: avgAtClose, source: isSelectiveChampionship(championship) ? 'Selectivo' : 'Campeonato Internacional', note: confirmationNote, date: formatDateTimeEs(new Date()) }
        ]
      };
    }
    if (!row.suggested_division || row.suggested_division === 'NO EVALUADO' || row.suggested_division === 'NA') return player;
    return {
      ...player,
      previous_division_level: player.division_level,
      last_average: player.current_average,
      current_average: avgAtClose,
      division_level: row.suggested_division,
      division_history: [
        ...(player.division_history || []),
        { previous_division: player.division_level, new_division: row.suggested_division, movement_type: row.movement, avg_at_close: avgAtClose, source: 'Reporte 5', note: confirmationNote, date: formatDateTimeEs(new Date()) }
      ]
    };
  });
}

export function buildActaFinal(championship, players, matches, seeds) {
  const ranking = buildFinalRankings(players, matches, seeds, championship);
  const champion = ranking.find((r) => r.final_status === 'Campeón') || ranking[0];
  const runnerUp = ranking.find((r) => r.final_status === 'Subcampeón') || ranking[1];
  const bestAvg = [...ranking].filter((r) => r.avg !== null && r.avg !== undefined).sort((a, b) => (b.avg || 0) - (a.avg || 0))[0];
  const bestSeries = [...ranking].sort((a, b) => (b.s1 || 0) - (a.s1 || 0))[0];
  return { championship: championship.name, venue: championship.venue_name, date: formatDateTimeEs(new Date()), champion, runnerUp, bestAvg, bestSeries, ranking };
}

export function makeChampionshipSnapshot(championship, groups = [], matches = [], seeds = []) {
  return { id: championship.championship_id, name: championship.name, status: championship.status, start_date: championship.start_date, end_date: championship.end_date, championship, groups, matches, seeds, updated_at: formatDateTimeEs(new Date()) };
}
