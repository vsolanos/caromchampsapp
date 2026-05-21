import { E, Card, Select, Field, SectionTitle, Badge, Button } from '../components/ui.js';
import { matchCode, matchDisplayStatus, matchRoundLabel, playerName } from '../lib/tournament.js';

export function OfficialsModule({ championship, setChampionship, players, matches = [] }) {
  const patch = (key, value) => setChampionship({ ...championship, [key]: value });
  const active = championship.use_match_officials;
  const candidates = players.filter((p) => p.status === 'ACTIVO').slice(0, 10);
  const pending = matches.filter((m) => m.match_status !== 'COMPLETED');
  const completed = matches.filter((m) => m.match_status === 'COMPLETED');
  const sampleAssignments = pending.slice(0, 8).map((m, index) => ({ match: m, official: candidates[index % Math.max(candidates.length, 1)] }));

  return E('div', { className: 'grid' },
    E('div', { className: 'grid grid-4' },
      E(Card, { className: 'stat' }, E('div', { className: 'stat-label' }, 'Función'), E('div', { className: 'stat-value' }, active ? 'Activa' : 'Inactiva')),
      E(Card, { className: 'stat' }, E('div', { className: 'stat-label' }, 'Pendientes'), E('div', { className: 'stat-value' }, pending.length)),
      E(Card, { className: 'stat' }, E('div', { className: 'stat-label' }, 'Finalizadas'), E('div', { className: 'stat-value' }, completed.length)),
      E(Card, { className: 'stat' }, E('div', { className: 'stat-label' }, 'Candidatos'), E('div', { className: 'stat-value' }, candidates.length))
    ),
    E(Card, null,
      E(SectionTitle, { title: 'Árbitro / Capturista', subtitle: 'Configuración operacional para captura delegada por campeonato.' }),
      E('div', { className: 'grid grid-3', style: { marginTop: 14 } },
        E(Field, { label: 'Activar función' }, E(Select, { value: active ? 'SI' : 'NO', onChange: (e) => patch('use_match_officials', e.target.value === 'SI') }, E('option', null, 'NO'), E('option', null, 'SI'))),
        E(Field, { label: 'Alcance' }, E(Select, { value: championship.official_capture_scope, onChange: (e) => patch('official_capture_scope', e.target.value) }, ['ASSIGNED_MATCHES', 'ALL_MATCHES_READ_ONLY', 'ALL_MATCHES_CAPTURE'].map((x) => E('option', { key: x }, x)))),
        E(Field, { label: 'Validación administrativa' }, E(Select, { value: championship.official_requires_admin_validation ? 'SI' : 'NO', onChange: (e) => patch('official_requires_admin_validation', e.target.value === 'SI') }, E('option', null, 'NO'), E('option', null, 'SI')))
      ),
      E('div', { className: 'toolbar', style: { marginTop: 14 } },
        E(Button, { kind: active ? 'warning' : 'success', onClick: () => patch('use_match_officials', !active) }, active ? 'Desactivar árbitros' : 'Activar árbitros')
      )
    ),
    E(Card, null,
      E(SectionTitle, { title: 'Matriz de permisos', subtitle: 'Resumen visible para el usuario operativo.' }),
      E('div', { className: 'table-wrap', style: { marginTop: 12 } }, E('table', null,
        E('thead', null, E('tr', null, ['Capacidad', 'Permiso'].map((h) => E('th', { key: h }, h)))),
        E('tbody', null,
          [['Ver calendario', 'Sí'], ['Capturar partidas asignadas', active ? 'Sí' : 'No aplica'], ['Editar no asignadas', championship.official_capture_scope === 'ALL_MATCHES_CAPTURE' ? 'Sí' : 'No'], ['Cerrar grupos', 'No'], ['Generar bracket', 'No'], ['Completar campeonato', 'No'], ['Editar partidas bloqueadas', 'No, salvo permiso extraordinario']].map(([cap, perm]) => E('tr', { key: cap }, E('td', null, cap), E('td', null, perm)))
        )
      ))
    ),
    E(Card, null,
      E(SectionTitle, { title: 'Asignación demo de partidas pendientes', subtitle: 'Vista preliminar para validar UX; la persistencia avanzada puede quedar para backend.' }),
      sampleAssignments.length === 0 ? E('p', { className: 'small' }, 'No hay partidas pendientes por asignar.') : E('div', { className: 'table-wrap', style: { marginTop: 12 } }, E('table', null,
        E('thead', null, E('tr', null, ['ID', 'Ronda/Grupo', 'Estado', 'Árbitro sugerido'].map((h) => E('th', { key: h }, h)))),
        E('tbody', null, sampleAssignments.map(({ match, official }) => E('tr', { key: match.match_id },
          E('td', null, matchCode(match)),
          E('td', null, match.group_name || matchRoundLabel(match)),
          E('td', null, E(Badge, { kind: match.match_status === 'COMPLETED' ? 'success' : 'neutral' }, matchDisplayStatus(match))),
          E('td', null, official ? playerName(official) : 'Sin candidato')
        )))
      ))
    )
  );
}
