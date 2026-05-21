import { E, Card, EmptyState, SectionTitle } from '../components/ui.js';

export function AuditModule({ items }) {
  return E(Card, null,
    E(SectionTitle, { title: 'Auditoría', subtitle: 'Eventos principales realizados durante la prueba.' }),
    items.length === 0 ? E(EmptyState, { title: 'Sin eventos', message: 'Las acciones relevantes aparecerán aquí.' }) : null,
    items.map((item) => E('p', { key: item.id, className: 'round-card' }, `${item.type}: ${item.detail}`))
  );
}
