import React, { useState, useEffect } from 'react';

export function ProgressRing({
  current = 0,
  total = 12,
  size = 64,
  strokeWidth = 6,
  color = 'var(--acc)',
  trackColor = '#2A2A2E',
  showLabel = true,
  animate = true,
  activationKey = 0,
  style = {}
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;
  
  // Target offset for completed proportion
  const targetOffset = circumference * (1 - (progress > 0 ? progress : 0.025));

  // State to animate stroke from 0% on initial mount / tab activation
  const [strokeOffset, setStrokeOffset] = useState(animate ? circumference : targetOffset);

  useEffect(() => {
    if (!animate) {
      setStrokeOffset(targetOffset);
      return;
    }

    // Momentarily start from 0 progress (full circumference) then draw
    setStrokeOffset(circumference);
    const timer = setTimeout(() => {
      setStrokeOffset(targetOffset);
    }, 40);

    return () => clearTimeout(timer);
  }, [current, total, animate, activationKey, targetOffset, circumference]);

  return (
    <div
      key={activationKey}
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        ...style
      }}
      className={`xring ${animate ? 'ring-pop' : ''}`}
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
          strokeDashoffset={strokeOffset}
          style={{
            transition: 'stroke-dashoffset 0.85s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
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
