import React from 'react';
import { E, Field, Select } from './ui.js';
import { PDF_ORIENTATIONS, PDF_PAGE_SIZES, PDF_SCALE_OPTIONS } from '../lib/print.js';
import { formatDateEs, formatDateTimeEs } from '../lib/tournament.js';

export function PdfControls({ pageSize, setPageSize, orientation, setOrientation, scale, setScale }) {
  return E('div', { className: 'pdf-controls' },
    E(Field, { label: 'Tamaño PDF' }, E(Select, { value: pageSize, onChange: (e) => setPageSize(e.target.value) }, PDF_PAGE_SIZES.map((s) => E('option', { key: s, value: s }, s)))),
    E(Field, { label: 'Orientación' }, E(Select, { value: orientation, onChange: (e) => setOrientation(e.target.value) }, PDF_ORIENTATIONS.map((o) => E('option', { key: o.value, value: o.value }, o.label)))),
    E(Field, { label: 'Sizing' }, E(Select, { value: scale, onChange: (e) => setScale(e.target.value) }, PDF_SCALE_OPTIONS.map((s) => E('option', { key: s.value, value: s.value }, s.label))))
  );
}

export function PdfHeader({ title, subtitle, championship = {}, meta = [] }) {
  const date = formatDateTimeEs(new Date());
  return E(React.Fragment, null,
    E('header', { className: 'pdf-print-header' },
      E('div', { className: 'pdf-brand-row' },
        E('img', { className: 'pdf-logo primary', src: '/assets/asobigrie-logo.jpg', alt: 'ASOBIGRIE' }),
        E('div', { className: 'pdf-title-block' },
          E('p', { className: 'pdf-kicker' }, 'ASOBIGRIE · Asociación de Billar Griega'),
          E('h1', null, title),
          E('p', null, subtitle || championship.name || 'Control de Campeonatos'),
          E('div', { className: 'pdf-meta-row' },
            E('span', null, championship.name || 'Campeonato'),
            championship.venue_name ? E('span', null, `Sede: ${championship.venue_name}`) : null,
            championship.technical_director_name ? E('span', null, `Director Técnico: ${championship.technical_director_name}`) : null,
            championship.representative1_name ? E('span', null, `Rep. 1: ${championship.representative1_name}`) : null,
            championship.representative2_name ? E('span', null, `Rep. 2: ${championship.representative2_name}`) : null,
            championship.start_date || championship.end_date ? E('span', null, `Fechas: ${formatDateEs(championship.start_date)} / ${formatDateEs(championship.end_date)}`) : null,
            E('span', null, `Emitido: ${date}`),
            ...meta.filter(Boolean).map((item, index) => E('span', { key: index }, item))
          )
        ),
        E('img', { className: 'pdf-logo secondary', src: '/assets/fecobi-logo.jpg', alt: 'FECOBI' })
      )
    )
  );
}


export function PdfDocument({ title, subtitle, championship = {}, meta = [], children }) {
  return E('table', { className: 'pdf-page-table' },
    E('thead', { className: 'pdf-page-thead' },
      E('tr', null,
        E('td', null, E(PdfHeader, { title, subtitle, championship, meta }))
      )
    ),
    E('tbody', { className: 'pdf-page-tbody' },
      E('tr', null,
        E('td', null, children)
      )
    )
  );
}
