import React, { useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { springs } from '../motion/springs';
import { useLayout } from '../motion/useLayout';

export function Sheet({
  isOpen = false,
  onClose = () => {},
  children,
  title = null
}) {
  const { isLaptop, isTablet } = useLayout();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Scrim */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: '#000000',
              zIndex: 40,
              WebkitTapHighlightColor: 'transparent'
            }}
          />

          {/* Dialog on Laptop, Bottom Sheet on Phone / Tablet */}
          {isLaptop ? (
            <m.div
              initial={{ opacity: 0, scale: 0.96, y: '-48%' }}
              animate={{ opacity: 1, scale: 1, y: '-50%' }}
              exit={{ opacity: 0, scale: 0.96, y: '-48%' }}
              transition={springs.dialog || { duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              style={{
                position: 'fixed',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '90%',
                maxWidth: '560px',
                maxHeight: '85vh',
                background: '#141416',
                borderRadius: '24px',
                border: '1px solid var(--line)',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
                zIndex: 45,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              {title && (
                <div
                  style={{
                    padding: '20px 24px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--line)'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '18px', color: 'var(--fg)' }}>
                    {title}
                  </div>
                  <button
                    onClick={onClose}
                    style={{
                      color: 'var(--mute)',
                      fontSize: '13px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: 'var(--card2)',
                      cursor: 'pointer'
                    }}
                  >
                    Esc
                  </button>
                </div>
              )}
              <div
                style={{
                  padding: '20px 24px 28px',
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  flex: 1
                }}
              >
                {children}
              </div>
            </m.div>
          ) : (
            <m.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={springs.sheet}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 140 || info.velocity.y > 500) {
                  onClose();
                }
              }}
              style={{
                position: 'fixed',
                left: isTablet ? 'calc(50% - 300px)' : 0,
                right: isTablet ? 'auto' : 0,
                width: isTablet ? '600px' : '100%',
                bottom: 0,
                maxHeight: '92vh',
                background: '#141416',
                borderRadius: '30px 30px 0 0',
                borderTop: '0.5px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5)',
                zIndex: 45,
                display: 'flex',
                flexDirection: 'column',
                touchAction: 'none'
              }}
            >
              {/* Grab Handle Header */}
              <div
                style={{
                  padding: '12px 20px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'grab',
                  userSelect: 'none',
                  WebkitUserSelect: 'none'
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '5px',
                    borderRadius: '3px',
                    background: '#48484D',
                    marginBottom: title ? '12px' : '4px'
                  }}
                />
                {title && (
                  <div style={{ width: '100%', textAlign: 'left', fontWeight: 600, fontSize: '18px' }}>
                    {title}
                  </div>
                )}
              </div>

              {/* Scrollable Body */}
              <div
                style={{
                  padding: '12px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  flex: 1
                }}
              >
                {children}
              </div>
            </m.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}

export default Sheet;
