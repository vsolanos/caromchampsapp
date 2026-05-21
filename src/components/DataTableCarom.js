import React, { useMemo, useState } from 'react';
import { E, Button, Input } from './ui.js';

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function cellValue(row, column) {
  if (typeof column.accessor === 'function') return column.accessor(row);
  if (column.key) return row?.[column.key];
  return '';
}

export function DataTableCarom({
  columns = [],
  rows = [],
  title = '',
  subtitle = '',
  initialDensity = 'comfortable',
  searchable = true,
  exportable = true,
  emptyMessage = 'Sin datos para mostrar.'
}) {
  const [query, setQuery] = useState('');
  const [density, setDensity] = useState(initialDensity === 'compact' ? 'compact' : 'comfortable');
  const [sort, setSort] = useState({ key: '', direction: 'asc' });

  const filteredRows = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    const sourceRows = Array.isArray(rows) ? rows : [];
    const filtered = normalizedQuery
      ? sourceRows.filter((row) => columns.some((column) => normalizeText(cellValue(row, column)).includes(normalizedQuery)))
      : sourceRows;
    if (!sort.key) return filtered;
    const column = columns.find((item) => item.key === sort.key);
    if (!column) return filtered;
    return [...filtered].sort((a, b) => {
      const av = cellValue(a, column);
      const bv = cellValue(b, column);
      const an = Number(av);
      const bn = Number(bv);
      const result = Number.isFinite(an) && Number.isFinite(bn)
        ? an - bn
        : String(av ?? '').localeCompare(String(bv ?? ''), 'es', { numeric: true, sensitivity: 'base' });
      return sort.direction === 'asc' ? result : -result;
    });
  }, [rows, columns, query, sort]);

  const toggleSort = (key) => {
    if (!key) return;
    setSort((current) => current.key === key
      ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' });
  };

  const exportCsv = () => {
    const header = columns.map((column) => column.label || column.key || '').join(',');
    const lines = filteredRows.map((row) => columns.map((column) => {
      const value = cellValue(row, column);
      return `"${String(value ?? '').replace(/"/g, '""')}"`;
    }).join(','));
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title || 'caromchamps-tabla'}.csv`.replace(/\s+/g, '-').toLowerCase();
    link.click();
    URL.revokeObjectURL(url);
  };

  return E('section', { className: `data-table-carom data-density-${density}` },
    E('div', { className: 'data-table-toolbar' },
      E('div', null,
        title ? E('h3', null, title) : null,
        subtitle ? E('p', { className: 'small' }, subtitle) : null
      ),
      E('div', { className: 'toolbar' },
        searchable ? E(Input, { value: query, onChange: (event) => setQuery(event.target.value), placeholder: 'Buscar en tabla...' }) : null,
        E(Button, { kind: 'soft', onClick: () => setDensity(density === 'compact' ? 'comfortable' : 'compact') }, density === 'compact' ? 'Modo cómodo' : 'Modo compacto'),
        exportable ? E(Button, { kind: 'soft', onClick: exportCsv, disabled: !filteredRows.length }, 'CSV') : null
      )
    ),
    E('div', { className: 'data-table-wrap' },
      E('table', { className: 'data-table-carom-table' },
        E('thead', null, E('tr', null, columns.map((column) => E('th', { key: column.key || column.label, onClick: () => column.sortable !== false && toggleSort(column.key), className: column.sticky ? 'sticky-col' : '' },
          column.label || column.key,
          sort.key === column.key ? E('span', { className: 'sort-indicator' }, sort.direction === 'asc' ? ' ▲' : ' ▼') : null
        )))),
        E('tbody', null,
          filteredRows.length
            ? filteredRows.map((row, rowIndex) => E('tr', { key: row.id || row.player_id || row.match_id || rowIndex }, columns.map((column) => E('td', { key: column.key || column.label, className: column.sticky ? 'sticky-col' : '' },
              column.render ? column.render(row, rowIndex) : cellValue(row, column)
            ))))
            : E('tr', null, E('td', { colSpan: columns.length || 1, className: 'data-table-empty' }, emptyMessage))
        )
      )
    )
  );
}
