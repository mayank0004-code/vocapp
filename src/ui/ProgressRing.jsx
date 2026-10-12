import React from 'react';

export function ProgressRing({
  current = 0,
  total = 12,
  size = 64,
  strokeWidth = 6,
  color = 'var(--acc)',
  trackColor = '#2A2A2E',
  showLabel = true,
  style = {}
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;
  // Always show a tiny pip when progress is 0 but starting
  const offset = circumference * (1 - (progress > 0 ? progress : 0.025));

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        ...style
      }}
      className="xring"
      aria-valuenow={current}
      aria-valuemax={total}
      role="progressbar"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)', display: 'block' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        />
      </svg>
      {showLabel && (
        <b
          className="num"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            fontSize: `${Math.round(size * 0.23)}px`,
            fontWeight: 600,
            color: 'var(--fg)'
          }}
        >
          {current}/{total}
        </b>
      )}
    </div>
  );
}

export default ProgressRing;
