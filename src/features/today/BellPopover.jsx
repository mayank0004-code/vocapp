import React, { useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Button from '../../ui/Button';

export function BellPopover({
  isOpen = false,
  onClose = () => {},
  expiringWord = null,
  onPractice = () => {}
}) {
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        // Bell button itself handles toggle
        if (e.target.closest('#bellBtn')) return;
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.6, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: -6 }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          className="popover open"
          style={{
            position: 'absolute',
            right: '62px',
            top: 'calc(var(--sb, 44px) + 54px)',
            width: '272px',
            zIndex: 60,
            background: 'rgba(40, 40, 44, 0.94)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            backdropFilter: 'blur(24px) saturate(180%)',
            border: '0.5px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '18px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 18px 50px rgba(0, 0, 0, 0.5)',
            transformOrigin: 'calc(100% - 18px) -6px'
          }}
          role="dialog"
          aria-label="Expiring saved words"
        >
          <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.4, color: 'var(--fg)' }}>
            {expiringWord ? (
              <>
                <em className="serif" style={{ fontSize: '17px', fontStyle: 'italic', fontWeight: 500, color: 'var(--fg)' }}>
                  {expiringWord.word}
                </em>{' '}
                will be removed in {expiringWord.expiresInDays || 2} days unless you practise it.
              </>
            ) : (
              'Nothing is about to expire. You’re all caught up.'
            )}
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: expiringWord ? '1fr 1fr' : '1fr',
              gap: '8px'
            }}
          >
            {expiringWord ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onPractice(expiringWord.word);
                  }}
                >
                  Practise now
                </Button>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Later
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={onClose} style={{ gridColumn: '1/-1' }}>
                OK
              </Button>
            )}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

export default BellPopover;
