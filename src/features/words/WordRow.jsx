import React from 'react';
import { m } from 'framer-motion';
import StrengthBars from '../../ui/StrengthBars';

export function WordRow({
  word, // { word, short, definition, due, isDue, hot, crafted, interval, status }
  onClick,
  style = {}
}) {
  const isSaved = word.status === 'pending';
  const headword = word.word || '';
  const definition = word.short || word.definition || '';

  // Interval strength mapping: interval 1 -> 1, 3 -> 2, 7 -> 3, 14+ -> 4
  const getIntervalStrength = (interval) => {
    if (!interval || interval <= 1) return 1;
    if (interval <= 3) return 2;
    if (interval <= 7) return 3;
    return 4;
  };

  const strength = isSaved ? 0 : getIntervalStrength(word.interval);
  const isHot = word.isDue || word.isExpiringSoon || word.dueLabel?.includes('Expires');

  return (
    <m.div
      whileTap={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '13px 16px',
        borderTop: '0.5px solid var(--line)',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        transition: 'background 0.2s ease',
        ...style
      }}
      className="wrow"
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
          <span className="serif" style={{ fontSize: '20px', fontWeight: 500, color: 'var(--fg)' }}>
            {headword}
          </span>
          <span
            style={{
              fontSize: '12.5px',
              color: isHot ? 'var(--org2)' : 'var(--mute)',
              fontWeight: isHot ? 600 : 400
            }}
          >
            {word.dueLabel || (word.isDue ? 'Due now' : word.interval ? `in ${word.interval}d` : '')}
          </span>
          {word.crafted && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 7px',
                borderRadius: '7px',
                background: 'var(--accbg)',
                color: 'var(--acc2)'
              }}
            >
              Crafted
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: '13.5px',
            color: 'var(--fg3)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginTop: '2px'
          }}
        >
          {definition}
        </div>
      </div>

      {!isSaved && (
        <StrengthBars strength={strength} />
      )}
    </m.div>
  );
}

export default WordRow;
