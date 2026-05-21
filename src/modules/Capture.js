import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { E, Card, Button, Input, Select, Field, SectionTitle, Badge, EmptyState } from '../components/ui.js';
import { PdfControls, PdfDocument } from '../components/Print.js';
import { PlayerHistoryTrigger } from '../components/PlayerHistory.js';
import { startPdfPrint } from '../lib/print.js';
import { detectMatchCodeFromFileName, detectMatchCodeFromQr, deleteScoreSheetAttachment, listScoreSheetAttachments, saveScoreSheetAttachment } from '../lib/scoreSheets.js';
import {
  autoFillMatches,
  clearResults,
  completeMatchAdvanced,
  getAllRoundOptions,
  matchCode,
  matchDetailedScore,
  matchDisplayStatus,
  matchPlayerStats,
  matchRoundKey,
  matchRoundLabel,
  playerName,
  roundDisplayName,
  validateBulkMatches,
  validateMatch,
  formatDateEs,
  getPhaseRule,
  usesAverageControl,
  num
} from '../lib/tournament.js';

function mergeById(original, updates) {
  const map = new Map(updates.map((m) => [m.match_id, m]));
  return original.map((m) => map.get(m.match_id) || m);
}

function field(match, key, value) {
  return { ...match, [key]: value };
}


function scoreSheetLimit(match, championship = {}) {
  // v4.6: Dirección Técnica confirmó que las planillas deben usar el campo
  // "Límite entradas default" del campeonato como fuente principal.
  // Si el campeonato indica 0, se imprimen 60 líneas máximas para permitir
  // partidas sin límite fijo de entradas.
  const championshipDefaultLimit = num(championship?.innings_limit, 0);
  if (championshipDefaultLimit > 0) return championshipDefaultLimit;
  return 60;
}

function sheetRows(match, championship = {}) {
  const limit = Math.max(1, Math.min(60, scoreSheetLimit(match, championship)));
  return Array.from({ length: limit }, (_, index) => index + 1);
}

function ScoreSheetPage({ championship, match = {}, playerMap, logoMode = 'FECOBI', blank = false }) {
  const code = blank ? '' : matchCode(match);
  const p1 = blank ? null : playerMap[match.player1_id];
  const p2 = blank ? null : playerMap[match.player2_id];
  const limit = scoreSheetLimit(match, championship);
  const qrPayload = blank ? '' : JSON.stringify({ championship_id: championship.championship_id, match_id: match.match_id, code });
  const phaseRule = blank ? {} : getPhaseRule(championship, match.phase, match.ko_round || '');
  const rows = sheetRows(match, championship);
  const labelValue = (label, value) => E('div', null, E('b', null, label), blank ? '__________' : value);
  return E('article', { className: `score-sheet-page ${blank ? 'score-sheet-blank-page' : ''}`.trim(), style: { '--sheet-row-count': rows.length } },
    E('div', { className: 'score-sheet-header' },
      E('div', { className: 'score-sheet-logos' },
        ['FECOBI', 'AMBOS'].includes(logoMode) ? E('img', { src: '/assets/fecobi-logo.jpg', alt: 'FECOBI' }) : null,
        ['ASOBIGRIE', 'AMBOS'].includes(logoMode) ? E('img', { src: '/assets/asobigrie-logo.jpg', alt: 'ASOBIGRIE' }) : null
      ),
      E('div', { className: 'score-sheet-title' },
        E('h2', null, championship.name || 'Campeonato FECOBI'),
        E('h3', null, 'Planilla oficial de partida'),
        E('p', null, blank ? 'Fase / Grupo: ______________________________' : `${matchRoundLabel(match)} · ${match.group_name || match.ko_round || ''}`)
      ),
      E('div', { className: 'score-sheet-qr' },
        blank ? E('div', { className: 'score-sheet-qr-placeholder' }, 'QR') : E(QRCodeSVG, { value: qrPayload, size: 76, level: 'M', includeMargin: true }),
        E('strong', null, blank ? 'P-___' : code)
      )
    ),
    E('div', { className: 'score-sheet-meta-grid' },
      labelValue('Fecha: ', blank ? '' : (match.scheduled_date ? formatDateEs(match.scheduled_date) : '__________')),
      labelValue('Hora: ', '__________'),
      labelValue('Mesa #: ', '__________'),
      labelValue('Planilla #: ', blank ? 'P-___' : code),
      labelValue('Distancia: ', blank ? '__________ carambolas' : `${match.applied_target_points || phaseRule.target_points || championship.target_points} carambolas`),
      labelValue('Límite: ', blank ? '__________ entradas' : (limit >= 60 && !num(championship.innings_limit, 0) ? 'Sin límite / 60 líneas' : `${limit} entradas`)),
      labelValue('Árbitro/Capturista: ', blank ? '________________' : (match.assigned_official || '________________')),
      labelValue('Código partida: ', blank ? 'P-___' : code)
    ),
    E('div', { className: 'score-sheet-players' },
      E('div', { className: 'score-sheet-player-block' },
        E('div', { className: 'score-sheet-player-line' }, E('b', null, 'Jugador 1: '), blank ? '' : (playerName(p1) || 'Por definir')),
        E('div', { className: 'score-sheet-player-line blank-player-line' }, E('b', null, 'Jugador 1: '), E('span', null, ''))
      ),
      E('div', { className: 'score-sheet-player-block' },
        E('div', { className: 'score-sheet-player-line' }, E('b', null, 'Jugador 2: '), blank ? '' : (playerName(p2) || 'Por definir')),
        E('div', { className: 'score-sheet-player-line blank-player-line' }, E('b', null, 'Jugador 2: '), E('span', null, ''))
      )
    ),
    E('div', { className: 'score-sheet-table-wrap' },
      E('table', { className: 'score-sheet-innings-table' },
        E('thead', null,
          E('tr', null,
            E('th', { colSpan: 4 }, 'Jugador 1'),
            E('th', { colSpan: 4 }, 'Jugador 2')
          ),
          E('tr', null,
            ['NUM', 'CON', 'CAR', 'ACU', 'NUM', 'CON', 'CAR', 'ACU'].map((h, index) => E('th', { key: `${h}-${index}` }, h))
          )
        ),
        E('tbody', null, rows.map((row) => E('tr', { key: row },
          E('td', { className: 'sheet-entry-number' }, row),
          E('td', { className: 'sheet-data-cell' }), E('td', { className: 'sheet-data-cell' }), E('td', { className: 'sheet-data-cell' }),
          E('td', { className: 'sheet-entry-number' }, row),
          E('td', { className: 'sheet-data-cell' }), E('td', { className: 'sheet-data-cell' }), E('td', { className: 'sheet-data-cell' })
        )))
      )
    ),
    E('div', { className: 'score-sheet-summary-grid score-sheet-summary-v44' },
      E('div', { className: 'score-sheet-summary-box' }, E('h4', null, 'Jugador 1'), ['Total Carambolas', 'SM1', 'SM2', 'Firma Jugador 1'].map((x) => E('div', { key: x }, E('b', null, x), E('span', null, '')))),
      E('div', { className: 'score-sheet-summary-box arbiter-box' }, E('h4', null, 'Árbitro'), E('div', null, E('b', null, 'Firma Árbitro'), E('span', null, '')), E('div', null, E('b', null, 'Observaciones'), E('span', null, ''))),
      E('div', { className: 'score-sheet-summary-box' }, E('h4', null, 'Jugador 2'), ['Total Carambolas', 'SM1', 'SM2', 'Firma Jugador 2'].map((x) => E('div', { key: x }, E('b', null, x), E('span', null, ''))))
    )
  );
}

function ScoreSheetsPrintDocument({ championship, matches, playerMap, logoMode }) {
  // v6.5: restore a first blank base template for the tournament, but isolate the
  // print scope so the template and every official match sheet render as exactly
  // one centered Letter page.
  return E('section', { className: 'score-sheets-print-scope' },
    E(ScoreSheetPage, { key: 'blank-base-template', championship, match: {}, playerMap, logoMode, blank: true }),
    matches.map((match) => E(ScoreSheetPage, { key: match.match_id, championship, match, playerMap, logoMode }))
  );
}

export function CaptureModule({ championship, players, matches, setMatches, audit }) {
  const [filters, setFilters] = useState({ phase: 'ALL', round: 'ALL', group: 'ALL', status: 'ALL', player: 'ALL', table: 'ALL', date: 'ALL', conflict: 'ALL', official: 'ALL' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [reason, setReason] = useState('Corrección operativa autorizada');
  const [errorSummary, setErrorSummary] = useState([]);
  const [pageSize, setPageSize] = useState(championship.global_settings?.pdf_default_page_size || 'A4');
  const [orientation, setOrientation] = useState(championship.global_settings?.pdf_default_orientation || 'portrait');
  const [scale, setScale] = useState('100');
  const [sheetMode, setSheetMode] = useState('VISIBLE');
  const [sheetLogoMode, setSheetLogoMode] = useState('FECOBI');
  const [manualUploadMatchId, setManualUploadMatchId] = useState('');
  const [sheetAttachments, setSheetAttachments] = useState([]);
  const [uploadSummary, setUploadSummary] = useState('');
  const playerMap = Object.fromEntries(players.map((p) => [p.player_id, p]));
  const avgEnabled = usesAverageControl(championship);
  const groupOptions = [...new Set(matches.map((m) => m.group_name).filter(Boolean))];
  const phaseOptions = [...new Set(matches.map((m) => m.phase).filter(Boolean))];
  const roundOptions = getAllRoundOptions(matches).filter((r) => ['R0', 'R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F'].includes(r));
  const tableOptions = [...new Set(matches.map((m) => m.assigned_table).filter(Boolean))];
  const dateOptions = [...new Set(matches.map((m) => m.scheduled_date).filter(Boolean))];
  const playerOptions = [...new Set(matches.flatMap((m) => [m.player1_id, m.player2_id]).filter(Boolean))]
    .map((id) => playerMap[id])
    .filter(Boolean)
    .sort((a, b) => playerName(a).localeCompare(playerName(b)));

  useEffect(() => {
    listScoreSheetAttachments(championship.championship_id)
      .then(setSheetAttachments)
      .catch((error) => setUploadSummary(`No fue posible leer planillas cargadas: ${error.message}`));
  }, [championship.championship_id]);

  const filtered = useMemo(() => matches.filter((m) =>
    (filters.phase === 'ALL' || m.phase === filters.phase) &&
    (filters.round === 'ALL' || matchRoundKey(m) === filters.round) &&
    (filters.group === 'ALL' || m.group_name === filters.group) &&
    (filters.status === 'ALL' || m.match_status === filters.status) &&
    (filters.player === 'ALL' || m.player1_id === filters.player || m.player2_id === filters.player) &&
    (filters.table === 'ALL' || m.assigned_table === filters.table) &&
    (filters.date === 'ALL' || m.scheduled_date === filters.date) &&
    (filters.conflict === 'ALL' || (filters.conflict === 'YES' ? Boolean(m.schedule_conflict || m.validation_error) : !m.schedule_conflict && !m.validation_error)) &&
    (filters.official === 'ALL' || (m.assigned_official || '') === filters.official)
  ), [matches, filters]);

  const scoreSheetMatches = useMemo(() => {
    const base = sheetMode === 'ALL' ? matches
      : sheetMode === 'GROUPS' ? matches.filter((m) => ['GROUPS', 'GROUPS_F2'].includes(m.phase))
        : sheetMode === 'ELIMINATION' ? matches.filter((m) => ['PRE_ELIMINATION', 'KO'].includes(m.phase))
          : sheetMode === 'PENDING' ? matches.filter((m) => m.match_status !== 'COMPLETED' && m.match_status !== 'LOCKED')
            : sheetMode === 'SELECTED' ? matches.filter((m) => selectedIds.includes(m.match_id))
              : filtered;
    return [...base].sort((a, b) => Number(a.match_number || 0) - Number(b.match_number || 0));
  }, [sheetMode, matches, filtered, selectedIds]);

  const refreshSheetAttachments = () => listScoreSheetAttachments(championship.championship_id).then(setSheetAttachments);

  const update = (id, patch) => setMatches(matches.map((m) => (m.match_id === id ? { ...m, ...patch } : m)));
  const toggleSelected = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const selectVisible = () => setSelectedIds(filtered.map((m) => m.match_id));
  const clearSelected = () => setSelectedIds([]);

  const saveOne = (match) => {
    if (match.match_status === 'PLANNED') return alert('Esta partida está planificada para calendario. Se habilitará cuando la ronda anterior defina jugadores.');
    const wasCompleted = match.match_status === 'COMPLETED' || match.match_status === 'LOCKED';
    if (wasCompleted && !reason.trim()) return alert('Debe indicar motivo para modificar una partida completada o bloqueada.');
    const errors = validateMatch(match, championship);
    if (errors.length) return alert(errors.join('\n'));
    const completed = completeMatchAdvanced({ ...match, edit_reason: wasCompleted ? reason : match.edit_reason, validation_error: '' });
    setMatches(matches.map((m) => (m.match_id === match.match_id ? completed : m)));
    audit(wasCompleted ? 'MATCH_CORRECTED' : 'MATCH_COMPLETED', `${matchCode(match)} · ${playerName(playerMap[match.player1_id])} vs ${playerName(playerMap[match.player2_id])}${wasCompleted ? ' · Motivo: ' + reason : ''}`);
  };

  const saveBulk = () => {
    const ids = selectedIds.length ? selectedIds : filtered.map((m) => m.match_id);
    const selected = matches.filter((m) => ids.includes(m.match_id));
    if (selected.some((m) => m.match_status === 'PLANNED')) return alert('Las partidas planificadas no pueden capturarse hasta generar la ronda correspondiente.');
    const requiresReason = selected.some((m) => ['COMPLETED', 'LOCKED'].includes(m.match_status));
    if (requiresReason && !reason.trim()) return alert('Debe indicar motivo para guardado masivo que modifica partidas completadas/bloqueadas.');
    const errors = validateBulkMatches(selected, championship);
    setErrorSummary(errors);
    if (errors.length) return alert(`Hay ${errors.length} partida(s) con errores. Revise el resumen antes de confirmar.`);
    const completed = selected.map((m) => completeMatchAdvanced({ ...m, edit_reason: requiresReason ? reason : m.edit_reason, validation_error: '' }));
    setMatches(mergeById(matches, completed));
    audit('BULK_SAVE', `${completed.length} partidas guardadas masivamente.`);
    setSelectedIds([]);
  };

  const reopen = (match) => {
    if (!reason.trim()) return alert('Debe indicar motivo para reabrir una partida.');
    update(match.match_id, { match_status: 'CREATED', winner_id: '', reopened_reason: reason, locked_at: '' });
    audit('MATCH_REOPENED', `${matchCode(match)} reabierta. Motivo: ${reason}`);
  };

  const playerLine = (match, playerNumber) => {
    const isP1 = playerNumber === 1;
    const playerId = isP1 ? match.player1_id : match.player2_id;
    const stats = matchPlayerStats(match, playerNumber);
    const patchKey = (key, value) => update(match.match_id, { [key]: value });
    const isPlanned = match.match_status === 'PLANNED';
    const caromsValue = isP1 ? match.caroms_p1 : match.caroms_p2;
    const inningsValue = isP1 ? match.innings_p1 : match.innings_p2;
    const s1Value = isP1 ? match.s1_p1 : match.s1_p2;
    const s2Value = isP1 ? (match.s2_p1 || '') : (match.s2_p2 || '');
    const activeDataClass = (value) => String(value ?? '').trim() !== '' ? 'match-active-data-cell has-result-data' : 'match-active-data-cell';
    const cells = [
      E('td', { className: 'player-name', key: 'player' }, playerMap[playerId] ? E(PlayerHistoryTrigger, { player: playerMap[playerId] }) : (isPlanned ? 'Por definir' : '')), 
      E('td', { key: 'caroms', className: activeDataClass(caromsValue) }, E(Input, { type: 'number', disabled: isPlanned, value: caromsValue, onChange: (e) => patchKey(isP1 ? 'caroms_p1' : 'caroms_p2', e.target.value) })),
      avgEnabled ? E('td', { key: 'innings', className: activeDataClass(inningsValue) }, E(Input, { type: 'number', disabled: isPlanned, value: inningsValue, onChange: (e) => patchKey(isP1 ? 'innings_p1' : 'innings_p2', e.target.value) })) : null,
      E('td', { key: 's1', className: activeDataClass(s1Value) }, E(Input, { type: 'number', disabled: isPlanned, value: s1Value, onChange: (e) => patchKey(isP1 ? 's1_p1' : 's1_p2', e.target.value) })),
      E('td', { key: 's2', className: activeDataClass(s2Value) }, E(Input, { type: 'number', disabled: isPlanned, value: s2Value, onChange: (e) => patchKey(isP1 ? 's2_p1' : 's2_p2', e.target.value) }))
    ];
    if (!['GROUPS', 'GROUPS_F2'].includes(match.phase)) {
      const penaltiesValue = isP1 ? match.penalties_p1 : match.penalties_p2;
      cells.push(E('td', { key: 'penalties', className: activeDataClass(penaltiesValue) }, E(Input, { type: 'number', disabled: isPlanned, value: penaltiesValue, onChange: (e) => patchKey(isP1 ? 'penalties_p1' : 'penalties_p2', e.target.value) })));
    }
    if (avgEnabled) cells.push(E('td', { key: 'avg', className: String(stats.avg || '').trim() !== 'N/A' ? 'match-active-data-cell has-result-data' : 'match-active-data-cell' }, stats.avg));
    return E('tr', { key: `${match.match_id}-${playerNumber}`, className: stats.is_winner ? 'winner-row' : '' }, ...cells);
  };

  const exportScoreSheetsPdf = () => {
    if (!scoreSheetMatches.length) return alert('No hay partidas para generar planillas con el filtro seleccionado.');
    startPdfPrint({
      bodyClass: 'printing-score-sheets',
      title: `Planillas - ${championship.name || 'Campeonato'}`,
      pageSize: 'Letter',
      orientation: 'portrait',
      scale: '90',
      afterPrint: () => audit('SCORE_SHEETS_PDF', `Planillas generadas para ${scoreSheetMatches.length} partidas.`)
    });
  };

  const findMatchForUploadedFile = async (file, preferredMatchId = '') => {
    const code = detectMatchCodeFromFileName(file.name);
    if (code) {
      const found = matches.find((m) => matchCode(m) === code);
      if (found) return { match: found, code, method: 'AUTO_FILENAME' };
    }
    const qr = await detectMatchCodeFromQr(file);
    if (qr.matchId) {
      const foundById = matches.find((m) => m.match_id === qr.matchId);
      if (foundById) return { match: foundById, code: matchCode(foundById), method: 'AUTO_QR' };
    }
    if (qr.code) {
      const foundByQrCode = matches.find((m) => matchCode(m) === qr.code);
      if (foundByQrCode) return { match: foundByQrCode, code: qr.code, method: 'AUTO_QR' };
    }
    const manual = matches.find((m) => m.match_id === (preferredMatchId || manualUploadMatchId));
    return manual ? { match: manual, code: matchCode(manual), method: preferredMatchId ? 'MANUAL_MATCH_CARD' : 'MANUAL_ASSISTED' } : { match: null, code: code || qr.code || '', method: qr.method || 'UNASSOCIATED' };
  };

  const handleScoreSheetUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    let associated = 0;
    let unassociated = 0;
    for (const file of files) {
      const target = await findMatchForUploadedFile(file);
      if (!target.match) {
        unassociated += 1;
        continue;
      }
      const record = await saveScoreSheetAttachment({
        championshipId: championship.championship_id,
        match: target.match,
        matchCode: target.code,
        file,
        method: target.method,
        ocrStatus: 'OCR_MANUAL_REVIEW'
      });
      associated += 1;
      audit('SCORE_SHEET_UPLOADED', `${record.match_code} · ${record.file_name} · Método: ${record.association_method} · Lectura: ${record.ocr_status}`);
    }
    await refreshSheetAttachments();
    setUploadSummary(`${associated} archivo(s) asociado(s). ${unassociated} archivo(s) sin asociación automática/manual.`);
    event.target.value = '';
  };

  const removeScoreSheetAttachment = async (record) => {
    if (!window.confirm(`¿Eliminar planilla cargada ${record.file_name}?`)) return;
    await deleteScoreSheetAttachment(record.id);
    audit('SCORE_SHEET_DELETED', `${record.match_code} · ${record.file_name}`);
    await refreshSheetAttachments();
  };

  const attachmentsForMatch = (match) => sheetAttachments.filter((record) => record.match_id === match.match_id || record.match_code === matchCode(match));

  const handleMatchScoreSheetUpload = async (match, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const target = await findMatchForUploadedFile(file, match.match_id);
    const record = await saveScoreSheetAttachment({
      championshipId: championship.championship_id,
      match: target.match || match,
      matchCode: target.code || matchCode(match),
      file,
      method: target.method || 'MANUAL_MATCH_CARD',
      ocrStatus: target.method === 'AUTO_QR' ? 'QR_ASSOCIATED_REVIEW' : 'OCR_MANUAL_REVIEW'
    });
    audit('SCORE_SHEET_UPLOADED', `${record.match_code} · ${record.file_name} · Método: ${record.association_method} · Lectura: ${record.ocr_status}`);
    await refreshSheetAttachments();
    setUploadSummary(`Planilla asociada a ${record.match_code}: ${record.file_name}`);
    event.target.value = '';
  };

  const renderMatchScoreSheetControls = (match) => {
    const records = attachmentsForMatch(match);
    return E('div', { className: 'match-score-sheet-panel no-print' },
      E('div', { className: 'toolbar', style: { justifyContent: 'space-between' } },
        E('div', null, E('b', null, 'Planilla firmada'), E('div', { className: 'small' }, records.length ? `${records.length} archivo(s) asociado(s)` : 'Sin archivo cargado')),
        E('label', { className: 'btn soft score-sheet-inline-upload' }, 'Cargar archivo', E('input', { type: 'file', accept: 'image/*,.pdf,.txt,.csv,.json', onChange: (event) => handleMatchScoreSheetUpload(match, event) }))
      ),
      records.length ? E('div', { className: 'score-sheet-attachment-list' }, records.map((record) => E('div', { key: record.id, className: 'score-sheet-attachment-item' },
        E('a', { href: record.data_url, download: record.file_name, target: '_blank', rel: 'noreferrer' }, record.file_name),
        E(Badge, { kind: record.association_method === 'AUTO_QR' ? 'success' : 'neutral' }, record.association_method),
        E(Button, { kind: 'danger', onClick: () => removeScoreSheetAttachment(record) }, 'Eliminar')
      ))) : null
    );
  };

  const exportMatchesPdf = () => startPdfPrint({
    bodyClass: 'printing-matches',
    title: `Partidas - ${championship.name || 'Campeonato'}`,
    pageSize,
    orientation,
    scale,
    afterPrint: () => audit('MATCHES_PDF', 'PDF de partidas generado.')
  });

  return E('div', { className: 'grid matches-export-root' },
    E(Card, { className: 'matches-control-card' },
      E(SectionTitle, { title: 'Partidas · captura avanzada y guardado masivo', subtitle: 'Partidas en formato tabular mixto con filtros obligatorios, validación por fila, motivo de corrección y guardado masivo.' }),
      E('div', { className: 'grid grid-6', style: { marginTop: 14 } },
        E(Field, { label: 'Fase' }, E(Select, { value: filters.phase, onChange: (e) => setFilters({ ...filters, phase: e.target.value }) }, [E('option', { key: 'ALL' }, 'ALL')].concat(phaseOptions.map((x) => E('option', { key: x }, x))))),
        E(Field, { label: 'Ronda' }, E(Select, { value: filters.round, onChange: (e) => setFilters({ ...filters, round: e.target.value }) }, [E('option', { key: 'ALL', value: 'ALL' }, 'ALL')].concat(roundOptions.map((x) => E('option', { key: x, value: x }, roundDisplayName(x)))))),
        E(Field, { label: 'Grupo' }, E(Select, { value: filters.group, onChange: (e) => setFilters({ ...filters, group: e.target.value }) }, [E('option', { key: 'ALL' }, 'ALL')].concat(groupOptions.map((x) => E('option', { key: x }, x))))),
        E(Field, { label: 'Jugador' }, E(Select, { value: filters.player, onChange: (e) => setFilters({ ...filters, player: e.target.value }) }, [E('option', { key: 'ALL', value: 'ALL' }, 'ALL')].concat(playerOptions.map((p) => E('option', { key: p.player_id, value: p.player_id }, playerName(p)))))),
        E(Field, { label: 'Mesa' }, E(Select, { value: filters.table, onChange: (e) => setFilters({ ...filters, table: e.target.value }) }, [E('option', { key: 'ALL' }, 'ALL')].concat(tableOptions.map((x) => E('option', { key: x }, x))))),
        E(Field, { label: 'Fecha' }, E(Select, { value: filters.date, onChange: (e) => setFilters({ ...filters, date: e.target.value }) }, [E('option', { key: 'ALL' }, 'ALL')].concat(dateOptions.map((x) => E('option', { key: x, value: x }, formatDateEs(x)))))),
        E(Field, { label: 'Estado' }, E(Select, { value: filters.status, onChange: (e) => setFilters({ ...filters, status: e.target.value }) }, ['ALL', 'CREATED', 'PLANNED', 'COMPLETED', 'LOCKED'].map((x) => E('option', { key: x }, x)))),
        E(Field, { label: 'Conflicto/error' }, E(Select, { value: filters.conflict, onChange: (e) => setFilters({ ...filters, conflict: e.target.value }) }, E('option', { value: 'ALL' }, 'ALL'), E('option', { value: 'YES' }, 'Sí'), E('option', { value: 'NO' }, 'No'))),
        E(Field, { label: 'Motivo corrección' }, E(Input, { value: reason, onChange: (e) => setReason(e.target.value), placeholder: 'Obligatorio para correcciones' }))
      ),
      E('div', { className: 'toolbar', style: { marginTop: 14 } },
        E(Button, { onClick: selectVisible, kind: 'soft' }, 'Seleccionar vista'),
        E(Button, { onClick: clearSelected, kind: 'soft' }, 'Limpiar selección'),
        E(Button, { onClick: saveBulk, kind: 'success' }, `Guardar masivo (${selectedIds.length || filtered.length})`),
        E(Button, { onClick: () => { const capturable = (filtered.length ? filtered : matches).filter((m) => m.match_status !== 'PLANNED'); const updated = autoFillMatches(capturable, 'capture-demo'); setMatches(mergeById(matches, updated)); audit('DEMO_RESULTS', 'Resultados demo aplicados a la vista filtrada.'); }, kind: 'success' }, 'Autocompletar vista'),
        E(Button, { onClick: () => { setMatches(clearResults(matches)); audit('CLEAR_RESULTS', 'Resultados limpiados.'); }, kind: 'warning' }, 'Limpiar resultados'),
        E(Button, { onClick: exportMatchesPdf, kind: 'soft' }, 'Generar PDF')
      ),
      E(PdfControls, { pageSize, setPageSize, orientation, setOrientation, scale, setScale })
    ),
    E(Card, { className: 'score-sheets-control-card no-print' },
      E(SectionTitle, { title: 'Planillas físicas de partidas', subtitle: 'Genera planillas imprimibles, con QR/código de partida, y carga fotos/PDF firmados para respaldo documental.' }),
      E('div', { className: 'grid grid-4', style: { marginTop: 14 } },
        E(Field, { label: 'Planillas a generar' }, E(Select, { value: sheetMode, onChange: (e) => setSheetMode(e.target.value) },
          E('option', { value: 'VISIBLE' }, 'Vista filtrada'),
          E('option', { value: 'ALL' }, 'Todas las partidas'),
          E('option', { value: 'GROUPS' }, 'Solo fase de grupos'),
          E('option', { value: 'ELIMINATION' }, 'Solo eliminación'),
          E('option', { value: 'PENDING' }, 'Solo pendientes'),
          E('option', { value: 'SELECTED' }, 'Solo seleccionadas')
        )),
        E(Field, { label: 'Logo en planilla' }, E(Select, { value: sheetLogoMode, onChange: (e) => setSheetLogoMode(e.target.value) }, ['FECOBI', 'ASOBIGRIE', 'AMBOS', 'NINGUNO'].map((x) => E('option', { key: x, value: x }, x)))),
        E(Field, { label: 'Asociación manual si no hay código en archivo' }, E(Select, { value: manualUploadMatchId, onChange: (e) => setManualUploadMatchId(e.target.value) },
          E('option', { value: '' }, 'Sin asociación manual'),
          matches.map((m) => E('option', { key: m.match_id, value: m.match_id }, `${matchCode(m)} · ${m.group_name || matchRoundLabel(m)}`))
        )),
        E(Field, { label: 'Cargar planillas firmadas' }, E(Input, { type: 'file', multiple: true, accept: 'image/*,.pdf,.txt,.csv,.json', onChange: handleScoreSheetUpload }))
      ),
      E('div', { className: 'toolbar', style: { marginTop: 14 } },
        E(Button, { onClick: exportScoreSheetsPdf, kind: 'success' }, `Generar planillas PDF (${scoreSheetMatches.length})`),
        E(Badge, { kind: 'info' }, `${sheetAttachments.length} planillas cargadas`),
        E(Badge, { kind: 'neutral' }, 'Asociación automática por P-### / QR impreso')
      ),
      uploadSummary ? E('p', { className: 'small validation-card', style: { marginTop: 12 } }, uploadSummary) : null,
      sheetAttachments.length ? E('div', { className: 'table-wrap', style: { marginTop: 14, maxHeight: 220, overflowY: 'auto' } },
        E('table', null,
          E('thead', null, E('tr', null, ['Partida', 'Archivo', 'Método', 'Lectura/OCR', 'Acciones'].map((h) => E('th', { key: h }, h)))),
          E('tbody', null, sheetAttachments.map((record) => E('tr', { key: record.id },
            E('td', null, record.match_code || '-'),
            E('td', null, E('a', { href: record.data_url, download: record.file_name }, record.file_name)),
            E('td', null, record.association_method),
            E('td', null, record.ocr_status || 'PENDIENTE'),
            E('td', null, E(Button, { kind: 'danger', onClick: () => removeScoreSheetAttachment(record) }, 'Eliminar'))
          )))
        )
      ) : null
    ),
    E('div', { className: 'score-sheets-print-container' }, E(ScoreSheetsPrintDocument, { championship, matches: scoreSheetMatches, playerMap, logoMode: sheetLogoMode })),
    E('section', { className: 'matches-print-scope' },
      E(PdfDocument, { title: 'Reporte de Partidas', subtitle: 'Captura, estado y resultados de partidas visibles', championship, meta: [`Partidas visibles: ${filtered.length}`, `Total partidas: ${matches.length}`] },
      errorSummary.length ? E(Card, { className: 'validation-card' },
      E(SectionTitle, { title: 'Resumen de errores de validación', subtitle: 'El guardado masivo se bloquea hasta corregir todas las filas.' }),
      errorSummary.map((item) => E('p', { key: item.match.match_id }, `${matchCode(item.match)}: ${item.errors.join(' · ')}`))
    ) : null,
    filtered.length === 0 ? E(EmptyState, { title: 'Sin partidas', message: 'Genere grupos, bracket o cambie los filtros.' }) : E('div', { className: 'grid' },
      filtered.map((match) => E(Card, { key: match.match_id, className: match.match_status === 'COMPLETED' ? 'completed-row-card' : '' },
        E('div', { className: 'toolbar', style: { justifyContent: 'space-between' } },
          E('div', null,
            E('label', { className: 'small' }, E('input', { type: 'checkbox', checked: selectedIds.includes(match.match_id), onChange: () => toggleSelected(match.match_id) }), ' seleccionar'),
            E('h3', { style: { margin: 0 } }, `${matchCode(match)} · ${match.group_name || matchRoundLabel(match)}`),
            E('p', { className: 'small', style: { margin: '4px 0 0' } }, `${match.scheduled_date ? formatDateEs(match.scheduled_date) : 'Sin fecha'} ${match.scheduled_time || ''} · ${match.assigned_table || 'Sin mesa'} · ${matchDetailedScore(match, championship)}`)
          ),
          E(Badge, { kind: match.match_status === 'COMPLETED' ? 'success' : match.validation_error ? 'danger' : 'neutral' }, matchDisplayStatus(match))
        ),
        renderMatchScoreSheetControls(match),
        E('div', { className: 'grid grid-4', style: { marginTop: 10 } },
          E('div', { className: 'match-active-data-cell has-result-data match-result-admin-cell' }, E(Field, { label: 'Tipo resultado' }, E(Select, { disabled: match.match_status === 'PLANNED', value: match.match_result_type === 'PENALTIES' && ['GROUPS', 'GROUPS_F2'].includes(match.phase) ? 'NORMAL' : (match.match_result_type || 'NORMAL'), onChange: (e) => update(match.match_id, { match_result_type: e.target.value, penalties_p1: ['GROUPS', 'GROUPS_F2'].includes(match.phase) ? '' : match.penalties_p1, penalties_p2: ['GROUPS', 'GROUPS_F2'].includes(match.phase) ? '' : match.penalties_p2 }) }, (['GROUPS', 'GROUPS_F2'].includes(match.phase) ? ['NORMAL', 'WALKOVER', 'ADMINISTRATIVE_WIN', 'WITHDRAWAL'] : ['NORMAL', 'PENALTIES', 'WALKOVER', 'ADMINISTRATIVE_WIN', 'WITHDRAWAL']).map((x) => E('option', { key: x }, x))))),
          E('div', { className: 'match-active-data-cell has-result-data match-result-admin-cell' }, E(Field, { label: 'Ganador manual' }, E(Select, { disabled: match.match_status === 'PLANNED', value: match.winner_id || '', onChange: (e) => update(match.match_id, { winner_id: e.target.value }) }, E('option', { value: '' }, 'Auto'), E('option', { value: match.player1_id }, playerName(playerMap[match.player1_id])), E('option', { value: match.player2_id }, playerName(playerMap[match.player2_id]))))),
          E(Field, { label: 'Árbitro/Capturista' }, E(Input, { disabled: match.match_status === 'PLANNED', value: match.assigned_official || '', onChange: (e) => update(match.match_id, { assigned_official: e.target.value }), placeholder: 'Nombre' })),
          E('div', { className: 'toolbar', style: { alignItems: 'end' } }, E(Button, { onClick: () => saveOne(match), kind: 'success', disabled: match.match_status === 'PLANNED' }, match.match_status === 'PLANNED' ? 'Planificada' : 'Guardar'), E(Button, { onClick: () => reopen(match), kind: 'warning' }, 'Reabrir'))
        ),
        E('div', { className: 'table-wrap', style: { marginTop: 12 } }, E('table', null,
          E('thead', null, E('tr', null, (['GROUPS', 'GROUPS_F2'].includes(match.phase) ? (avgEnabled ? ['Jugador', 'Carambolas', 'Entradas', 'SM1', 'SM2', 'Promedio'] : ['Jugador', 'Carambolas', 'SM1', 'SM2']) : (avgEnabled ? ['Jugador', 'Carambolas', 'Entradas', 'SM1', 'SM2', 'Penales', 'Promedio'] : ['Jugador', 'Carambolas', 'SM1', 'SM2', 'Penales'])).map((h) => E('th', { key: h }, h)))),
          E('tbody', null, playerLine(match, 1), playerLine(match, 2))
        ))
      ))
    )
    )
    )
  );
}
