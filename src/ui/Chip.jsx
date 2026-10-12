import React from 'react';
import { m } from 'framer-motion';

export function Chip({
  variant = 'streak', // 'streak' | 'xp' | 'xp-neg'
  children,
  onClick,
  className = '',
  style = {},
  ...props
}) {
  const getStyles = () => {
    switch (variant) {
      case 'streak':
        return { background: 'var(--warnbg)', color: 'var(--warn)', fontSize: '15px' };
      case 'xp':
        return { background: 'var(--accbg)', color: 'var(--acc3)', fontSize: '13.5px' };
      case 'xp-neg':
        return { background: 'var(--orgbg)', color: 'var(--org2)', fontSize: '13.5px' };
      default:
        return { background: 'var(--card2)', color: 'var(--fg)', fontSize: '14px' };
    }
  };

  return (
    <m.button
      whileTap={onClick ? { scale: 0.96 } : undefined}
      onClick={onClick}
      style={{
        height: '36px',
        padding: '0 12px',
        borderRadius: '18px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        cursor: onClick ? 'pointer' : 'default',
        ...getStyles(),
        ...style
      }}
      className={`chip ${className}`}
      {...props}
    >
      {variant === 'streak' && (
        <svg
          className="flame"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          style={{
            transformOrigin: '50% 85%',
            animation: 'flick 1.7s ease-in-out infinite'
          }}
        >
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      )}
      {children}
    </m.button>
  );
}

export default Chip;
