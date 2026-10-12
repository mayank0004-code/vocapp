/**
 * Safe haptic vibration utility.
 * Triggers vibration only on intentional user commits (swipe grade, snap, lock, success).
 * Silently handles browsers/devices without vibration support or user gestures.
 */

export const haptic = (pattern = 10) => {
  try {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (_) {
    // Ignore permissions or environment restrictions silently
  }
};

export const haptics = {
  tap: () => haptic(4),
  switch: () => haptic(6),
  commit: () => haptic(10),
  success: () => haptic([10, 40, 20]),
  error: () => haptic([8, 40, 8]),
  lock: () => haptic([8, 40, 8]),
  remove: () => haptic(12),
};

export default haptics;
