import React, { useRef, useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { springs, rubber } from '../motion/springs';
import { haptics } from '../motion/haptics';

export function SwipeTabs({
  tabs = [], // [{ id, label, count }]
  activeIndex = 0,
  onChange = () => {},
  children // Array of tab pane elements
}) {
  const [currentIndex, setCurrentIndex] = useState(activeIndex);
  const containerRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    setCurrentIndex(activeIndex);
  }, [activeIndex]);

  const handleTabClick = (index) => {
    if (index === currentIndex) return;
    haptics.switch();
    setCurrentIndex(index);
    onChange(index);
  };

  const panes = React.Children.toArray(children);

  return (
    <div style={{ width: '100%', overflow: 'hidden' }} ref={containerRef}>
      {/* Sticky Segmented Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 4,
          background: 'rgba(11, 11, 13, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '0.5px solid var(--line)'
        }}
        role="tablist"
      >
        <div style={{ position: 'relative', display: 'flex' }}>
          {tabs.map((tab, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={tab.id || idx}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabClick(idx)}
                style={{
                  flex: 1,
                  height: '46px',
                  fontSize: '14.5px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  color: isActive ? 'var(--fg)' : 'var(--mute)',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'color 0.2s ease'
                }}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <i
                    style={{
                      fontStyle: 'normal',
                      fontSize: '11.5px',
                      color: 'var(--mute)',
                      background: 'var(--card2)',
                      padding: '2px 7px',
                      borderRadius: '9px',
                      fontWeight: 600
                    }}
                  >
                    {tab.count}
                  </i>
                )}
              </button>
            );
          })}

          {/* Sliding Underline Indicator */}
          <m.span
            animate={{
              left: `${(currentIndex / tabs.length) * 100}%`,
              width: `${100 / tabs.length}%`
            }}
            transition={springs.content}
            style={{
              position: 'absolute',
              bottom: '-0.5px',
              height: '2.5px',
              borderRadius: '2px',
              background: 'var(--fg)'
            }}
          />
        </div>
      </div>

      {/* Horizontal Pager Panes */}
      <div style={{ overflow: 'hidden' }}>
        <m.div
          ref={trackRef}
          animate={{ x: `-${currentIndex * 100}%` }}
          transition={springs.content}
          style={{
            display: 'flex',
            width: `${panes.length * 100}%`,
            willChange: 'transform'
          }}
        >
          {panes.map((child, idx) => (
            <div
              key={idx}
              style={{
                width: `${100 / panes.length}%`,
                flexShrink: 0,
                minWidth: 0
              }}
            >
              {child}
            </div>
          ))}
        </m.div>
      </div>
    </div>
  );
}

export default SwipeTabs;
