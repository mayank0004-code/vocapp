import React, { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { springs } from '../../motion/springs';
import { haptics } from '../../motion/haptics';

export function StoriesViewer({
  stories = [],
  initialIndex = 0,
  isOpen = false,
  onClose = () => {},
  onAction = () => {}
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setProgress(0);
  }, [initialIndex, isOpen]);

  // Story autoplay timer
  useEffect(() => {
    if (!isOpen || isPaused) return;

    const DURATION_MS = 5000;
    const INTERVAL_MS = 50;
    const step = INTERVAL_MS / DURATION_MS;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 1) {
          // Advance to next story
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((idx) => idx + 1);
            return 0;
          } else {
            onClose();
            return 1;
          }
        }
        return prev + step;
      });
    }, INTERVAL_MS);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(timerRef.current);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isPaused, currentIndex, stories.length, onClose]);

  if (!isOpen || stories.length === 0) return null;

  const currentStory = stories[currentIndex] || stories[0];

  const handleNext = () => {
    haptics.tap();
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    haptics.tap();
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  const handleTap = (e) => {
    const width = e.currentTarget.clientWidth;
    const clickX = e.clientX;
    if (clickX < width * 0.35) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000000',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
        onPointerDown={() => setIsPaused(true)}
        onPointerUp={() => setIsPaused(false)}
        onPointerCancel={() => setIsPaused(false)}
      >
        <m.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={springs.sheet}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120 || info.velocity.y > 600) {
              onClose();
            }
          }}
          onClick={handleTap}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '430px',
            height: '100%',
            maxHeight: '844px',
            background: 'linear-gradient(180deg, #1A1A1E 0%, #101012 100%)',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px',
            touchAction: 'none'
          }}
        >
          {/* Top Segmented Progress Bars */}
          <div style={{ display: 'flex', gap: '4px', height: '3px', marginTop: 'calc(var(--sb) + 8px)' }}>
            {stories.map((_, idx) => {
              let fill = 0;
              if (idx < currentIndex) fill = 1;
              else if (idx === currentIndex) fill = progress;

              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    height: '100%',
                    background: 'rgba(255, 255, 255, 0.25)',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      background: '#FFFFFF',
                      width: `${fill * 100}%`,
                      transition: idx === currentIndex ? 'none' : 'width 0.2s ease'
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Header Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '12px',
              padding: '0 4px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '18px',
                  background: 'var(--card3)',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'var(--serif)',
                  fontSize: '18px',
                  fontStyle: 'italic',
                  fontWeight: 600
                }}
              >
                {currentStory.avatar || currentStory.label[0]}
              </div>
              <div>
                <b style={{ fontSize: '15px', color: '#FFFFFF', display: 'block' }}>{currentStory.label}</b>
                {currentStory.when && (
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{currentStory.when}</span>
                )}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'grid',
                placeItems: 'center',
                color: '#FFFFFF',
                cursor: 'pointer'
              }}
              aria-label="Close story"
            >
              ✕
            </button>
          </div>

          {/* Story Body Content */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '20px 8px'
            }}
          >
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--acc2)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '8px'
              }}
            >
              {currentStory.kind}
            </span>
            <h2
              className="serif"
              style={{
                fontSize: '44px',
                fontWeight: 400,
                margin: '0 0 12px',
                lineHeight: 1.05,
                color: '#FFFFFF'
              }}
            >
              {currentStory.title || currentStory.label}
            </h2>
            {currentStory.definition && (
              <p style={{ fontSize: '18px', lineHeight: 1.45, color: 'var(--fg2)', margin: '0 0 16px' }}>
                {currentStory.definition}
              </p>
            )}
            {currentStory.example && (
              <blockquote
                className="serif"
                style={{
                  margin: '0',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  fontSize: '17px',
                  fontStyle: 'italic',
                  lineHeight: 1.45,
                  color: '#FFFFFF'
                }}
              >
                “{currentStory.example}”
              </blockquote>
            )}
            {currentStory.slip && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentStory.slip.orig && (
                  <>
                    <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>You wrote:</p>
                    <div style={{ color: 'var(--org2)', fontFamily: 'var(--serif)', fontSize: '18px' }}>
                      ✗ {currentStory.slip.orig}
                    </div>
                  </>
                )}
                {currentStory.slip.better && (
                  <>
                    <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>Better version:</p>
                    <div style={{ color: 'var(--acc3)', fontFamily: 'var(--serif)', fontSize: '18px' }}>
                      ✓ {currentStory.slip.better}
                    </div>
                  </>
                )}
                {currentStory.slip.rule && (
                  <p style={{ margin: '12px 0 0', fontSize: '14.5px', lineHeight: 1.45, color: 'var(--fg2)' }}>
                    {currentStory.slip.rule}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Bottom Call to Action Button */}
          <div style={{ paddingBottom: '20px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction(currentStory.actionType, currentStory.data);
                onClose();
              }}
              style={{
                height: '52px',
                width: '100%',
                borderRadius: '14px',
                background: '#FFFFFF',
                color: '#0B0B0D',
                fontWeight: 600,
                fontSize: '17px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              {currentStory.cta || 'Practise now'}
            </button>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}

export default StoriesViewer;
