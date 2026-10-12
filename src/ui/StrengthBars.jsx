import React from 'react';

const STRENGTH_LABELS = [
  'Not practised yet',
  'Weak',
  'Getting there',
  'Strong',
  'Mastered'
];

export function StrengthBars({
  strength = 0, // 0 to 4
  big = false,
  style = {}
}) {
  const s = Math.min(4, Math.max(0, strength));
  const label = STRENGTH_LABELS[s] || STRENGTH_LABELS[0];

  return (
    <span
      style={{
        display: 'inline-flex',
        gap: big ? '4px' : '3px',
        alignItems: 'flex-end',
        flexShrink: 0,
        ...style
      }}
      className={`str ${big ? 'big' : ''}`}
      aria-label={`Memory strength: ${label}`}
      role="img"
    >
      {[1, 2, 3, 4].map((barIndex) => {
        const isFilled = barIndex <= s;
        const height = big ? 6 + barIndex * 6 : 4 + barIndex * 3;
        const width = big ? 8 : 4;

        return (
          <i
            key={barIndex}
            style={{
              width: `${width}px`,
              height: `${height}px`,
              borderRadius: big ? '3px' : '2px',
              background: isFilled ? 'var(--acc)' : '#2E2E33',
              display: 'block',
              transition: 'background 0.25s ease'
            }}
          />
        );
      })}
    </span>
  );
}

export default StrengthBars;
