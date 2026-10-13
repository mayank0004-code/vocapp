import React from 'react';

export function Skeleton({ width = '100%', height = '16px', borderRadius = '8px', style = {} }) {
  return (
    <i
      style={{
        display: 'block',
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #222226 0%, #2F2F34 40%, #222226 80%)',
        backgroundSize: '300% 100%',
        animation: 'shim 1.2s linear infinite',
        ...style
      }}
    />
  );
}

export function Empty({ children, message = 'Nothing here yet.', style = {} }) {
  return (
    <div
      style={{
        padding: '36px 20px',
        textAlign: 'center',
        color: 'var(--mute)',
        fontSize: '14.5px',
        lineHeight: 1.5,
        ...style
      }}
    >
      {message}
      {children}
    </div>
  );
}

export function LargeTitle({ kicker, title, rightElement = null, isSerif = false }) {
  return (
    <header
      style={{
        padding: 'calc(var(--sb) + 14px) 20px 8px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
        {kicker && (
          <small style={{ fontSize: '13px', color: 'var(--mute)', fontWeight: 500 }}>
            {kicker}
          </small>
        )}
        <h1
          style={{
            margin: 0,
            fontSize: isSerif ? '44px' : '34px',
            fontWeight: isSerif ? 400 : 700,
            letterSpacing: isSerif ? '-0.01em' : '-0.03em',
            lineHeight: 1.08,
            fontFamily: isSerif ? 'var(--serif)' : 'var(--sans)'
          }}
        >
          {title}
        </h1>
      </div>
      {rightElement && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          {rightElement}
        </div>
      )}
    </header>
  );
}
