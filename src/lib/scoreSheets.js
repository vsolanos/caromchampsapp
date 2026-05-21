import jsQR from 'jsqr';
const DB_NAME = 'fecobi-score-sheets-v1';
const DB_VERSION = 1;
const STORE_NAME = 'attachments';

function openDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB no está disponible en este navegador.'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error('No fue posible abrir IndexedDB.'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('match_id', 'match_id', { unique: false });
        store.createIndex('championship_id', 'championship_id', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('No fue posible leer el archivo.'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function readTextIfPossible(file) {
  return new Promise((resolve) => {
    if (!file || !/text|csv|json|xml|html/i.test(file.type || '') && !/\.(txt|csv|json|xml|html)$/i.test(file.name || '')) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => resolve('');
    reader.onload = () => resolve(String(reader.result || '').slice(0, 4000));
    reader.readAsText(file);
  });
}


function imageFileToImageData(file) {
  return new Promise((resolve) => {
    if (!file || !/^image\//i.test(file.type || '')) { resolve(null); return; }
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(null);
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxSide = 1800;
          const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
          canvas.width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
          canvas.height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
        } catch {
          resolve(null);
        }
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

function matchCodeFromQrPayload(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return { code: '', matchId: '', raw: '' };
  try {
    const json = JSON.parse(raw);
    const code = json.code || json.match_code || '';
    return { code: normalizeMatchCode(code), matchId: json.match_id || '', raw };
  } catch {
    const found = detectMatchCodeFromFileName(raw);
    return { code: found, matchId: '', raw };
  }
}

function normalizeMatchCode(value = '') {
  const match = String(value || '').toUpperCase().match(/P[-_\s]?(\d{1,4})/);
  return match ? `P-${String(Number(match[1])).padStart(3, '0')}` : '';
}

export async function detectMatchCodeFromQr(file) {
  const imageData = await imageFileToImageData(file);
  if (!imageData) return { code: '', matchId: '', raw: '', method: 'QR_NOT_AVAILABLE' };
  try {
    const decoded = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
    if (!decoded?.data) return { code: '', matchId: '', raw: '', method: 'QR_NOT_FOUND' };
    const parsed = matchCodeFromQrPayload(decoded.data);
    return { ...parsed, method: parsed.code || parsed.matchId ? 'AUTO_QR' : 'QR_UNREADABLE_PAYLOAD' };
  } catch {
    return { code: '', matchId: '', raw: '', method: 'QR_ERROR' };
  }
}

export function detectMatchCodeFromFileName(filename = '') {
  const value = String(filename || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const match = value.match(/(?:^|[^A-Z0-9])P[-_\s]?(\d{1,4})(?:[^0-9]|$)/);
  return match ? `P-${String(Number(match[1])).padStart(3, '0')}` : '';
}

export function extractSheetTextHints(text = '') {
  const source = String(text || '');
  const caroms = [...source.matchAll(/(?:CAR|CARAMB\.?|CARAMBOLAS?)\D{0,8}(\d{1,3})/gi)].map((m) => Number(m[1]));
  const innings = [...source.matchAll(/(?:ENT|ENTRADAS?)\D{0,8}(\d{1,3})/gi)].map((m) => Number(m[1]));
  const series = [...source.matchAll(/(?:SERIE|SM1)\D{0,8}(\d{1,3})/gi)].map((m) => Number(m[1]));
  return { caroms, innings, series, hasTextHints: Boolean(caroms.length || innings.length || series.length) };
}

export async function saveScoreSheetAttachment({ championshipId, match, matchCode, file, method = 'AUTO_FILENAME', ocrStatus = 'PENDING' }) {
  const db = await openDb();
  const dataUrl = await fileToDataUrl(file);
  const text = await readTextIfPossible(file);
  const textHints = extractSheetTextHints(text);
  const now = new Date().toISOString();
  const record = {
    id: `${championshipId || 'CH'}::${match?.match_id || matchCode || 'SIN-PARTIDA'}::${Date.now()}::${file.name}`,
    championship_id: championshipId || '',
    match_id: match?.match_id || '',
    match_code: matchCode || '',
    file_name: file.name,
    file_type: file.type || 'application/octet-stream',
    file_size: file.size || 0,
    data_url: dataUrl,
    association_method: method,
    ocr_status: textHints.hasTextHints ? 'TEXT_HINTS_FOUND' : ocrStatus,
    ocr_hints: textHints,
    created_at: now
  };
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
    tx.objectStore(STORE_NAME).put(record);
  });
  db.close();
  return record;
}

export async function listScoreSheetAttachments(championshipId = '') {
  const db = await openDb();
  const rows = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
  db.close();
  return rows.filter((row) => !championshipId || row.championship_id === championshipId).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

export async function deleteScoreSheetAttachment(id) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
    tx.objectStore(STORE_NAME).delete(id);
  });
  db.close();
}
