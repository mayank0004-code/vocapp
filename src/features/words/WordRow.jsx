import React from 'react';
import { m } from 'framer-motion';
import StrengthBars from '../../ui/StrengthBars';
import { getWordStrength, isWordDue, nextReviewLabel, savedLabel } from './wordStatus';
import { safeStr } from './wordFormat';

export function WordRow({
  word, // Firestore vocabulary doc: { word, definition, interval, nextReviewDate, createdAt, status }
  index = 0,
  onClick,
  isCrafted = false,
  style = {}
}) {
  const isSaved = word.status === 'pending';
  const headword = word.word || '';
  const definition = safeStr(word.definition);

  const strength = getWordStrength(word);
  const isDue = !isSaved && isWordDue(word);
  const statusLabel = isSaved ? savedLabel(word) : nextReviewLabel(word.nextReviewDate);
  const isHot = isDue || (isSaved && statusLabel.startsWith('Expires'));

  return (
    <m.div
      whileTap={{ scale: 0.985, backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
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
        '--i': Math.min(index, 10),
        ...style
      }}
      className={`wrow ${index < 10 ? 'rise' : ''}`}
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
            {statusLabel}
          </span>
          {isCrafted && (
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
        <StrengthBars strength={strength} animate={index < 4} />
      )}
    </m.div>
  );
}

export default WordRow;
