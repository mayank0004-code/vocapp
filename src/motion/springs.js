/**
 * Spring physics parameters and helpers for Vocapp Motion.
 *
 * Physics formula:
 *   k = (2 * PI / response)^2
 *   c = (4 * PI * damping) / response
 */

export function springFromResponse(response, dampingRatio = 1.0) {
  const stiffness = Math.pow((2 * Math.PI) / response, 2);
  const damping = (4 * Math.PI * dampingRatio) / response;
  return { type: 'spring', stiffness, damping, mass: 1 };
}

export const springs = {
  // Tapped UI (Tab indicator, skill highlight): response 0.42s, damping 0.86
  indicator: { type: 'spring', stiffness: 224, damping: 26 },
  tapped:    { type: 'spring', stiffness: 224, damping: 26 },

  // Content, Pager snap, Page push: response 0.40s, damping 1.0 (critically damped)
  content:   { type: 'spring', stiffness: 247, damping: 31 },
  reveal:    { type: 'spring', stiffness: 247, damping: 31 },

  // Bottom sheets: response 0.34s, damping 0.88
  sheet:     { type: 'spring', stiffness: 342, damping: 33 },

  // Thrown / Card fly-off: response 0.32s, damping 1.0 with release velocity
  thrown:    { type: 'spring', stiffness: 386, damping: 39 },

  // Spring back after short drag: response 0.40s, damping 0.68
  springBack:{ type: 'spring', stiffness: 247, damping: 21 },

  // Bouncy micro-pop for rings, badges, checks: response 0.30s, damping 0.72
  pop:       { type: 'spring', stiffness: 360, damping: 22, mass: 0.8 },
  snappy:    { type: 'spring', stiffness: 320, damping: 28 },
};

export const pressCss = 'transform 140ms cubic-bezier(0.2, 0.8, 0.2, 1)';

/**
 * Apple-style momentum projection.
 * Returns the projected resting distance from a release point.
 *
 * @param {number} initialVelocity px/s at release
 * @param {number} decelerationRate default 0.998 (scroll-feel)
 */
export function project(initialVelocity, decelerationRate = 0.998) {
  return (initialVelocity / 1000) * decelerationRate / (1 - decelerationRate);
}

/**
 * Apple-style rubber-banding formula for touch boundaries.
 *
 * @param {number} distance Over-drag distance in pixels
 * @param {number} dimension Viewport/element dimension
 * @param {number} coefficient Tension coefficient (default 0.55)
 */
export function rubber(distance, dimension = 350, coefficient = 0.55) {
  return (distance * dimension * coefficient) / (dimension + coefficient * distance);
}

/**
 * Velocity tracker for drag gestures.
 */
export class VelocityTracker {
  constructor() {
    this.history = [];
  }

  add(x, y = 0) {
    const t = performance.now();
    this.history.push({ x, y, t });
    while (this.history.length > 2 && t - this.history[0].t > 100) {
      this.history.shift();
    }
  }

  get() {
    const h = this.history;
    if (h.length < 2) return { x: 0, y: 0 };
    const a = h[0];
    const b = h[h.length - 1];
    if (performance.now() - b.t > 90) return { x: 0, y: 0 };
    const dt = Math.max((b.t - a.t) / 1000, 0.008);
    return {
      x: (b.x - a.x) / dt,
      y: (b.y - a.y) / dt
    };
  }

  reset() {
    this.history = [];
  }
}
