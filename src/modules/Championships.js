import { E, Card, Button, Input, Field, SectionTitle, Badge, EmptyState } from '../components/ui.js';
import { uid, makeChampionshipSnapshot, formatDateEs } from '../lib/tournament.js';

export function ChampionshipsModule({ championships, activeId, loadChampionship, createChampionship, duplicateChampionship, deleteChampionship, championship, groups, matches, seeds, shareChampionship }) {
  const currentSnapshot = makeChampionshipSnapshot(championship, groups, matches, seeds);
  const rows = championships.length ? championships : [currentSnapshot];
  return E('div', { className: 'grid' },
    E(Card, null,
      E(SectionTitle, { title: 'Gestión de campeonatos múltiples', subtitle: 'Crear, duplicar, cambiar o archivar campeonatos sin mezclar grupos, partidas ni reportes.' }),
      E('div', { className: 'toolbar', style: { marginTop: 14 } },
        E(Button, { onClick: createChampionship, kind: 'success' }, 'Crear campeonato nuevo'),
        E(Button, { onClick: duplicateChampionship, kind: 'soft' }, 'Duplicar campeonato activo')
      )
    ),
    rows.length === 0 ? E(EmptyState, { title: 'Sin campeonatos', message: 'Cree el primer campeonato.' }) : E(Card, null,
      E('div', { className: 'table-wrap' }, E('table', null,
        E('thead', null, E('tr', null, ['Activo', 'Campeonato', 'Estado', 'Fechas', 'Grupos', 'Partidas', 'Clasificados', 'Actualizado', 'Acciones'].map((h) => E('th', { key: h }, h)))),
        E('tbody', null, rows.map((row) => E('tr', { key: row.id, className: row.id === activeId ? 'selected-row' : '' },
          E('td', null, row.id === activeId ? E(Badge, { kind: 'success' }, 'Activo') : '-'),
          E('td', null, E('b', null, row.name), E('div', { className: 'small' }, row.id)),
          E('td', null, E(Badge, { kind: row.status === 'COMPLETED' ? 'success' : row.status === 'FINALIZED' ? 'info' : 'neutral' }, row.status || '-')),
          E('td', null, `${formatDateEs(row.start_date)} / ${formatDateEs(row.end_date)}`),
          E('td', null, row.groups?.length || 0),
          E('td', null, row.matches?.length || 0),
          E('td', null, row.seeds?.length || 0),
          E('td', null, row.updated_at || '-'),
          E('td', null, E('div', { className: 'toolbar' },
            E(Button, { onClick: () => loadChampionship(row.id), kind: 'soft', disabled: row.id === activeId }, 'Abrir'),
            E(Button, { onClick: () => shareChampionship?.(row.id), kind: 'success' }, 'Compartir link'),
            E(Button, { onClick: () => deleteChampionship(row.id), kind: 'danger', disabled: row.id === activeId }, 'Eliminar')
          ))
        )))
      ))
    )
  );
}
