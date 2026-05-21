import React from 'react';

export const E = React.createElement;

export function Card({ children, className = '' }) {
  return E('section', { className: `card ${className}`.trim() }, children);
}

export function Button({ children, onClick, kind = 'primary', disabled = false, title = '' }) {
  return E('button', { type: 'button', title, disabled, onClick, className: `btn ${kind}` }, children);
}

export function Input(props) {
  return E('input', { ...props, className: `input ${props.className || ''}`.trim() });
}

export function Select({ value, onChange, children, disabled = false }) {
  return E('select', { value, onChange, disabled, className: 'input' }, children);
}

export function Field({ label, children, hint }) {
  return E('label', { className: 'field' },
    E('span', { className: 'field-label' }, label),
    children,
    hint ? E('span', { className: 'field-hint' }, hint) : null
  );
}

export function Stat({ label, value, hint }) {
  return E(Card, { className: 'stat' },
    E('div', { className: 'stat-label' }, label),
    E('div', { className: 'stat-value' }, value),
    hint ? E('div', { className: 'stat-hint' }, hint) : null
  );
}

export function Badge({ children, kind = 'neutral' }) {
  return E('span', { className: `badge ${kind}` }, children);
}

export function SectionTitle({ title, subtitle }) {
  return E('div', { className: 'section-title' },
    E('h2', null, title),
    subtitle ? E('p', null, subtitle) : null
  );
}

export function EmptyState({ title, message }) {
  return E('div', { className: 'empty' }, E('b', null, title), E('p', null, message));
}
