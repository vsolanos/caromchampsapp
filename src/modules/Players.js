import { E, Card, Button, Input, Select, Field, Stat, SectionTitle, EmptyState, Badge } from '../components/ui.js';
import { PlayerHistoryTrigger } from '../components/PlayerHistory.js';
import { ASSOCIATIONS } from '../data/defaults.js';
import { uid, num, fmtAvg, playerName } from '../lib/tournament.js';

const COUNTRIES = [
  { code: 'AG', name: 'Antigua y Barbuda' }, { code: 'AR', name: 'Argentina' }, { code: 'BS', name: 'Bahamas' }, { code: 'BB', name: 'Barbados' },
  { code: 'BZ', name: 'Belice' }, { code: 'BO', name: 'Bolivia' }, { code: 'BR', name: 'Brasil' }, { code: 'CA', name: 'Canadá' },
  { code: 'CL', name: 'Chile' }, { code: 'CO', name: 'Colombia' }, { code: 'CR', name: 'Costa Rica' }, { code: 'CU', name: 'Cuba' },
  { code: 'DM', name: 'Dominica' }, { code: 'DO', name: 'República Dominicana' }, { code: 'EC', name: 'Ecuador' }, { code: 'SV', name: 'El Salvador' },
  { code: 'GD', name: 'Granada' }, { code: 'GT', name: 'Guatemala' }, { code: 'GY', name: 'Guyana' }, { code: 'HT', name: 'Haití' },
  { code: 'HN', name: 'Honduras' }, { code: 'JM', name: 'Jamaica' }, { code: 'MX', name: 'México' }, { code: 'NI', name: 'Nicaragua' },
  { code: 'PA', name: 'Panamá' }, { code: 'PY', name: 'Paraguay' }, { code: 'PE', name: 'Perú' }, { code: 'KN', name: 'San Cristóbal y Nieves' },
  { code: 'LC', name: 'Santa Lucía' }, { code: 'VC', name: 'San Vicente y las Granadinas' }, { code: 'SR', name: 'Surinam' }, { code: 'TT', name: 'Trinidad y Tobago' },
  { code: 'US', name: 'Estados Unidos' }, { code: 'UY', name: 'Uruguay' }, { code: 'VE', name: 'Venezuela' }, { code: 'OTHER', name: 'Otro' }
];

const COUNTRY_META = Object.fromEntries(COUNTRIES.map((country) => [country.code, country]));
const ID_TYPES = ['CEDULA', 'PASAPORTE', 'DIMEX', 'OTRO'];
const DIVISIONS = ['PRIMERA', 'SEGUNDA', 'TERCERA', 'NA'];
const STATUSES = ['ACTIVO', 'INACTIVO'];
const INTERNATIONAL_ASSOCIATION = 'INTERNACIONAL';
const ASSOCIATION_OPTIONS = Array.from(new Set([...ASSOCIATIONS, INTERNATIONAL_ASSOCIATION]));
const CR_ASSOCIATIONS = ASSOCIATION_OPTIONS.filter((code) => code !== INTERNATIONAL_ASSOCIATION);

const FLAG_STRIPES = {
  AG: ['#000000', '#ce1126', '#fcd116', '#0072c6', '#ffffff'], AR: ['#74acdf', '#ffffff', '#f6b40e', '#ffffff', '#74acdf'],
  BS: ['#00abc9', '#fcd116', '#00abc9', '#000000'], BB: ['#00267f', '#ffc726', '#000000', '#ffc726', '#00267f'],
  BZ: ['#ce1126', '#003f87', '#ffffff', '#003f87', '#ce1126'], BO: ['#d52b1e', '#f9e300', '#007934'],
  BR: ['#009b3a', '#ffdf00', '#002776'], CA: ['#ff0000', '#ffffff', '#ff0000'], CL: ['#ffffff', '#0039a6', '#d52b1e'],
  CO: ['#fcd116', '#fcd116', '#003893', '#ce1126'], CR: ['#002b7f', '#ffffff', '#ce1126', '#ce1126', '#ffffff', '#002b7f'],
  CU: ['#002a8f', '#ffffff', '#002a8f', '#ffffff', '#002a8f', '#cf142b'], DM: ['#006b3f', '#fcd116', '#000000', '#ffffff', '#d41c30'],
  DO: ['#002d62', '#ffffff', '#ce1126', '#ffffff', '#002d62'], EC: ['#ffdd00', '#ffdd00', '#034ea2', '#ed1c24'],
  SV: ['#0047ab', '#ffffff', '#0047ab'], GD: ['#ce1126', '#fcd116', '#007a5e', '#ce1126'], GT: ['#4997d0', '#ffffff', '#4997d0'],
  GY: ['#009e49', '#fcd116', '#ffffff', '#ce1126', '#000000'], HT: ['#00209f', '#d21034'], HN: ['#00bce4', '#ffffff', '#00bce4'],
  JM: ['#009b3a', '#fcd116', '#000000', '#009b3a'], MX: ['#006847', '#ffffff', '#ce1126'], NI: ['#0067c6', '#ffffff', '#0067c6'],
  PA: ['#ffffff', '#d21034', '#005293', '#ffffff'], PY: ['#d52b1e', '#ffffff', '#0038a8'], PE: ['#d91023', '#ffffff', '#d91023'],
  KN: ['#009e49', '#fcd116', '#000000', '#ce1126'], LC: ['#66ccff', '#fcd116', '#000000', '#ffffff'], VC: ['#0072c6', '#fcd116', '#009e60'],
  SR: ['#377e3f', '#ffffff', '#b40a2d', '#fcd116', '#ffffff', '#377e3f'], TT: ['#ce1126', '#ffffff', '#000000', '#ffffff', '#ce1126'],
  US: ['#b22234', '#ffffff', '#b22234', '#ffffff', '#3c3b6e'], UY: ['#ffffff', '#0038a8', '#ffffff', '#0038a8', '#fcd116'],
  VE: ['#fcd116', '#003893', '#ce1126'], OTHER: ['#cbd5e1', '#f8fafc', '#94a3b8']
};

const IMPORT_COLUMNS = [
  'player_code', 'first_name', 'last_name', 'id_type', 'id_number', 'country_iso', 'association_code', 'division_level',
  'previous_division_level', 'current_average', 'last_average', 'status', 'email', 'phone_e164', 'photo_url', 'notes'
];

function countryName(code) {
  return COUNTRY_META[code || 'OTHER']?.name || code || 'N/D';
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

function FlagIcon({ code }) {
  const normalized = String(code || 'OTHER').toUpperCase();
  const colors = FLAG_STRIPES[normalized] || FLAG_STRIPES.OTHER;
  return E('span', { className: 'flag-icon flag-polished', title: countryName(normalized), 'aria-label': `Bandera ${countryName(normalized)}` },
    E('svg', { viewBox: '0 0 36 24', role: 'img', focusable: 'false' },
      E('rect', { x: 0, y: 0, width: 36, height: 24, rx: 3, fill: '#ffffff' }),
      ...flagShapes(normalized, colors),
      E('rect', { x: .5, y: .5, width: 35, height: 23, rx: 2.5, fill: 'none', stroke: 'rgba(15,23,42,.28)', 'strokeWidth': 1 })
    )
  );
}

function CountryLabel({ code }) {
  const normalized = code || 'OTHER';
  return E('span', { className: 'country-label' }, E(FlagIcon, { code: normalized }), E('span', null, `${normalized} · ${countryName(normalized)}`));
}

function avatar(player) {
  if (player.photo_url) return E('img', { className: 'avatar', src: player.photo_url, alt: playerName(player), onError: (e) => { e.currentTarget.style.display = 'none'; } });
  const initials = `${player.first_name?.[0] || ''}${player.last_name?.[0] || ''}`.toUpperCase() || 'ND';
  return E('div', { className: 'avatar placeholder' }, initials);
}

function optionList(items) { return items.map((item) => E('option', { key: item, value: item }, item)); }
function countryOptions() { return COUNTRIES.map((country) => E('option', { key: country.code, value: country.code }, `${country.code} - ${country.name}`)); }
function associationOptions(countryIso = 'CR') { const source = countryIso === 'CR' ? CR_ASSOCIATIONS : [INTERNATIONAL_ASSOCIATION]; return source.map((a) => E('option', { key: a, value: a }, a)); }

function nextPlayerCode(players, offset = 1) {
  const max = players.reduce((highest, player) => {
    const match = String(player.player_code || '').match(/^JUG-(\d{4,})$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `JUG-${String(max + offset).padStart(4, '0')}`;
}

function visiblePlayerCode(player) { return player.player_code || player.player_id || 'N/D'; }
function normalizeAssociation(countryIso, associationCode) { return countryIso === 'CR' ? (associationCode || 'ASOBIGRIE') : INTERNATIONAL_ASSOCIATION; }
function formatAverageValue(value) { return fmtAvg(num(value)); }

function handlePhotoFile(file, model, setModel) {
  if (!file) return;
  const allowed = ['image/jpeg', 'image/png'];
  if (!allowed.includes(file.type)) { alert('Formato no permitido. Cargue una fotografía JPEG o PNG.'); return; }
  if (file.size > 4 * 1024 * 1024) { alert('La fotografía no puede superar 4 MB.'); return; }
  const reader = new FileReader();
  reader.onerror = () => alert('No fue posible leer la fotografía.');
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const maxSize = 320;
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.72);
      if (dataUrl.length > 900000) { alert('La fotografía sigue siendo demasiado grande después de optimizarla. Use una imagen más pequeña.'); return; }
      setModel((prev) => ({ ...prev, photo_url: dataUrl }));
    };
    img.onerror = () => alert('El archivo seleccionado no parece ser una imagen válida.');
    img.src = String(reader.result || '');
  };
  reader.readAsDataURL(file);
}

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function pick(row, aliases, fallback = '') {
  const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    if (Object.prototype.hasOwnProperty.call(normalized, key)) return normalized[key];
  }
  return fallback;
}

function createEmptyDraft() {
  return {
    first_name: '', last_name: '', id_type: 'CEDULA', id_number: '', country_iso: 'CR', association_code: 'ASOBIGRIE',
    division_level: 'PRIMERA', previous_division_level: 'PRIMERA', current_average: '0.500', last_average: '0.000',
    status: 'ACTIVO', email: '', phone_e164: '+506 ', photo_url: '', notes: ''
  };
}

function normalizePlayerDraft(draft, players = [], codeOffset = 1) {
  const countryIso = String(draft.country_iso || 'CR').toUpperCase();
  const isForeign = countryIso !== 'CR';
  const division = isForeign ? 'NA' : (draft.division_level || 'PRIMERA');
  const previousDivision = isForeign ? 'NA' : (draft.previous_division_level || draft.division_level || 'PRIMERA');
  const currentAverage = num(draft.current_average);
  const lastAverage = num(draft.last_average);
  return {
    player_id: uid('P'),
    player_code: draft.player_code || nextPlayerCode(players, codeOffset),
    first_name: String(draft.first_name || '').trim(),
    last_name: String(draft.last_name || '').trim(),
    id_type: draft.id_type || 'CEDULA',
    id_number: String(draft.id_number || '').trim(),
    country_iso: countryIso,
    association_code: normalizeAssociation(countryIso, draft.association_code),
    division_level: division,
    previous_division_level: previousDivision,
    current_average: currentAverage,
    last_average: lastAverage,
    status: draft.status || 'ACTIVO',
    is_seed: false,
    seed_number: null,
    email: String(draft.email || '').trim(),
    phone_e164: String(draft.phone_e164 || '').trim(),
    photo_url: String(draft.photo_url || '').trim(),
    notes: String(draft.notes || '').trim(),
    division_history: [
      { division_level: previousDivision, average: lastAverage, source: 'Promedio previo' },
      { division_level: division, average: currentAverage, source: 'Alta / edición actual' }
    ]
  };
}

function validatePlayerDraft(draft, players, editingId = null) {
  const errors = [];
  if (!String(draft.first_name || '').trim()) errors.push('Nombre obligatorio.');
  if (!String(draft.last_name || '').trim()) errors.push('Apellidos obligatorios.');
  if (!draft.id_type) errors.push('Tipo de identificación obligatorio.');
  if (!String(draft.id_number || '').trim()) errors.push('Número de identificación obligatorio.');
  if (!draft.country_iso) errors.push('País obligatorio.');
  if (draft.country_iso === 'CR' && !draft.association_code) errors.push('La asociación es obligatoria para jugadores de Costa Rica.');
  if (!draft.division_level) errors.push('División obligatoria.');
  if (draft.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email)) errors.push('Correo electrónico inválido.');
  if (num(draft.current_average) < 0) errors.push('El promedio actual no puede ser negativo.');
  if (num(draft.last_average) < 0) errors.push('El promedio previo no puede ser negativo.');
  const duplicateId = players.find((p) => p.id_number === String(draft.id_number || '').trim() && p.player_id !== editingId);
  if (duplicateId) errors.push('Ya existe un jugador con ese número de identificación.');
  const duplicateCode = draft.player_code && players.find((p) => p.player_code === draft.player_code && p.player_id !== editingId);
  if (duplicateCode) errors.push('Ya existe un jugador con ese código.');
  return errors;
}

function playerToDraft(player) {
  return {
    player_code: player.player_code || player.player_id || '', first_name: player.first_name || '', last_name: player.last_name || '',
    id_type: player.id_type || 'CEDULA', id_number: player.id_number || '', country_iso: player.country_iso || 'CR',
    association_code: normalizeAssociation(player.country_iso || 'CR', player.association_code), division_level: player.division_level || 'PRIMERA',
    previous_division_level: player.previous_division_level || player.division_level || 'PRIMERA', current_average: fmtAvg(player.current_average ?? 0),
    last_average: fmtAvg(player.last_average ?? 0), status: player.status || 'ACTIVO',
    email: player.email || '', phone_e164: player.phone_e164 || player.phone || '', photo_url: player.photo_url || '', notes: player.notes || ''
  };
}

function draftFromImportRow(row, players, offset) {
  const firstNameRaw = pick(row, ['first_name', 'nombre', 'name']);
  const lastNameRaw = pick(row, ['last_name', 'apellidos', 'apellido', 'surname']);
  const fullName = pick(row, ['nombre_completo', 'jugador', 'player']);
  let firstName = String(firstNameRaw || '').trim();
  let lastName = String(lastNameRaw || '').trim();
  if ((!firstName || !lastName) && fullName) {
    const parts = String(fullName).trim().split(/\s+/);
    firstName = firstName || parts[0] || '';
    lastName = lastName || parts.slice(1).join(' ');
  }
  const countryIso = String(pick(row, ['country_iso', 'pais', 'pais_iso', 'country'], 'CR') || 'CR').trim().toUpperCase();
  const draft = {
    player_code: String(pick(row, ['player_code', 'codigo', 'codigo_jugador'], '') || '').trim() || nextPlayerCode(players, offset),
    first_name: firstName,
    last_name: lastName,
    id_type: String(pick(row, ['id_type', 'tipo_id', 'tipo_identificacion'], 'CEDULA') || 'CEDULA').trim().toUpperCase(),
    id_number: String(pick(row, ['id_number', 'identificacion', 'numero_id', 'cedula', 'pasaporte'], '') || '').trim(),
    country_iso: countryIso,
    association_code: normalizeAssociation(countryIso, String(pick(row, ['association_code', 'asociacion'], countryIso === 'CR' ? 'ASOBIGRIE' : INTERNATIONAL_ASSOCIATION) || '').trim()),
    division_level: String(pick(row, ['division_level', 'division', 'division_actual'], 'PRIMERA') || 'PRIMERA').trim().toUpperCase(),
    previous_division_level: String(pick(row, ['previous_division_level', 'division_previa'], '') || '').trim().toUpperCase() || String(pick(row, ['division_level', 'division', 'division_actual'], 'PRIMERA') || 'PRIMERA').trim().toUpperCase(),
    current_average: pick(row, ['current_average', 'promedio_actual', 'avg_actual', 'average'], '0.000'),
    last_average: pick(row, ['last_average', 'promedio_previo', 'avg_previo'], '0.000'),
    status: String(pick(row, ['status', 'estado'], 'ACTIVO') || 'ACTIVO').trim().toUpperCase(),
    email: String(pick(row, ['email', 'correo', 'correo_electronico'], '') || '').trim(),
    phone_e164: String(pick(row, ['phone_e164', 'telefono', 'phone'], '') || '').trim(),
    photo_url: String(pick(row, ['photo_url', 'foto', 'foto_url'], '') || '').trim(),
    notes: String(pick(row, ['notes', 'notas', 'observaciones'], '') || '').trim()
  };
  return draft;
}

function excelTemplateRows() {
  return [{
    player_code: 'JUG-0001', first_name: 'Nombre', last_name: 'Apellidos', id_type: 'CEDULA', id_number: '1-1111-1111', country_iso: 'CR',
    association_code: 'ASOBIGRIE', division_level: 'PRIMERA', previous_division_level: 'SEGUNDA', current_average: 0.500,
    last_average: 0.450, status: 'ACTIVO', email: 'correo@ejemplo.com', phone_e164: '+506 8888 8888', photo_url: '', notes: 'Observación'
  }];
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n;]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowsToCsv(rows, columns = null) {
  const headers = columns || Object.keys(rows[0] || {});
  return [headers.join(','), ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(','))].join('\n');
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let insideQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && insideQuotes && next === '"') { current += '"'; i += 1; }
    else if (char === '"') insideQuotes = !insideQuotes;
    else if (char === ',' && !insideQuotes) { values.push(current); current = ''; }
    else current += char;
  }
  values.push(current);
  return values.map((v) => v.trim());
}

function parseCsv(text) {
  const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim() !== '');
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function downloadTextFile(filename, content, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadCsvTemplate() {
  downloadTextFile('plantilla_jugadores_fecobi.csv', rowsToCsv(excelTemplateRows(), IMPORT_COLUMNS));
}

export function PlayersModule({ players, setPlayers, groups, setGroups, matches, setMatches, seeds, setSeeds, audit }) {
  const React = window.ReactRuntime;
  const [filters, setFilters] = React.useState({ text: '', association: 'ALL', country: 'ALL', division: 'ALL', status: 'ALL' });
  const [draft, setDraft] = React.useState(createEmptyDraft());
  const [editingId, setEditingId] = React.useState('');
  const [editingDraft, setEditingDraft] = React.useState(null);
  const [validationErrors, setValidationErrors] = React.useState([]);
  const [importSummary, setImportSummary] = React.useState(null);

  const normalizedPlayers = React.useMemo(() => players.map((p, index) => ({
    ...p,
    player_code: p.player_code || `JUG-${String(index + 1).padStart(4, '0')}`,
    association_code: normalizeAssociation(p.country_iso || 'CR', p.association_code)
  })), [players]);

  const applyNormalizedPlayers = () => setPlayers(normalizedPlayers);

  const syncPlayerUpdate = (id, patch) => {
    const normalizedPatch = patch.country_iso ? { ...patch, association_code: normalizeAssociation(patch.country_iso, patch.association_code) } : patch;
    // El SEED / No CBZ pertenece al campeonato, no al maestro de jugadores.
    // Al editar el jugador, se actualiza su información personal/deportiva, pero se conserva
    // el seed asignado en grupos/clasificados para el campeonato activo.
    const championshipPatch = { ...normalizedPatch };
    delete championshipPatch.seed_number;
    delete championshipPatch.is_seed;
    setPlayers(players.map((p) => (p.player_id === id ? { ...p, ...normalizedPatch } : p)));
    setGroups(groups.map((g) => ({ ...g, players: g.players.map((p) => (p.player_id === id ? { ...p, ...championshipPatch } : p)) })));
    setSeeds(seeds.map((s) => (s.player.player_id === id ? { ...s, player: { ...s.player, ...championshipPatch } } : s)));
  };

  const resetFilters = () => setFilters({ text: '', association: 'ALL', country: 'ALL', division: 'ALL', status: 'ALL' });

  const visible = normalizedPlayers.filter((p) => {
    const text = `${playerName(p)} ${p.player_code || ''} ${p.player_id} ${p.id_type || ''} ${p.id_number || ''} ${p.email || ''} ${p.phone_e164 || ''} ${p.association_code || ''}`.toLowerCase();
    return (!filters.text || text.includes(filters.text.toLowerCase()))
      && (filters.association === 'ALL' || p.association_code === filters.association)
      && (filters.country === 'ALL' || p.country_iso === filters.country)
      && (filters.division === 'ALL' || p.division_level === filters.division)
      && (filters.status === 'ALL' || p.status === filters.status);
  });

  const addPlayer = () => {
    const prepared = { ...draft, association_code: normalizeAssociation(draft.country_iso, draft.association_code) };
    const errors = validatePlayerDraft(prepared, normalizedPlayers);
    setValidationErrors(errors);
    if (errors.length) return;
    const player = normalizePlayerDraft(prepared, normalizedPlayers);
    setPlayers([...normalizedPlayers, player]);
    setDraft(createEmptyDraft());
    setImportSummary(null);
    audit('PLAYER_CREATED', `Jugador agregado: ${playerName(player)}`);
  };

  const addDemoPlayer = () => {
    const index = normalizedPlayers.length + 1;
    const demo = { ...createEmptyDraft(), first_name: 'Jugador', last_name: `Demo ${index}`, id_number: `DEMO-${String(index).padStart(4, '0')}`, association_code: CR_ASSOCIATIONS[index % CR_ASSOCIATIONS.length], current_average: (0.300 + (index % 10) / 20).toFixed(3), last_average: (0.250 + (index % 8) / 20).toFixed(3), email: `demo${index}@fecobi.test`, phone_e164: `+506 8700 ${String(index).padStart(4, '0')}` };
    const player = normalizePlayerDraft(demo, normalizedPlayers);
    setPlayers([...normalizedPlayers, player]);
    audit('PLAYER_DEMO_CREATED', `Jugador demo agregado: ${playerName(player)}`);
  };

  const handleCsvImport = (file) => {
    if (!file) return;
    const valid = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel';
    if (!valid) { setImportSummary({ imported: 0, skipped: 0, errors: ['Formato no permitido. Use un archivo .csv.'] }); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rows = parseCsv(String(event.target.result || ''));
        if (!rows.length) { setImportSummary({ imported: 0, skipped: 0, errors: ['El archivo CSV no contiene filas de jugadores.'] }); return; }
        const imported = [];
        const errors = [];
        const existing = [...normalizedPlayers];
        rows.forEach((row, index) => {
          const draftRow = draftFromImportRow(row, [...existing, ...imported], imported.length + 1);
          const rowErrors = validatePlayerDraft(draftRow, [...existing, ...imported]);
          if (rowErrors.length) errors.push(`Fila ${index + 2}: ${rowErrors.join(' | ')}`);
          else imported.push(normalizePlayerDraft(draftRow, [...existing, ...imported], imported.length + 1));
        });
        if (imported.length) {
          setPlayers([...normalizedPlayers, ...imported]);
          setGroups([]); setMatches([]); setSeeds([]);
          audit('PLAYERS_IMPORT_CSV', `Importados ${imported.length} jugadores desde CSV.`);
        }
        setImportSummary({ imported: imported.length, skipped: errors.length, errors: errors.slice(0, 20) });
        setValidationErrors(errors.slice(0, 20));
      } catch (error) {
        const message = `No fue posible leer el CSV: ${error.message}`;
        setImportSummary({ imported: 0, skipped: 0, errors: [message] });
        setValidationErrors([message]);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const beginEdit = (player) => { setEditingId(player.player_id); setEditingDraft(playerToDraft(player)); setValidationErrors([]); };
  const cancelEdit = () => { setEditingId(''); setEditingDraft(null); setValidationErrors([]); };

  const saveEdit = (playerId) => {
    const prepared = { ...editingDraft, association_code: normalizeAssociation(editingDraft.country_iso, editingDraft.association_code) };
    const errors = validatePlayerDraft(prepared, normalizedPlayers, playerId);
    setValidationErrors(errors);
    if (errors.length) return;
    const countryIso = String(prepared.country_iso || 'CR').toUpperCase();
    const isForeign = countryIso !== 'CR';
    const division = isForeign ? 'NA' : prepared.division_level;
    const previousDivision = isForeign ? 'NA' : prepared.previous_division_level;
    const patch = { first_name: prepared.first_name.trim(), last_name: prepared.last_name.trim(), id_type: prepared.id_type, id_number: prepared.id_number.trim(), country_iso: countryIso, association_code: normalizeAssociation(countryIso, prepared.association_code), division_level: division, previous_division_level: previousDivision, current_average: num(prepared.current_average), last_average: num(prepared.last_average), status: prepared.status, is_seed: false, seed_number: null, email: prepared.email.trim(), phone_e164: prepared.phone_e164.trim(), photo_url: String(prepared.photo_url || '').trim(), notes: prepared.notes.trim(), division_history: [{ division_level: previousDivision, average: num(prepared.last_average), source: 'Edición mantenimiento' }, { division_level: division, average: num(prepared.current_average), source: 'Promedio actual' }] };
    syncPlayerUpdate(playerId, patch);
    audit('PLAYER_UPDATED', `Jugador actualizado: ${prepared.first_name} ${prepared.last_name}`);
    cancelEdit();
  };

  const deletePlayer = (player) => {
    const ok = window.confirm(`¿Eliminar a ${playerName(player)}? También se eliminarán sus partidas, clasificación y asignación a grupos.`);
    if (!ok) return;
    setPlayers(normalizedPlayers.filter((p) => p.player_id !== player.player_id));
    setMatches(matches.filter((m) => m.player1_id !== player.player_id && m.player2_id !== player.player_id));
    setGroups(groups.map((g) => ({ ...g, players: g.players.filter((p) => p.player_id !== player.player_id) })));
    setSeeds(seeds.filter((s) => s.player.player_id !== player.player_id));
    audit('PLAYER_DELETED', `Jugador eliminado: ${playerName(player)}`);
  };

  const exportPlayers = () => {
    const rows = normalizedPlayers.map((p) => ({ codigo: visiblePlayerCode(p), id_interno: p.player_id, nombre: p.first_name, apellidos: p.last_name, tipo_identificacion: p.id_type || '', identificacion: p.id_number || '', pais: p.country_iso || '', pais_nombre: countryName(p.country_iso), asociacion: p.association_code || '', division: p.division_level || '', promedio_actual: fmtAvg(p.current_average), promedio_previo: fmtAvg(p.last_average), estado: p.status || '', correo: p.email || '', telefono: p.phone_e164 || '', foto: p.photo_url || '', prom_ult_selectivo: fmtAvg(p.prom_ult_selectivo), etiqueta_selectivo: p.prom_ult_selectivo_label || '', prom_ult_campeonato_int: fmtAvg(p.prom_ult_campeonato_int), etiqueta_campeonato_int: p.prom_ult_campeonato_int_label || '' }));
    downloadTextFile('jugadores_fecobi.csv', rowsToCsv(rows));
  };

  const counts = { total: normalizedPlayers.length, visible: visible.length, active: normalizedPlayers.filter((p) => p.status === 'ACTIVO').length, inactive: normalizedPlayers.filter((p) => p.status !== 'ACTIVO').length, international: normalizedPlayers.filter((p) => p.country_iso !== 'CR').length };
  const renderValidation = () => validationErrors.length ? E(Card, { className: 'validation-card' }, E('b', null, 'Validaciones pendientes'), E('ul', null, validationErrors.map((err) => E('li', { key: err }, err)))) : null;

  const renderFullForm = (model, setModel) => E('div', { className: 'grid grid-4', style: { marginTop: 14 } },
    E(Field, { label: 'Nombre' }, E(Input, { value: model.first_name, onChange: (e) => setModel({ ...model, first_name: e.target.value }), placeholder: 'Nombre' })),
    E(Field, { label: 'Apellidos' }, E(Input, { value: model.last_name, onChange: (e) => setModel({ ...model, last_name: e.target.value }), placeholder: 'Apellidos' })),
    E(Field, { label: 'Tipo ID' }, E(Select, { value: model.id_type, onChange: (e) => setModel({ ...model, id_type: e.target.value }) }, optionList(ID_TYPES))),
    E(Field, { label: 'Número ID' }, E(Input, { value: model.id_number, onChange: (e) => setModel({ ...model, id_number: e.target.value }), placeholder: 'Cédula / Pasaporte' })),
    E(Field, { label: 'País' }, E(Select, { value: model.country_iso, onChange: (e) => { const country = e.target.value; const foreign = country !== 'CR'; setModel({ ...model, country_iso: country, association_code: normalizeAssociation(country, model.association_code), division_level: foreign ? 'NA' : (model.division_level === 'NA' ? 'PRIMERA' : model.division_level), previous_division_level: foreign ? 'NA' : (model.previous_division_level === 'NA' ? 'PRIMERA' : model.previous_division_level) }); } }, countryOptions())),
    E(Field, { label: 'Asociación', hint: model.country_iso === 'CR' ? 'Obligatoria para Costa Rica' : 'Automática: Internacional' }, E(Select, { value: normalizeAssociation(model.country_iso, model.association_code), disabled: model.country_iso !== 'CR', onChange: (e) => setModel({ ...model, association_code: e.target.value }) }, associationOptions(model.country_iso))),
    E(Field, { label: 'División actual' }, E(Select, { value: model.country_iso !== 'CR' ? 'NA' : model.division_level, disabled: model.country_iso !== 'CR', onChange: (e) => setModel({ ...model, division_level: e.target.value }) }, optionList(DIVISIONS))),
    E(Field, { label: 'División previa' }, E(Select, { value: model.country_iso !== 'CR' ? 'NA' : model.previous_division_level, disabled: model.country_iso !== 'CR', onChange: (e) => setModel({ ...model, previous_division_level: e.target.value }) }, optionList(DIVISIONS))),
    E(Field, { label: 'Promedio actual' }, E(Input, { type: 'number', step: '0.001', value: model.current_average, onChange: (e) => setModel({ ...model, current_average: e.target.value }) })),
    E(Field, { label: 'Promedio previo' }, E(Input, { type: 'number', step: '0.001', value: model.last_average, onChange: (e) => setModel({ ...model, last_average: e.target.value }) })),
    E(Field, { label: 'Estado' }, E(Select, { value: model.status, onChange: (e) => setModel({ ...model, status: e.target.value }) }, optionList(STATUSES))),
    E(Field, { label: 'Correo electrónico' }, E(Input, { type: 'email', value: model.email, onChange: (e) => setModel({ ...model, email: e.target.value }), placeholder: 'correo@dominio.com' })),
    E(Field, { label: 'Teléfono' }, E(Input, { value: model.phone_e164, onChange: (e) => setModel({ ...model, phone_e164: e.target.value }), placeholder: '+506 8888 8888' })),
    E(Field, { label: 'Fotografía JPEG/PNG', hint: 'Cargue una imagen .jpg, .jpeg o .png; se mostrará como vista previa.' }, E('div', { className: 'photo-input-stack' }, E(Input, { type: 'file', accept: 'image/jpeg,image/png,.jpg,.jpeg,.png', onChange: (e) => handlePhotoFile(e.target.files?.[0], model, setModel) }), model.photo_url ? E('div', { className: 'photo-preview-row' }, E('img', { className: 'avatar', src: model.photo_url, alt: 'Vista previa' }), E(Button, { onClick: () => setModel({ ...model, photo_url: '' }), kind: 'soft' }, 'Quitar foto')) : null)),
    E(Field, { label: 'Notas' }, E(Input, { value: model.notes, onChange: (e) => setModel({ ...model, notes: e.target.value }), placeholder: 'Observaciones internas' }))
  );

  const renderHistory = (player) => {
    const history = player.division_history || [];
    if (!history.length) return E('p', { className: 'small' }, 'Sin historial registrado.');
    return E('div', { className: 'history-list' }, history.map((row, index) => E('span', { key: `${player.player_id}-${index}`, className: 'history-chip' }, `${row.division_level} · AVG ${fmtAvg(row.average)} · ${row.source}`)));
  };

  return E('div', { className: 'grid players-module' },
    E('div', { className: 'grid grid-5' }, E(Stat, { label: 'Total jugadores', value: counts.total }), E(Stat, { label: 'Mostrados', value: counts.visible }), E(Stat, { label: 'Activos', value: counts.active }), E(Stat, { label: 'Inactivos', value: counts.inactive }), E(Stat, { label: 'Internacionales', value: counts.international })),
    renderValidation(),
    importSummary ? E(Card, { className: 'validation-card' }, E('b', null, 'Resultado de importación'), E('p', null, `Importados: ${importSummary.imported} · Rechazados: ${importSummary.skipped}`), importSummary.errors?.length ? E('ul', null, importSummary.errors.map((err) => E('li', { key: err }, err))) : null) : null,
    E(Card, null,
      E(SectionTitle, { title: 'Carga masiva desde CSV', subtitle: 'Importe jugadores desde .csv. Use la plantilla para mantener nombres de columnas compatibles y evitar dependencias vulnerables en frontend.' }),
      E('div', { className: 'toolbar', style: { marginTop: 14 } },
        E(Button, { onClick: downloadCsvTemplate, kind: 'soft' }, 'Descargar plantilla CSV'),
        E(Input, { type: 'file', accept: '.csv,text/csv', onChange: (e) => handleCsvImport(e.target.files?.[0]) }),
        E(Button, { onClick: applyNormalizedPlayers, kind: 'soft' }, 'Normalizar códigos/asociaciones')
      ),
      E('p', { className: 'small', style: { marginTop: 8 } }, 'CSV UTF-8 separado por comas. Columnas soportadas: player_code, first_name, last_name, id_type, id_number, country_iso, association_code, division_level, previous_division_level, current_average, last_average, status, email, phone_e164, photo_url, notes.')
    ),
    E(Card, null,
      E(SectionTitle, { title: 'Agregar jugador', subtitle: 'Campos completos: código JUG automático, identificación, país con bandera automática, asociación/división según país, promedios, foto JPEG/PNG, correo y teléfono.' }),
      renderFullForm(draft, setDraft),
      E('div', { className: 'toolbar', style: { marginTop: 14 } }, E(Button, { onClick: addPlayer, kind: 'success' }, 'Agregar jugador'), E(Button, { onClick: addDemoPlayer, kind: 'soft' }, '+ Demo'), E(Button, { onClick: () => setDraft(createEmptyDraft()), kind: 'soft' }, 'Limpiar formulario'))
    ),
    E(Card, null,
      E('div', { className: 'toolbar', style: { justifyContent: 'space-between' } },
        E(SectionTitle, { title: 'Mantenimiento de jugadores', subtitle: 'Busque, filtre, edite, active/desactive y elimine jugadores con trazabilidad básica.' }),
        E('div', { className: 'toolbar' }, E(Button, { onClick: exportPlayers, kind: 'soft' }, 'Exportar CSV'), E(Button, { onClick: resetFilters, kind: 'soft' }, 'Limpiar filtros'))
      ),
      E('div', { className: 'grid grid-6', style: { marginTop: 14 } },
        E(Field, { label: 'Buscar' }, E(Input, { value: filters.text, onChange: (e) => setFilters({ ...filters, text: e.target.value }), placeholder: 'Nombre, código, correo, teléfono...' })),
        E(Field, { label: 'País' }, E(Select, { value: filters.country, onChange: (e) => setFilters({ ...filters, country: e.target.value }) }, [E('option', { key: 'ALL', value: 'ALL' }, 'ALL'), ...countryOptions()])),
        E(Field, { label: 'Asociación' }, E(Select, { value: filters.association, onChange: (e) => setFilters({ ...filters, association: e.target.value }) }, [E('option', { key: 'ALL', value: 'ALL' }, 'ALL'), ...ASSOCIATION_OPTIONS.map((a) => E('option', { key: a, value: a }, a))])),
        E(Field, { label: 'División' }, E(Select, { value: filters.division, onChange: (e) => setFilters({ ...filters, division: e.target.value }) }, ['ALL', ...DIVISIONS].map((d) => E('option', { key: d, value: d }, d)))),
        E(Field, { label: 'Estado' }, E(Select, { value: filters.status, onChange: (e) => setFilters({ ...filters, status: e.target.value }) }, ['ALL', ...STATUSES].map((s) => E('option', { key: s, value: s }, s))))
      ),
      visible.length === 0 ? E(EmptyState, { title: 'Sin resultados', message: 'Ajuste los filtros o agregue jugadores.' }) : E('div', { className: 'table-wrap player-table-wrap', style: { marginTop: 14 } },
        E('table', { className: 'player-table' },
          E('thead', null, E('tr', null, ['Foto', 'Código', 'Jugador', 'País', 'Asociación', 'División', 'Promedios', 'Contacto', 'Estado', 'Acciones'].map((h) => E('th', { key: h }, h)))),
          E('tbody', null, visible.map((p) => E(React.Fragment, { key: p.player_id },
            E('tr', null,
              E('td', null, avatar(p)),
              E('td', null, E('div', { className: 'player-code' }, visiblePlayerCode(p))),
              E('td', { className: 'player-name' }, E(PlayerHistoryTrigger, { player: p })),
              E('td', null, E(CountryLabel, { code: p.country_iso })),
              E('td', null, p.association_code || 'N/A'),
              E('td', null, E(Badge, { kind: 'info' }, p.division_level || 'N/D')),
              E('td', null, E('div', null, `Actual: ${fmtAvg(p.current_average)}`), E('div', { className: 'small' }, `Previo: ${fmtAvg(p.last_average)}`), p.prom_ult_selectivo !== null && p.prom_ult_selectivo !== undefined ? E('div', { className: 'small special-average' }, `Prom Ult Selectivo: ${fmtAvg(p.prom_ult_selectivo)} · ${p.prom_ult_selectivo_label || ''}`) : null, p.prom_ult_campeonato_int !== null && p.prom_ult_campeonato_int !== undefined ? E('div', { className: 'small special-average' }, `Prom Ult Campeonato Int: ${fmtAvg(p.prom_ult_campeonato_int)} · ${p.prom_ult_campeonato_int_label || ''}`) : null),
              E('td', null, E('div', null, p.email || 'Sin correo'), E('div', { className: 'small' }, p.phone_e164 || 'Sin teléfono')),
              E('td', null, E(Badge, { kind: p.status === 'ACTIVO' ? 'success' : 'danger' }, p.status)),
              E('td', null, E('div', { className: 'toolbar' }, E(Button, { onClick: () => beginEdit(p), kind: 'soft' }, editingId === p.player_id ? 'Editando' : 'Editar'), E(Button, { onClick: () => syncPlayerUpdate(p.player_id, { status: p.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' }), kind: 'soft' }, p.status === 'ACTIVO' ? 'Desactivar' : 'Activar'), E(Button, { onClick: () => deletePlayer(p), kind: 'danger' }, 'Eliminar')))
            ),
            editingId === p.player_id ? E('tr', { className: 'edit-row' },
              E('td', { colSpan: 10 },
                E('div', { className: 'edit-panel' },
                  E('div', { className: 'toolbar', style: { justifyContent: 'space-between' } }, E('div', null, E('b', null, `Editar ${playerName(p)}`), E('p', { className: 'small' }, 'Modifique campos del directorio maestro y guarde los cambios.')), E('div', { className: 'toolbar' }, E(Button, { onClick: () => saveEdit(p.player_id), kind: 'success' }, 'Guardar cambios'), E(Button, { onClick: cancelEdit, kind: 'soft' }, 'Cancelar'))),
                  renderFullForm(editingDraft, setEditingDraft),
                  E('div', { className: 'history-box' }, E('b', null, 'Historial división / promedio'), renderHistory(p))
                )
              )
            ) : null
          )))
        )
      )
    )
  );
}
