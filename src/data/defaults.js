export const STORAGE_KEY = 'fecobi-preprod-v3-4-pdf-header-table-layout';

export const ASSOCIATIONS = ['AJOBI', 'ASOBIGRIE', 'ASOBICO', 'ASOBIUM', 'ASOPZS', 'INTERNACIONAL'];

export const PLAYER_NAMES = [
  'Erick Téllez', 'Carlos Núñez', 'Marvin Chacón', 'Olger Mora', 'Marcos Valencia', 'Victor Solano', 'Álvaro Seas', 'Tirso González',
  'Marvin Azofeifa', 'Álvaro Piza', 'Luis López Rueda', 'Óscar Barquero', 'William Pitty', 'José Efraín González', 'Ricardo Espinoza', 'Alexander Moya',
  'Rafael Bardayán', 'Julio Atencio', 'Daniel Acosta', 'Rodrigo Calvo', 'Victor Espinoza', 'Carlos Patiño', 'Carlos Muñoz', 'Carlos Rodríguez',
  'Greivin López', 'Héctor Mateus', 'Faustino Murillo', 'Ronald Fernández'
];

const GRAN_PRIX_SOURCE_ASSOCIATION_MAP = {
  'S.J.': 'AJOBI',
  'ALAJ': 'ASOBIGRIE',
  'P': 'INTERNACIONAL',
  'C.R.': 'AJOBI',
  'CR': 'AJOBI',
  '': 'ASOBIGRIE'
};

export const GRAN_PRIX_TEST_PLAYERS = [
  { full: 'Walter Granados', source_association: 'ALAJ' },
  { full: 'Milton Zúñiga', source_association: 'S.J.' },
  { full: 'Joel Espinoza', source_association: 'S.J.' },
  { full: 'Miguel Baltodano', source_association: 'S.J.' },
  { full: 'Marden Chacón', source_association: 'ALAJ' },
  { full: 'Roger Morales', source_association: 'S.J.' },
  { full: 'Miguel Ramos', source_association: 'P', source_seed_number: 8 },
  { full: 'Olger Guillén', source_association: 'S.J.' },
  { full: 'Steven Mena', source_association: 'S.J.' },
  { full: 'Eduardo Madrigal', source_association: 'S.J.' },
  { full: 'Andrés Brizuela', source_association: 'S.J.' },
  { full: 'Win Morales', source_association: 'S.J.' },
  { full: 'Carlos Richmond', source_association: 'S.J.' },
  { full: 'Danilo Montero', source_association: 'ALAJ' },
  { full: 'Guillermo Garro', source_association: 'S.J.' },
  { full: 'Jason Bolaños', source_association: 'S.J.' },
  { full: 'Eladio Alvarado', source_association: 'S.J.' },
  { full: 'Jorge Montero', source_association: 'C.R.' },
  { full: 'Carlos Varela', source_association: 'S.J.' },
  { full: 'José González', source_association: 'P', source_seed_number: 2 },
  { full: 'Max Aguilar', source_association: 'S.J.' },
  { full: 'Erick Matarrita', source_association: 'S.J.' },
  { full: 'Melvin Quesada', source_association: 'S.J.' },
  { full: 'Daniel Miranda', source_association: 'P', source_seed_number: 3 },
  { full: 'Ronald Ramírez', source_association: 'S.J.' },
  { full: 'José Molina', source_association: 'S.J.' },
  { full: 'Felipe Colomb', source_association: 'CR' },
  { full: 'Marco Pérez', source_association: 'S.J.' },
  { full: 'David Vega', source_association: 'S.J.' },
  { full: 'Óscar Gómez', source_association: 'S.J.' },
  { full: 'Marco Granados', source_association: '' },
  { full: 'Juan C. Aguilar', source_association: 'S.J.' },
  { full: 'Boris Mora', source_association: 'S.J.' },
  { full: 'Fernando Guzmán', source_association: 'S.J.' },
  { full: 'Rafael Herrera', source_association: 'S.J.' },
  { full: 'Pablo Beltrán', source_association: '', source_seed_number: 9 },
  { full: 'Samir López', source_association: 'S.J.' },
  { full: 'Allan Marín', source_association: 'S.J.' },
  { full: 'Raúl Bonilla', source_association: 'S.J.' },
  { full: 'Francis Valerio', source_association: 'ALAJ' },
  { full: 'Alex Ramírez', source_association: '' },
  { full: 'Alberto Miranda', source_association: 'S.J.' },
  { full: 'Victor López', source_association: 'S.J.' }
];


const COUNTRY_ASSOCIATION_OVERRIDES = {
  'Tirso Gonzalez': { country_iso: 'DO', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE', id_prefix: 'DO' },
  'Tirso González': { country_iso: 'DO', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE', id_prefix: 'DO' },
  'Marcos Valencia': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE', id_prefix: 'PA' },
  'William Pitty': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE', id_prefix: 'PA' },
  'Carlos Núñez': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE', id_prefix: 'PA' },
  'Carlos Nunez': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE', id_prefix: 'PA' },
  'Ricardo Espinoza': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE', id_prefix: 'PA' },
  'Victor Espinoza': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE', id_prefix: 'PA' },
  'Rafael Bardayán': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE', id_prefix: 'PA' },
  'Rafael Bardayan': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE', id_prefix: 'PA' },
  'Julio Atencio': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE', id_prefix: 'PA' },
  'Daniel Acosta': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE', id_prefix: 'PA' },
  'Faustino Murillo': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE', id_prefix: 'PA' },
  'Carlos Patiño': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE', id_prefix: 'PA' },
  'Carlos Patino': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE', id_prefix: 'PA' },
  'Pablo Beltrán': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE', id_prefix: 'PA' },
  'Pablo Beltran': { country_iso: 'PA', association_code: 'INTERNACIONAL', id_type: 'PASAPORTE', id_prefix: 'PA' }
};

function normalizeNameKey(value = '') {
  return String(value || '').trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').toLowerCase();
}

function countryAssociationOverride(full = '') {
  const key = normalizeNameKey(full);
  return Object.entries(COUNTRY_ASSOCIATION_OVERRIDES).find(([name]) => normalizeNameKey(name) === key)?.[1] || null;
}

function splitFullName(full = '') {
  const parts = String(full).trim().split(/\s+/).filter(Boolean);
  return { first_name: parts[0] || '', last_name: parts.slice(1).join(' ') };
}

function makePlayer(full, i, overrides = {}) {
  const { first_name, last_name } = splitFullName(full);
  const idNumber = overrides.id_number || `CR-${String(100000000 + i).slice(0, 9)}`;
  const currentAverage = +(0.25 + ((i * 37) % 90) / 100).toFixed(3);
  const lastAverage = +(0.21 + ((i * 31) % 80) / 100).toFixed(3);
  const sourceAssociation = String(overrides.source_association || '').trim();
  const forcedInternational = countryAssociationOverride(full);
  const associationCode = forcedInternational?.association_code || overrides.association_code || GRAN_PRIX_SOURCE_ASSOCIATION_MAP[sourceAssociation] || ASSOCIATIONS.filter((code) => code !== 'INTERNACIONAL')[i % (ASSOCIATIONS.length - 1)];
  const isPanamaInternational = (associationCode === 'INTERNACIONAL' && sourceAssociation === 'P') || forcedInternational?.country_iso === 'PA';
  const isDominicanInternational = forcedInternational?.country_iso === 'DO';
  const countryIso = forcedInternational?.country_iso || (isPanamaInternational ? 'PA' : 'CR');
  const idPrefix = forcedInternational?.id_prefix || (countryIso === 'PA' ? 'PA' : countryIso === 'DO' ? 'DO' : 'CR');
  const sourceSeed = overrides.source_seed_number ? ` · Seed fuente #${overrides.source_seed_number}` : '';

  return {
    player_id: `P-${String(i + 1).padStart(3, '0')}`,
    player_code: `JUG-${String(i + 1).padStart(4, '0')}`,
    first_name,
    last_name,
    id_type: (isPanamaInternational || isDominicanInternational) ? 'PASAPORTE' : 'CEDULA',
    id_number: (isPanamaInternational || isDominicanInternational) ? `${idPrefix}-${String(100000000 + i).slice(0, 9)}` : idNumber,
    country_iso: countryIso,
    association_code: associationCode,
    division_level: 'PRIMERA',
    previous_division_level: i % 5 === 0 ? 'SEGUNDA' : 'PRIMERA',
    current_average: currentAverage,
    last_average: lastAverage,
    status: 'ACTIVO',
    is_seed: false,
    seed_number: null,
    email: `jugador${i + 1}@fecobi.test`,
    phone_e164: `+506 8888 ${String(1000 + i).slice(-4)}`,
    photo_url: '',
    notes: overrides.notes || (sourceAssociation ? `Carga de prueba Gran Prix Centroamericano 2026${sourceSeed}` : sourceSeed.replace(/^ · /, '')),
    source_association_label: '',
    source_seed_number: overrides.source_seed_number || null,
    prom_ult_selectivo: null,
    prom_ult_selectivo_label: '',
    prom_ult_campeonato_int: null,
    prom_ult_campeonato_int_label: '',
    division_history: [
      { division_level: i % 5 === 0 ? 'SEGUNDA' : 'PRIMERA', average: lastAverage, source: 'Histórico inicial' },
      { division_level: 'PRIMERA', average: currentAverage, source: 'Promedio actual' }
    ]
  };
}

const BASE_DEFAULT_PLAYERS = PLAYER_NAMES.map((full, i) => makePlayer(full, i));
const GRAN_PRIX_DEFAULT_PLAYERS = GRAN_PRIX_TEST_PLAYERS.map((row, index) => makePlayer(row.full, BASE_DEFAULT_PLAYERS.length + index, row));

export const DEFAULT_PLAYERS = [...BASE_DEFAULT_PLAYERS, ...GRAN_PRIX_DEFAULT_PLAYERS];

export const DEFAULT_CHAMPIONSHIP = {
  championship_id: 'CH-PREPROD-001',
  name: 'Campeonato Nacional Primera División FECOBI',
  status: 'DRAFT',
  venue_name: 'Sala Oficial FECOBI',
  organizing_association_code: 'ASOBIGRIE',
  responsible_name: 'Director Técnico FECOBI',
  technical_director_name: 'Director Técnico FECOBI',
  representative1_name: '',
  representative2_name: '',
  website_url: '',
  whatsapp_group: '',
  start_date: '2026-05-10',
  end_date: '2026-05-11',
  daily_start_time: '08:00',
  daily_end_time: '20:00',
  division_filter: 'PRIMERA',
  participant_ids: DEFAULT_PLAYERS.map((p) => p.player_id),
  participant_seeds: Object.fromEntries(DEFAULT_PLAYERS.slice(0, 16).map((p, i) => [p.player_id, i + 1])),
  championship_type: 'NORMAL',
  average_control_enabled: true,
  ranking_championship_id: '',
  ranking_max_championships: 5,
  ranking_points_rules: [
    { rule_id: 'RP-1', from_position: 1, to_position: 1, points: 15 },
    { rule_id: 'RP-2', from_position: 2, to_position: 2, points: 10 },
    { rule_id: 'RP-3-4', from_position: 3, to_position: 4, points: 7 },
    { rule_id: 'RP-5-8', from_position: 5, to_position: 8, points: 3 }
  ],
  play_mode: 'RACE',
  preferred_group_size: 4,
  qualifiers_per_group: 2,
  extra_qualifier_position: 3,
  extra_qualifiers_count: 2,
  total_qualifiers_f2: 16,
  group_generation_mode: 'SEEDED_RANDOM_COUNTRY_SPREAD',
  country_spread_enabled: true,
  random_seed: 'FECOBI-2026',
  third_place_policy: 'POINTS_THEN_AVG',
  minimum_matches_for_avg_close: 0,
  target_points: 40,
  innings_limit: 40,
  closure_type: 'CON_CIERRE',
  minimum_rest_time_minutes: 15,
  table_assign_block: '2',
  match_duration_minutes: 60,
  use_match_officials: false,
  official_capture_scope: 'ASSIGNED_MATCHES',
  official_requires_admin_validation: false,
  closed_at: '',
  closed_by: '',
  finalized_at: '',
  finalized_by: '',
  global_settings: { avg_threshold_1ra: 0.800, avg_threshold_2da: 0.450, ui_theme: 'light', language: 'es', pdf_default_page_size: 'A4', pdf_default_orientation: 'portrait' },
  division_movements_confirmed: false,
  confirmation_note: '',
  phase_rules: [
    { rule_id: 'PR-GROUPS', phase: 'GROUPS', round: '', target_points: 40, innings_limit: 40, closure_type: 'CON_CIERRE', duration_minutes: 60, rest_minutes: 15 },
    { rule_id: 'PR-PRE', phase: 'PRE_ELIMINATION', round: 'R0', target_points: 40, innings_limit: 40, closure_type: 'CON_CIERRE', duration_minutes: 70, rest_minutes: 15 },
    { rule_id: 'PR-R16', phase: 'KO', round: 'R16', target_points: 40, innings_limit: 0, closure_type: 'CON_CIERRE', duration_minutes: 80, rest_minutes: 20 },
    { rule_id: 'PR-QF', phase: 'KO', round: 'QF', target_points: 40, innings_limit: 0, closure_type: 'CON_CIERRE', duration_minutes: 90, rest_minutes: 20 },
    { rule_id: 'PR-SF', phase: 'KO', round: 'SF', target_points: 40, innings_limit: 0, closure_type: 'CON_CIERRE', duration_minutes: 100, rest_minutes: 30 },
    { rule_id: 'PR-F', phase: 'KO', round: 'F', target_points: 40, innings_limit: 0, closure_type: 'CON_CIERRE', duration_minutes: 110, rest_minutes: 30 }
  ],
  tables: [1, 2, 3, 4].map((n) => ({ table_id: `T-${n}`, table_number: n, display_name: `Mesa ${n}`, is_active: true })),
  schedule_days: [
    { schedule_day_id: 'D-1', play_date: '2026-05-10', is_play_day: true, daily_start_time: '08:00', daily_end_time: '20:00', notes: 'Día 1' },
    { schedule_day_id: 'D-2', play_date: '2026-05-11', is_play_day: true, daily_start_time: '08:00', daily_end_time: '20:00', notes: 'Día 2' }
  ],
  blackouts: [
    { blackout_id: 'B-1', schedule_day_id: 'D-1', start_time: '12:00', end_time: '13:00', reason: 'Almuerzo', is_hard_block: true },
    { blackout_id: 'B-2', schedule_day_id: 'D-2', start_time: '12:00', end_time: '13:00', reason: 'Almuerzo', is_hard_block: true }
  ]
};
