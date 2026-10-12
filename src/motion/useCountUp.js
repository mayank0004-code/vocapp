import { useState, useEffect, useRef } from 'react';

/**
 * High-performance tabular numeric counter hook.
 * Interpolates from startValue (default 0) to targetValue using Apple-style ease-out cubic.
 * 
 * @param {number} targetValue - Destination number to animate to
 * @param {object} options
 * @param {number} options.duration - Animation duration in ms (default 750ms)
 * @param {boolean} options.enabled - Whether animation is active (e.g. when tab is active)
 * @param {number} options.startValue - Starting number (default 0)
 * @returns {number} displayValue - Current animated integer
 */
export function useCountUp(targetValue = 0, { duration = 750, enabled = true, startValue = 0 } = {}) {
  const [displayValue, setDisplayValue] = useState(enabled ? startValue : targetValue);
  const targetRef = useRef(targetValue);
  targetRef.current = targetValue;

  useEffect(() => {
    if (!enabled) {
      setDisplayValue(targetRef.current);
      return;
    }

    // Check for prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(targetRef.current);
      return;
    }

    let startTimestamp = null;
    let animId = null;
    const start = startValue;
    const end = Number(targetRef.current) || 0;

    if (start === end) {
      setDisplayValue(end);
      return;
    }

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);

      // Apple ease-out cubic: 1 - (1 - t)^3
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * ease);
      setDisplayValue(current);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setDisplayValue(end);
      }
    };

    animId = requestAnimationFrame(step);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [targetValue, enabled, duration, startValue]);

  return displayValue;
}

export default useCountUp;
