/**
 * Spring presets for framer-motion.
 *
 * RULE: damping >= 2 * sqrt(stiffness) for any preset that must NOT overshoot.
 * (Critical damping threshold, mass = 1.)
 *
 * Overshoot is EARNED. Only motion the user physically threw (sheet drag,
 * thrown card) may use an under-damped spring. Tapped things settle without bounce.
 *
 * Preset      Stiffness  Critical damping  Set damping  Ratio   Bouncy?
 * indicator   400        40               40           1.00    No  — tapped UI
 * reveal      300        34.6             35           1.01    No  — content arriving
 * sheet       260        32.2             26           0.81    Yes — drag earned it
 * thrown      200        28.3             20           0.71    Yes — flick earned it
 * press       —          —                —            —       No  — 100ms ease-out only
 */

export const springs = {
  // Tapped indicator (nav pill, toggles). No overshoot.
  indicator: { type: 'spring', stiffness: 400, damping: 40 },

  // Content or sheet revealing after a tap. No overshoot.
  reveal: { type: 'spring', stiffness: 300, damping: 35 },

  // Sheet/drawer dismissal — user dragged it, slight bounce is earned.
  sheet: { type: 'spring', stiffness: 260, damping: 26 },

  // Thrown card — user physically flicked it, overshoot is earned.
  thrown: { type: 'spring', stiffness: 200, damping: 20 },
};

// Press feedback — not a spring. A button that wobbles under a finger is
// worse than one that doesn't. Apply via CSS: transition: transform 100ms ease-out
export const pressCss = 'transform 100ms ease-out';

/**
 * Apple-style momentum projection.
 * Returns the projected resting distance from a release point.
 * Use to decide the snap target, then hand off releaseVelocity to the spring.
 *
 * @param {number} initialVelocity  px/s at release
 * @param {number} decelerationRate default 0.998 (scroll-feel)
 */
export function project(initialVelocity, decelerationRate = 0.998) {
  return (initialVelocity / 1000) * decelerationRate / (1 - decelerationRate);
}
