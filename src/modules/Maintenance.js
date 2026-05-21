import { E, Card, Button, SectionTitle } from '../components/ui.js';

export function MaintenanceModule({ championship, setChampionship }) {
  const toggleTable = (tableId) => setChampionship({
    ...championship,
    tables: championship.tables.map((t) => (t.table_id === tableId ? { ...t, is_active: !t.is_active } : t))
  });
  const addTable = () => {
    const next = championship.tables.length + 1;
    setChampionship({ ...championship, tables: [...championship.tables, { table_id: `T-${next}`, table_number: next, display_name: `Mesa ${next}`, is_active: true }] });
  };
  const addDay = () => {
    const next = championship.schedule_days.length + 1;
    const playDate = `2026-05-${String(10 + next).padStart(2, '0')}`;
    setChampionship({ ...championship, schedule_days: [...championship.schedule_days, { schedule_day_id: `D-${next}`, play_date: playDate, daily_start_time: '08:00', daily_end_time: '20:00' }] });
  };
  return E('div', { className: 'grid' },
    E(Card, null,
      E(SectionTitle, { title: 'Mantenimiento de mesas', subtitle: 'Active, desactive o agregue mesas para calendarización.' }),
      E('div', { className: 'toolbar', style: { marginTop: 14 } },
        E(Button, { onClick: addTable, kind: 'success' }, 'Agregar mesa'),
        championship.tables.map((t) => E(Button, { key: t.table_id, onClick: () => toggleTable(t.table_id), kind: t.is_active ? 'success' : 'soft' }, `${t.display_name}: ${t.is_active ? 'Activa' : 'Inactiva'}`))
      )
    ),
    E(Card, null,
      E(SectionTitle, { title: 'Días de juego', subtitle: 'Días disponibles para agenda automática.' }),
      E('div', { className: 'toolbar', style: { marginTop: 14 } },
        E(Button, { onClick: addDay, kind: 'success' }, 'Agregar día'),
        championship.schedule_days.map((d) => E('span', { key: d.schedule_day_id || d.play_date, className: 'badge neutral' }, d.play_date))
      )
    )
  );
}
