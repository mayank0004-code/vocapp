import React from 'react';

// Normalisers ported from the classic WordSheet so AI responses of any
// shape render the same way in both UIs.
export function safeStr(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    return val.text || val.meaning || val.definition || val.example || Object.values(val).filter(v => typeof v === 'string').join(' ') || '';
  }
  return String(val);
}

export function toCollocations(raw) {
  const list = Array.isArray(raw)
    ? raw
    : (typeof raw === 'string' && raw.trim()) ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
  return list.map(col => (typeof col === 'string'
    ? col
    : (col && typeof col === 'object')
      ? (col.collocation || col.phrase || col.text || Object.values(col).find(v => typeof v === 'string') || JSON.stringify(col))
      : String(col)));
}

export function toCommonMistakes(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) return [raw];
  if (raw && typeof raw === 'object') return [raw];
  return [];
}

export function renderMistake(m) {
  if (typeof m === 'string') return m;
  if (m && typeof m === 'object') {
    const title = m.mistake || m.misuse || m.error;
    const desc = m.explanation || m.correction || m.fix;
    if (title) {
      return (
        <>
          <strong style={{ color: 'var(--fg)', fontWeight: 600 }}>{title}</strong>
          {desc ? `: ${desc}` : ''}
        </>
      );
    }
    return Object.values(m).filter(v => typeof v === 'string').join(' — ') || JSON.stringify(m);
  }
  return String(m || '');
}
