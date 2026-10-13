import { useState, useEffect, useRef } from 'react';

/**
 * Hook to manage tab screen activation events.
 * Provides an incrementing key to retrigger choreographed micro-animations
 * whenever the user switches into this tab, while preserving independent scroll state.
 * 
 * @param {boolean} isActive - Whether this tab is currently the active tab
 * @returns {{ activationKey: number, isCurrent: boolean, hasActivated: boolean }}
 */
export function useTabActivation(isActive = true) {
  const [activationKey, setActivationKey] = useState(0);
  const [hasActivated, setHasActivated] = useState(isActive);
  const prevActiveRef = useRef(isActive);

  useEffect(() => {
    if (isActive && !prevActiveRef.current) {
      // Tab just became active from an inactive state
      setActivationKey(k => k + 1);
      setHasActivated(true);
    }
    prevActiveRef.current = isActive;
  }, [isActive]);

  return {
    activationKey,
    isCurrent: isActive,
    hasActivated: hasActivated || isActive
  };
}

export default useTabActivation;
