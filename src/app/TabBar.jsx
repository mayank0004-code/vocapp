import React, { useRef, useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { springs, project, rubber, VelocityTracker } from '../motion/springs';
import { haptics } from '../motion/haptics';

export const TABS = [
  {
    id: 'today',
    label: 'Today',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9h18" />
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    )
  },
  {
    id: 'practice',
    label: 'Practice',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    )
  },
  {
    id: 'words',
    label: 'Words',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        <path d="M8 7h8" />
        <path d="M8 11h8" />
      </svg>
    )
  },
  {
    id: 'progress',
    label: 'Progress',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    )
  }
];

export function TabBar({
  activeTab = 0,
  onTabChange = () => {},
  isHidden = false
}) {
  const barRef = useRef(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubIndex, setScrubIndex] = useState(activeTab);
  const scrubStateRef = useRef(null);
  const vtRef = useRef(new VelocityTracker());

  useEffect(() => {
    setScrubIndex(activeTab);
  }, [activeTab]);

  const getPositionAt = (clientX) => {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    const tabWidth = (rect.width - 14) / 4;
    return (clientX - rect.left - 7 - tabWidth / 2) / tabWidth;
  };

  const handlePointerDown = (e) => {
    if (e.button > 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}

    vtRef.current.reset();
    vtRef.current.add(e.clientX);
    scrubStateRef.current = {
      startX: e.clientX,
      pointerId: e.pointerId,
      isDragging: false
    };
  };

  const handlePointerMove = (e) => {
    const state = scrubStateRef.current;
    if (!state || e.pointerId !== state.pointerId) return;

    vtRef.current.add(e.clientX);
    const dx = e.clientX - state.startX;

    if (!state.isDragging) {
      if (Math.abs(dx) > 7) {
        state.isDragging = true;
        setIsScrubbing(true);
        haptics.switch();
      } else {
        return;
      }
    }

    const rawPos = getPositionAt(e.clientX);
    let clampedPos = rawPos;
    if (clampedPos < 0) clampedPos = -rubber(-clampedPos, 1, 0.5);
    else if (clampedPos > 3) clampedPos = 3 + rubber(clampedPos - 3, 1, 0.5);

    const targetIdx = Math.min(3, Math.max(0, Math.round(rawPos)));
    if (targetIdx !== scrubIndex) {
      setScrubIndex(targetIdx);
      haptics.switch();
      onTabChange(targetIdx);
    }
  };

  const handlePointerUp = (e) => {
    const state = scrubStateRef.current;
    if (!state) return;
    scrubStateRef.current = null;

    if (state.isDragging) {
      setIsScrubbing(false);
      const velocity = vtRef.current.get().x / 80;
      const projectedIdx = Math.min(3, Math.max(0, Math.round(scrubIndex + project(velocity, 0.99))));
      onTabChange(projectedIdx);
      setScrubIndex(projectedIdx);
    } else {
      const idx = Math.min(3, Math.max(0, Math.round(getPositionAt(e.clientX))));
      onTabChange(idx);
      setScrubIndex(idx);
      haptics.tap();
    }
  };

  const activeIdx = isScrubbing ? scrubIndex : activeTab;

  return (
    <m.nav
      ref={barRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      animate={{
        y: isHidden ? 130 : 0,
        boxShadow: isScrubbing
          ? '0 16px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(124,136,255,0.25)'
          : '0 12px 34px rgba(0,0,0,0.45)'
      }}
      transition={springs.indicator}
      style={{
        position: 'fixed',
        left: '14px',
        right: '14px',
        bottom: '22px',
        maxWidth: '430px',
        margin: '0 auto',
        height: '64px',
        padding: '7px',
        borderRadius: '26px',
        zIndex: 30,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        background: 'rgba(30, 30, 34, 0.72)',
        backdropFilter: 'blur(26px) saturate(180%)',
        WebkitBackdropFilter: 'blur(26px) saturate(180%)',
        border: '0.5px solid rgba(255, 255, 255, 0.09)',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)'
      }}
      role="tablist"
      aria-label="Main navigation"
    >
      {/* Gliding Indicator Pill */}
      <m.div
        animate={{
          left: `calc(7px + ${activeIdx} * ((100% - 14px) / 4))`,
          scaleX: isScrubbing ? 1.05 : 1,
          scaleY: isScrubbing ? 1.12 : 1
        }}
        transition={springs.indicator}
        style={{
          position: 'absolute',
          top: '7px',
          bottom: '7px',
          width: 'calc((100% - 14px) / 4)',
          borderRadius: '19px',
          background: isScrubbing ? 'rgba(124, 136, 255, 0.3)' : 'rgba(124, 136, 255, 0.17)',
          pointerEvents: 'none'
        }}
        aria-hidden="true"
      />

      {TABS.map((tab, idx) => {
        const isActive = idx === activeIdx;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-label={tab.label}
            onClick={(e) => {
              e.stopPropagation();
              onTabChange(idx);
              haptics.tap();
            }}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              fontSize: '11px',
              fontWeight: 500,
              color: isActive ? 'var(--acc2)' : 'var(--mute)',
              transition: 'color 0.2s ease',
              zIndex: 1
            }}
          >
            <div
              style={{
                transform: isActive ? 'translateY(-1px) scale(1.08)' : 'none',
                transition: 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)'
              }}
            >
              {tab.icon}
            </div>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </m.nav>
  );
}

export default TabBar;
