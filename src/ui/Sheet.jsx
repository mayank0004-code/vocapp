import React, { useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { springs } from '../motion/springs';

export function Sheet({
  isOpen = false,
  onClose = () => {},
  children,
  title = null
}) {
  const constraintsRef = useRef(null);

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

          {/* Draggable Bottom Sheet */}
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
              left: 0,
              right: 0,
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
                overflowY: 'auto',
                padding: '0 16px 36px',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none'
              }}
            >
              {children}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default Sheet;
