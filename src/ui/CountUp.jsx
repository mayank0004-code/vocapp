import React, { useEffect, useRef } from 'react';

/**
 * High-performance direct-DOM tabular numeric counter.
 * Interpolates from start (default 0) to value using Apple ease-out cubic
 * directly via ref.textContent, bypassing React component re-renders completely.
 */
export function CountUp({
  value = 0,
  start = 0,
  duration = 750,
  suffix = '',
  prefix = '',
  enabled = true,
  className = '',
  style = {}
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targetNum = Number(value) || 0;

    if (!enabled || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      el.textContent = `${prefix}${targetNum.toLocaleString('en-GB')}${suffix}`;
      return;
    }

    let startTimestamp = null;
    let animId = null;
    const fromNum = Number(start) || 0;

    if (fromNum === targetNum) {
      el.textContent = `${prefix}${targetNum.toLocaleString('en-GB')}${suffix}`;
      return;
    }

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(fromNum + (targetNum - fromNum) * ease);
      el.textContent = `${prefix}${current.toLocaleString('en-GB')}${suffix}`;

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        el.textContent = `${prefix}${targetNum.toLocaleString('en-GB')}${suffix}`;
      }
    };

    animId = requestAnimationFrame(step);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [value, start, duration, enabled, prefix, suffix]);

  return (
    <span ref={ref} className={className} style={style}>
      {prefix}{enabled ? start : value}{suffix}
    </span>
  );
}

export default CountUp;
