import { useRef, useEffect } from 'react';
import { VelocityTracker, project } from './springs';

export function useEdgeBack({ onPop, enabled = true }) {
  const targetRef = useRef(null);
  const gestureStateRef = useRef(null);
  const vtRef = useRef(new VelocityTracker());

  useEffect(() => {
    const el = targetRef.current;
    if (!el || !enabled) return;

    const handlePointerDown = (e) => {
      if (e.button > 0) return;
      const rect = el.getBoundingClientRect();
      // Only initiate if gesture starts within 28px of left edge
      if (e.clientX - rect.left > 28) return;

      vtRef.current.reset();
      vtRef.current.add(e.clientX, e.clientY);

      gestureStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        pointerId: e.pointerId,
        isDragging: false
      };
    };

    const handlePointerMove = (e) => {
      const state = gestureStateRef.current;
      if (!state || e.pointerId !== state.pointerId) return;

      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;

      if (!state.isDragging) {
        if (dx > 8 && dx > Math.abs(dy)) {
          state.isDragging = true;
          try {
            el.setPointerCapture(e.pointerId);
          } catch (_) {}
        } else if (Math.abs(dy) > 8) {
          gestureStateRef.current = null;
          return;
        }
      }

      if (state.isDragging) {
        vtRef.current.add(e.clientX, e.clientY);
        const progress = Math.max(0, dx);
        el.style.transform = `translate3d(${progress}px, 0, 0)`;
      }
    };

    const handlePointerUp = (e) => {
      const state = gestureStateRef.current;
      if (!state) return;
      gestureStateRef.current = null;

      if (!state.isDragging) return;

      const dx = e.clientX - state.startX;
      const velocity = vtRef.current.get().x;
      const projected = dx + project(velocity, 0.99);
      const width = el.clientWidth || 390;

      if (projected > width * 0.4 || velocity > 600) {
        // Pop the screen
        el.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
        el.style.transform = `translate3d(${width}px, 0, 0)`;
        setTimeout(() => {
          onPop && onPop();
        }, 220);
      } else {
        // Return to 0
        el.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
        el.style.transform = 'translate3d(0, 0, 0)';
        setTimeout(() => {
          if (el) el.style.transition = '';
        }, 300);
      }
    };

    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerup', handlePointerUp);
    el.addEventListener('pointercancel', handlePointerUp);

    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerup', handlePointerUp);
      el.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [onPop, enabled]);

  return targetRef;
}

export default useEdgeBack;
